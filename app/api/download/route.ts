
import { NextRequest } from 'next/server'
import { Innertube, UniversalCache } from 'youtubei.js'
import type { DownloadOptions } from 'youtubei.js'

export const runtime = 'nodejs'
export const maxDuration = 300

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

function errorResponse(message: string, status = 500) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

export async function GET(req: NextRequest) {
  const videoId = req.nextUrl.searchParams.get('id')?.trim()
  const quality = (req.nextUrl.searchParams.get('quality') ?? 'best') as DownloadOptions['quality']
  const type    = (req.nextUrl.searchParams.get('type')    ?? 'video+audio') as DownloadOptions['type']

  if (!videoId) return errorResponse('Missing video ID', 400)

  try {
    const yt = await getYT()

    // ── Step 1: Get full video info ─────────────────────────────────────────
    // getInfo() fetches both player response + watch-next — needed for cpn
    // which FormatUtils.download() uses internally
    const info = await yt.getInfo(videoId)

    // ── Step 2: Check playability ───────────────────────────────────────────
    const status = info.playability_status?.status
    if (status === 'UNPLAYABLE') return errorResponse('This video is unplayable', 403)
    if (status === 'LOGIN_REQUIRED') return errorResponse('This video requires login', 403)
    if (status === 'ERROR') return errorResponse('This video is unavailable', 404)

    // ── Step 3: Build download options ─────────────────────────────────────
    // These map directly to FormatUtils.download() → chooseFormat() options:
    //   type:    'video+audio' | 'video' | 'audio'
    //   quality: 'best' | 'bestefficiency' | '144p' | '360p' | '720p' | '1080p' etc.
    //   format:  'mp4' | 'webm' | 'any'
    const downloadOptions: DownloadOptions = {
      type,
      quality,
      format: 'mp4',
    }

    // ── Step 4: Call info.download() ───────────────────────────────────────
    // This is the correct high-level API:
    //   - Internally calls FormatUtils.download()
    //   - Handles format selection via chooseFormat()
    //   - Handles URL deciphering
    //   - For video+audio: single fetch → returns response.body directly
    //   - For video/audio only: chunked 10MB downloads via &range= param
    //     (avoids YouTube throttling on adaptive streams)
    //   - Returns ReadableStream<Uint8Array> ready to pipe
    const stream = await info.download(downloadOptions)

    // ── Step 5: Build filename ──────────────────────────────────────────────
    const title = info.basic_info?.title ?? videoId
    const safeTitle = title
      .replace(/[^a-zA-Z0-9\s\-_.()]/g, '')
      .replace(/\s+/g, '_')
      .slice(0, 100)

    const ext      = type === 'audio' ? 'm4a' : 'mp4'
    const mime     = type === 'audio' ? 'audio/mp4' : 'video/mp4'
    const filename = `${safeTitle}.${ext}`

    // ── Step 6: Stream directly to client ──────────────────────────────────
    // The ReadableStream<Uint8Array> from info.download() is spec-compliant
    // and can be passed directly as the Response body — no buffering needed
    return new Response(stream as unknown as ReadableStream, {
      headers: {
        'Content-Type':        mime,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control':       'no-store',
        'X-Video-Title':       title,
        'X-Video-Id':          videoId,
      },
    })

  } catch (err: any) {
    console.error('[download error]', err?.message ?? err)
    _yt = null

    // Surface specific youtubei.js errors clearly
    const msg: string = err?.message ?? 'Download failed'
    if (msg.includes('UNPLAYABLE'))    return errorResponse('Video is unplayable', 403)
    if (msg.includes('LOGIN_REQUIRED'))return errorResponse('Video requires login', 403)
    if (msg.includes('No matching'))   return errorResponse('No format available for these options', 404)
    return errorResponse(msg)
  }
}
