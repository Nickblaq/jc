
import { NextRequest } from 'next/server'
import { Innertube, UniversalCache } from 'youtubei.js'

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
  const type    = (req.nextUrl.searchParams.get('type') || 'videoandaudio') as 'videoandaudio' | 'video' | 'audio'
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

    // chooseFormat picks the best match — falls back gracefully if exact quality unavailable
    const format = info.chooseFormat({
      type,
      quality: quality as any,
      format: 'mp4',
    })

    if (!format) {
      return new Response(JSON.stringify({ error: 'No suitable format found for this video' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // ── Decipher streaming URL ───────────────────────────────────────────────
    // This runs YouTube's obfuscated JS to get a valid, signed URL
    const url = await format.decipher(yt.session.player)

    if (!url) {
      return new Response(JSON.stringify({ error: 'Could not decipher streaming URL' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // ── Determine file extension + MIME ──────────────────────────────────────
    const ext = type === 'audio' ? 'm4a' : 'mp4'
    const mime = type === 'audio' ? 'audio/mp4' : 'video/mp4'
    const filename = `${safeTitle}.${ext}`

    // ── Stream from YouTube → client ─────────────────────────────────────────
    // We proxy the stream — YouTube blocks direct browser downloads due to CORS + signed URLs
    const upstream = await fetch(url, {
      headers: {
        // Mimic a browser request — YouTube checks these
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://www.youtube.com/',
        'Origin': 'https://www.youtube.com',
      },
    })

    if (!upstream.ok || !upstream.body) {
      return new Response(JSON.stringify({ error: `Upstream fetch failed: ${upstream.status}` }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Forward content-length if YouTube provides it (enables progress bar in browser)
    const contentLength = upstream.headers.get('content-length')

    const headers: Record<string, string> = {
      'Content-Type': mime,
      // attachment → triggers browser Save dialog  |  inline → streams in browser player
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
      'X-Video-Title': basicInfo?.title || videoId,
    }

    if (contentLength) {
      headers['Content-Length'] = contentLength
    }

    // Pipe the ReadableStream straight to the client response
    return new Response(upstream.body, { headers })

  } catch (err: any) {
    console.error('[download route error]', err)
    _yt = null

    return new Response(
      JSON.stringify({ error: err?.message || 'Download failed' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
