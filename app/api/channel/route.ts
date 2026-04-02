import { NextRequest, NextResponse } from 'next/server'
import { Innertube, UniversalCache } from 'youtubei.js'
import { ChannelResult, VideoItem } from '@/types'

// Singleton — reuse the session across requests (avoids re-initialising on every call)
let _yt: Innertube | null = null

async function getYT(): Promise<Innertube> {
  if (!_yt) {
    _yt = await Innertube.create({
      cache: new UniversalCache(false), // in-memory cache
      generate_session_locally: true,   // faster init, no network hit
    })
  }
  return _yt
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parseViewCount(text: string | undefined): number {
  if (!text) return 0
  const clean = text.replace(/[^0-9.KMB]/gi, '')
  const num = parseFloat(clean)
  if (text.toUpperCase().includes('B')) return Math.round(num * 1_000_000_000)
  if (text.toUpperCase().includes('M')) return Math.round(num * 1_000_000)
  if (text.toUpperCase().includes('K')) return Math.round(num * 1_000)
  return Math.round(num)
}

function formatViewCount(raw: number): string {
  if (raw >= 1_000_000_000) return `${(raw / 1_000_000_000).toFixed(1)}B`
  if (raw >= 1_000_000) return `${(raw / 1_000_000).toFixed(1)}M`
  if (raw >= 1_000) return `${(raw / 1_000).toFixed(1)}K`
  return raw.toLocaleString()
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const input = req.nextUrl.searchParams.get('q')?.trim()
console.log(input)
  if (!input) {
    return NextResponse.json({ error: 'Missing query parameter: q' }, { status: 400 })
  }

  try {
    const yt = await getYT()

    // ── Step 1: Resolve channel ID ──────────────────────────────────────────
    // Input can be: channel ID (UCxxxxx), handle (@handle), or channel name
    let channelId = input

    // If it's not already a channel ID, search for it
    if (!input.startsWith('UC')) {
      const query = input.startsWith('@') ? input : input
      const searchResults = await yt.search(query, { type: 'channel' })

      const firstChannel = searchResults.results?.find(
        (r) => r.type === 'Channel' || r.type === 'ChannelRenderer'
      ) as any

      if (!firstChannel) {
        return NextResponse.json(
          { error: `No channel found for "${input}"` },
          { status: 404 }
        )
      }

      channelId =
        firstChannel.id ||
        firstChannel.channel_id ||
        firstChannel.endpoint?.payload?.browseId

      if (!channelId) {
        return NextResponse.json(
          { error: 'Could not resolve channel ID from search result' },
          { status: 404 }
        )
      }
    }

    // ── Step 2: Fetch channel ───────────────────────────────────────────────
    const channel = await yt.getChannel(channelId)

    // ── Step 3: Get channel metadata ────────────────────────────────────────
    const metadata = channel.metadata as any
    const header = channel.header as any

    const channelName =
      metadata?.title ||
      header?.title?.toString() ||
      header?.author ||
      'Unknown Channel'

    const channelHandle =
      metadata?.vanity_url ||
      header?.channel_handle_text?.toString() ||
      `@${channelName.toLowerCase().replace(/\s+/g, '')}`

    const subscriberCount =
      header?.subscribers?.toString() ||
      header?.subscriber_count_text?.toString() ||
      'N/A'

    const channelThumbnail =
      metadata?.thumbnail?.[0]?.url ||
      header?.avatar?.[0]?.url ||
      header?.thumbnail?.[0]?.url ||
      ''

    const channelBanner =
      header?.banner?.[0]?.url ||
      header?.tv_banner?.[0]?.url ||
      ''

    // ── Step 4: Get videos tab sorted by popular ─────────────────────────────
    // getVideoTab() returns the Videos tab — we then sort by popularity
    let videosTab
    try {
      videosTab = await channel.getVideos()
    } catch {
      // Some channels use different tab structures
      videosTab = null
    }

    const rawVideos: any[] = []

    if (videosTab) {
      // Try to get "Popular" sorted view
      try {
        const sorted = await (videosTab as any).applyFilter?.('Popular')
        if (sorted) {
          sorted.videos?.forEach((v: any) => rawVideos.push(v))
        }
      } catch {
        // Fallback: use whatever order comes back
      }

      // If filter didn't work or gave nothing, use default order
      if (rawVideos.length === 0) {
        (videosTab as any).videos?.forEach((v: any) => rawVideos.push(v))
      }
    }

    // ── Step 5: Map to clean VideoItem objects ───────────────────────────────
    const videos: VideoItem[] = rawVideos
      .slice(0, 10) // grab top 10 then sort
      .map((v: any) => {
        const viewText =
          v.view_count?.toString() ||
          v.short_view_count?.toString() ||
          v.views?.toString() ||
          '0 views'

        const rawCount = parseViewCount(viewText)

        const thumbs: any[] =
          v.thumbnails ||
          v.thumbnail ||
          []

        const thumbnail =
          (Array.isArray(thumbs) ? thumbs : [thumbs])
            .filter(Boolean)
            .sort((a: any, b: any) => (b.width || 0) - (a.width || 0))[0]?.url || ''

        return {
          id: v.id || v.video_id || '',
          title: v.title?.toString() || 'Untitled',
          viewCount: viewText.replace(' views', '').replace(' view', ''),
          viewCountRaw: rawCount,
          publishedTime: v.published?.toString() || v.published_time_text?.toString() || '',
          duration: v.duration?.toString() || v.length_text?.toString() || '',
          thumbnail,
          url: `https://www.youtube.com/watch?v=${v.id || v.video_id}`,
        }
      })
      .filter((v) => v.id) // remove items with no ID
      .sort((a, b) => b.viewCountRaw - a.viewCountRaw) // sort by actual view count
      .slice(0, 5) // top 5

    const result: ChannelResult = {
      channelId,
      channelName,
      channelHandle,
      subscriberCount,
      channelThumbnail,
      channelBanner,
      videos,
    }

    return NextResponse.json(result)
  } catch (err: any) {
    console.error('[channel route error]', err)

    // Reset session on error so next request gets a fresh one
    _yt = null

    return NextResponse.json(
      { error: err?.message || 'Failed to fetch channel data' },
      { status: 500 }
    )
  }
}
