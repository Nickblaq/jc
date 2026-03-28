

import { NextRequest } from 'next/server'
import { Innertube, UniversalCache, Utils } from 'youtubei.js'
import { existsSync, mkdirSync, createWriteStream } from 'fs';

export const runtime = 'nodejs'
export const maxDuration = 300 // 5 min — enough for large videos

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

// ─── Format options ───────────────────────────────────────────────────────────
// type: 'videoandaudio' | 'video' | 'audio'
// quality: 'best' | 'bestefficiency' | '1080p' | '720p' | '480p' | '360p'

export async function GET(req: NextRequest) {
  const videoId = req.nextUrl.searchParams.get('id')?.trim()
  const type    = (req.nextUrl.searchParams.get('type') || 'video+audio') as 'video+audio' | 'video' | 'audio'
  const quality = req.nextUrl.searchParams.get('quality') || 'best'

  if (!videoId) {
    return new Response(JSON.stringify({ error: 'Missing video ID' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    const yt = await getYT()

    // ── Get video info + pick format ─────────────────────────────────────────
    const info = await yt.getBasicInfo(videoId, { client: 'TV' })

    const basicInfo = info.basic_info
    const safeTitle = (basicInfo?.title || videoId)
      .replace(/[^\w\s\-().]/g, '')  // strip special chars for filename
      .replace(/\s+/g, '_')
      .slice(0, 80)

    if (!videoId) {
      console.log("API ERROR: Video Id not found")
    }
    // chooseFormat picks the best match — falls back gracefully if exact quality unavailable
    const downstream = await yt.download(videoId as string, {
      type: 'video+audio', // audio, video or video+audio
      quality: 'best', // best, bestefficiency, 144p, 240p, 480p, 720p and so on.
      format: 'mp4', // media container format,
      client: 'ANDROID'
    });

    console.info(`Downloading stream:  ${downstream} (${videoId})`);



    // Pipe the ReadableStream straight to the client response
    return new Response({downstream})

  } catch (err: any) {
    console.error('[download route error]', err)
    _yt = null

    return new Response(
      JSON.stringify({ error: err?.message || 'Download failed' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
