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
      return NextResponse.json(
        { error: 'This channel has no Shorts tab' },
        { status: 404 }
      )
    }

    const rawShorts = shortsTab?.videos || []

    const shorts: ShortItem[] = rawShorts
      .slice(0, 5)
      .map((v: any) => ({
        id: v.id ?? v.video_id,
        title: v.title?.toString() || v.title?.text || 'Untitled',
        thumbnail: getBestThumb(v.thumbnails ?? v.thumbnail),
        views: v.view_count?.toString() || v.view_count?.text || '',
        duration: v.duration?.toString() || v.duration?.text || '',
        url: `https://www.youtube.com/shorts/${v.id ?? v.video_id}`,
      }))
      .filter((v: ShortItem) => v.id)

    const result: ShortResult = {
      channelId: resolvedId,
      channelName,
      channelHandle,
      subscriberCount,
      channelThumbnail,
      channelBanner,
      shorts,
    }

    return NextResponse.json(result)
  } catch (err: any) {
    console.error('[shorts]', err.message)

    _yt = null

    return NextResponse.json(
      { error: err.message ?? 'Failed to fetch Shorts' },
      { status: 500 }
    )
  }
}
