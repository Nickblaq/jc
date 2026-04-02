
import { NextRequest, NextResponse } from 'next/server'
import { getClient, getBestThumb } from '@/lib/innertube'
import { ShortItem } from '@/types'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const channelId = req.nextUrl.searchParams.get('id')?.trim()
  console.log(channelId)
  if (!channelId) {
    return NextResponse.json({ error: 'Missing channel id' }, { status: 400 })
  }

  try {
    const yt = await getClient()

    // Resolve name/@handle to channel ID if needed
    let resolvedId = channelId
    if (!channelId.startsWith('UC')) {
      const results = await yt.search(channelId, { type: 'channel' })
      const first   = results.results?.find((r: any) => r.type === 'Channel') as any
      if (!first) return NextResponse.json({ error: `Channel not found: ${channelId}` }, { status: 404 })
      resolvedId = first.id ?? first.endpoint?.payload?.browseId
    }

    const channel = await yt.getChannel(resolvedId)

    // getShorts() returns the dedicated Shorts tab on the channel page
    let shortsTab: any = null
    try {
      shortsTab = await channel.getShorts()
    } catch {
      return NextResponse.json({ error: 'This channel has no Shorts tab' }, { status: 404 })
    }
    const rawVideos: any[] = []

    if (shortTab) {
      try {
        const sorted = await (shortsTab as any).applyFilter?.('Popular')
        if (sorted) {
          sorted.videos?.forEach((v: any) => rawVideos.push(v))
        }
      } catch {
        
      }
      
      // If filter didn't work or gave nothing, use default order
      if (rawVideos.length === 0) {
        (videosTab as any).videos?.forEach((v: any) => rawVideos.push(v))
      }
    }
    

    const shorts: ShortItem[] = rawShorts
      .slice(0, 5)
      .map((v: any) => ({
        id:        v.id ?? v.video_id ?? '',
        title:     v.title?.toString() ?? 'Untitled',
        thumbnail: getBestThumb(v.thumbnails ?? v.thumbnail),
        views:     v.view_count?.toString() ?? v.short_view_count?.toString() ?? '',
        duration:  v.duration?.toString() ?? '',
        url:       `https://www.youtube.com/shorts/${v.id ?? v.video_id}`,
      }))
      .filter(s => s.id)

    return NextResponse.json({ channelId: resolvedId, shorts })
  } catch (err: any) {
    console.error('[shorts]', err.message)
    return NextResponse.json({ error: err.message ?? 'Failed to fetch Shorts' }, { status: 500 })
  }
}
