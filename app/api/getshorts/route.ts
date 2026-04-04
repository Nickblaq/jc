import { NextRequest, NextResponse } from 'next/server'
import { Innertube, UniversalCache } from 'youtubei.js'
import { getBestThumb } from '@/lib/innertube'
import { ShortItem, ShortResult } from '@/types'

export const runtime = 'nodejs'

// Singleton session
let _yt: Innertube | null = null

async function getYT(): Promise<Innertube> {
  if (!_yt) {
    _yt = await Innertube.create({
      cache: new UniversalCache(false),
      generate_session_locally: true,
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



export async function GET(req: NextRequest) {
  const input = req.nextUrl.searchParams.get('q')?.trim()

  if (!input) {
    return NextResponse.json({ error: 'Missing channel id' }, { status: 400 })
  }

  try {
    const yt = await getYT()

    // ── Step 1: Resolve channel ID ─────────────────────────────
    let resolvedId = input

    if (!input.startsWith('UC')) {
      const results = await yt.search(input, { type: 'channel' })

      const first = results.results?.find(
        (r: any) => r.type === 'Channel' || r.type === 'ChannelRenderer'
      ) as any

      if (!first) {
        return NextResponse.json(
          { error: `Channel not found: ${input}` },
          { status: 404 }
        )
      }

      resolvedId =
        first.id ||
        first.channel_id ||
        first.endpoint?.payload?.browseId
    }

    if (!resolvedId) {
      return NextResponse.json(
        { error: 'Could not resolve channel ID from search result' },
        { status: 404 }
      )
    }

    // ── Step 2: Fetch channel ─────────────────────────────
    const channel = await yt.getChannel(resolvedId)

    // ── Step 3: Metadata extraction ───────────────────────
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

    // ── Step 4: Shorts ────────────────────────────────────
    let shortsTab

    try {
      shortsTab = await channel.getShorts()
    } catch {
      shortsTab = null
    }

    const rawShorts: any[] = []

    if (shortsTab) {
      // Try to get "Popular" sorted view
      try {
        const sorted = await (shortsTab as any).applyFilter?.('Popular')
        if (sorted) {
          sorted.videos?.forEach((v: any) => rawShorts.push(v))
        }
      } catch {
        // Fallback: use whatever order comes back
      }

      // If filter didn't work or gave nothing, use default order
      if (rawShorts.length === 0) {
        (shortsTab as any).videos?.forEach((v: any) => rawShorts.push(v))
      }
    }


   // ── Step 5: Map to clean VideoItem objects ───────────────────────────────
    const videos: ShortItem[] = rawShorts
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
          views: viewText.replace(' views', '').replace(' view', 'N/A'),
          viewRaw: rawCount,
          duration: v.duration?.toString() || v.length_text?.toString() || '',
          thumbnail,
          url: `https://www.youtube.com/shorts/${v.id ?? v.video_id}`,
        }
      })
      .filter((v) => v.id) // remove items with no ID
      .sort((a, b) => b.viewRaw - a.viewRaw) // sort by actual view count
      .slice(0, 5) // top 5

    const result: ShortResult = {
      channelId: resolvedId,
      channelName,
      channelHandle,
      subscriberCount,
      channelThumbnail,
      channelBanner,
      shorts: videos,
    }


    return NextResponse.json({message: 'got shorts', data: result})
  } catch (err: any) {
    console.error('[shorts]', err.message)

    _yt = null

    return NextResponse.json(
      { error: err.message ?? 'Failed to fetch Shorts' },
      { status: 500 }
    )
  }
}
