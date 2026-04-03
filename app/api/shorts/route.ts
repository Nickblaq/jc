import { NextRequest, NextResponse } from 'next/server'
import { Innertube } from 'youtubei.js'
import { ShortItem } from '@/types'

export const runtime = 'nodejs'

// Fresh client per request — avoids stale session causing 400s on InnerTube
async function makeClient() {
  return Innertube.create({ generate_session_locally: true })
}

function getBestThumb(thumbs: unknown): string {
  if (!thumbs) return ''
  const arr = Array.isArray(thumbs) ? thumbs : [thumbs]
  return (arr as any[])
    .filter(Boolean)
    .sort((a: any, b: any) => (b?.width ?? 0) - (a?.width ?? 0))[0]?.url ?? ''
}

// Parse duration string like "0:45" or "1:02" into seconds
function parseDurationSecs(dur: string): number {
  if (!dur) return Infinity
  const parts = dur.split(':').map(Number)
  if (parts.length === 2) return parts[0] * 60 + parts[1]
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2]
  return Infinity
}

// Extract videos from an InnerTube tab response — probes all known property paths
function extractVideos(tab: any): any[] {
  if (!tab) return []

  // Direct .videos property (most common for channel tabs)
  if (Array.isArray(tab.videos) && tab.videos.length > 0) return tab.videos

  // Feed .items property
  if (Array.isArray(tab.items) && tab.items.length > 0) return tab.items

  // Nested in page.contents (RichGrid layout)
  const contents = tab.page?.contents
  if (Array.isArray(contents) && contents.length > 0) return contents

  // Nested via current_tab → content → contents
  const tabContent = tab.current_tab?.content?.contents
  if (Array.isArray(tabContent) && tabContent.length > 0) return tabContent

  // Some versions expose it through a header + content structure
  const richGrid = tab.page?.on_response_received_actions
  if (Array.isArray(richGrid)) {
    for (const action of richGrid) {
      const items = action?.append_continuation_items_action?.continuation_items
        ?? action?.continuation_items
      if (Array.isArray(items) && items.length > 0) return items
    }
  }

  return []
}

function mapVideo(v: any): ShortItem | null {
  const id = v.id ?? v.video_id ?? v.videoId ?? ''
  if (!id) return null
  return {
    id,
    title:     v.title?.toString() ?? 'Untitled',
    thumbnail: getBestThumb(v.thumbnails ?? v.thumbnail),
    views:     v.view_count?.toString() ?? v.short_view_count?.toString() ?? '',
    duration:  v.duration?.toString() ?? '',
    url:       `https://www.youtube.com/shorts/${id}`,
  }
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('id')?.trim()
  if (!q) {
    return NextResponse.json({ error: 'Missing ?channel= param' }, { status: 400 })
  }

  try {
    const yt = await makeClient()

    // ── Step 1: Resolve name/@handle → channel ID ─────────────────────────
    let channelId = q
    if (!q.startsWith('UC')) {
      const searchResults = await yt.search(q, { type: 'channel' })
      const first = (searchResults.results ?? []).find((r: any) =>
        r.type === 'Channel' || r.type === 'ChannelRenderer'
      ) as any

      if (!first) {
        return NextResponse.json({ error: `No channel found for "${q}"` }, { status: 404 })
      }

      channelId = first.id
        ?? first.channel_id
        ?? first.endpoint?.payload?.browseId
        ?? ''

      if (!channelId) {
        return NextResponse.json({ error: 'Could not resolve channel ID from search' }, { status: 404 })
      }
    }

    // ── Step 2: Load the channel ──────────────────────────────────────────
    const channel = await yt.getChannel(channelId)

    // ── Step 3: Try getShorts() first ─────────────────────────────────────
    let shorts: ShortItem[] = []

    try {
      const shortsTab = await channel.getShorts()
      const raw = extractVideos(shortsTab)

      shorts = raw
        .slice(0, 5)
        .map(mapVideo)
        .filter((s): s is ShortItem => s !== null && s.id !== '')
    } catch (shortsErr: any) {
      console.warn('[shorts] getShorts() failed:', shortsErr?.message)
      // Fall through to fallback below
    }

    // ── Step 4: Fallback — get channel videos, filter by duration ≤ 60s ──
    // YouTube Shorts are defined as vertical videos ≤ 60 seconds.
    // If getShorts() returned nothing or failed, we get the channel's
    // general videos list and filter by parsed duration.
    if (shorts.length === 0) {
      try {
        const videosTab = await channel.getVideos()
        const raw = extractVideos(videosTab)

        shorts = raw
          .map(mapVideo)
          .filter((s): s is ShortItem => s !== null && s.id !== '')
          .filter(s => parseDurationSecs(s.duration) <= 60) // Shorts = ≤ 60s
          .slice(0, 5)
      } catch (videosErr: any) {
        console.warn('[shorts] getVideos() fallback failed:', videosErr?.message)
      }
    }

    // ── Step 5: If still nothing, return clear error ──────────────────────
    if (shorts.length === 0) {
      return NextResponse.json(
        {
          error: 'No Shorts found for this channel. The channel may not have Shorts, or the tab is not accessible without authentication.',
          channelId,
          shorts: [],
        },
        { status: 404 }
      )
    }

    return NextResponse.json({ channelId, shorts })

  } catch (err: any) {
    console.error('[shorts route]', err?.message ?? err)
    return NextResponse.json(
      { error: err?.message ?? 'Failed to fetch Shorts' },
      { status: 500 }
    )
