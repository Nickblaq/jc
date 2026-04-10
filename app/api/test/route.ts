
import { NextResponse } from 'next/server'
import { Innertube, UniversalCache } from 'youtubei.js'

export async function GET() {
  // Fetch static file from your own server
  const res = await fetch('https://jc-ashy-kappa.vercel.app/ppg.mp4')

  if (!res.ok || !res.body) {
    return NextResponse.json({ error: 'Failed to load test video' }, { status: 500 })
  }

  return new NextResponse(res.body, {
    headers: {
      'Content-Type': 'video/mp4',
      'Content-Length': res.headers.get('content-length') || '',
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'no-store',
    },
  })
}
