
import { NextResponse } from 'next/server'
import { Innertube, UniversalCache } from 'youtubei.js'

export const runtime = 'nodejs'
export const maxDuration = 300

// Singleton
let _yt: Innertube | null = null

async function getYT(): Promise<Innertube> {
  if (!_yt) {
    _yt = await Innertube.create({
     // client_type: "ANDROID" as any,
      cache: new UniversalCache(false),
      generate_session_locally: true,
    })
  }
  return _yt
}

export async function GET() {
  // Fetch static file from your own server
  // dQw4w9WgXcQ
  const videoId = ''
 // const res = await fetch('https://jc-ashy-kappa.vercel.app/ppg.mp4')

  if (!videoId) {
    return NextResponse.json({ error: 'Invalid Id' }, { status: 500 })
  }

  try {
    const yt = await getYT()
    const streams = await yt.download(videoId, {itag:18})
    return new NextResponse(streams, {
    headers: {
      'Content-Type': 'video/mp4',
      //'Content-Length': streams.headers.get('content-length') || '',
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'no-store',
    },
  })
  } catch(error: any) {
     console.error('[download route error]', error)

    _yt = null

    return NextResponse.json(
      { error: error?.message || 'Failed to download video' },
      { status: 500 }
    )
  }

  
}
