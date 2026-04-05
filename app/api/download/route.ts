import { NextRequest, NextResponse } from 'next/server'
import { Innertube, UniversalCache } from 'youtubei.js'

export const runtime = 'nodejs'
export const maxDuration = 300

// Singleton
let _yt: Innertube | null = null

async function getYT(): Promise<Innertube> {
  if (!_yt) {
    _yt = await Innertube.create({
     client_type: "ANDROID" as any,
      cache: new UniversalCache(false),
      generate_session_locally: true,
    })
  }
  return _yt
}

export async function GET(request: NextRequest) {
  try {
    const videoId = ''
    if (!videoId ) {
      return NextResponse.json({ error: 'Video ID is required' }, { status: 400 })
    }

    // if (!/^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
   //   return NextResponse.json({ error: 'Invalid video ID format' }, { status: 400 })
   // }

    const yt = await getYT()

    const stream = await yt.download(videoId as string, {
      quality: '360p',          // safe muxed stream
      type: 'video+audio',
       format: 'mp4',
      codec: 'avc'              // iPhone-safe
    })

    if (!stream) {
      throw new Error('Failed to get download stream')
    }

    return new NextResponse(stream, {
      headers: {
        'Content-Disposition': `attachment; filename="${videoId}.mp4"`,
        'Content-Type': 'video/mp4',
        'Cache-Control': 'no-store',
      },
    })

  } catch (error: any) {
    console.error('[download route error]', error)

    _yt = null

    return NextResponse.json(
      { error: error?.message || 'Failed to download video' },
      { status: 500 }
    )
  }
}
// Helper: Convert Web ReadableStream to Node.js 
