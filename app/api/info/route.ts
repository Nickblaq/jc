
import { NextRequest, NextResponse } from 'next/server'
import { Innertube, UniversalCache, FormatUtils } from 'youtubei.js'

export const runtime = 'nodejs'
export const maxDuration = 300

// types/stream.ts

export interface StreamFormat {
  itag: number
  mime_type: string
  bitrate: number
  quality_label?: string
  has_video: boolean
  has_audio: boolean
  width?: number
  height?: number
  url?: string
}

export interface StreamResponse {
  title: string
  raw: StreamFormat[]
  adaptive: StreamFormat[]
  chosenFormat: StreamFormat | null
  signedUrl: string | null
}

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

export async function GET(req: NextRequest) {
      const videoId = req.nextUrl.searchParams.get('id')!
    if (!videoId ) {
      return NextResponse.json({ error: 'Video ID is required' }, { status: 400 })
    }

     if (!/^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
      return NextResponse.json({ error: 'Invalid video ID format' }, { status: 400 })
    }
  try {


    const yt = await getYT()

  


    const info = await yt.getInfo(videoId as string, { client: 'TV' })
     if (!info) {
      return NextResponse.json({ error: 'Failed to get download stream' }, { status: 400 })
    }

const basicInfo = info.basic_info
const safeTitle = (basicInfo?.title || videoId)
  .replace(/[^\w\s\-().]/g, '')  // strip special chars for filename
  .replace(/\s+/g, '_')
  .slice(0, 80)

    

  // Raw formats
    const raw = (info.streaming_data?.formats ?? []).map(f => ({
      itag: f.itag,
      mime_type: f.mime_type,
      bitrate: f.bitrate,
      quality_label: f.quality_label,
      has_video: f.has_video,
      has_audio: f.has_audio,
      width: f.width,
      height: f.height
    }))

    // Adaptive formats
    const adaptive = (info.streaming_data?.adaptive_formats ?? []).map(f => ({
      itag: f.itag,
      mime_type: f.mime_type,
      bitrate: f.bitrate,
      quality_label: f.quality_label,
      has_video: f.has_video,
      has_audio: f.has_audio,
      width: f.width,
      height: f.height
    }))

    // Choose format
    let chosen = null
    let signedUrl: string | null = null

    try {
  const format = FormatUtils.chooseFormat(
    { quality: 'best', type: 'video+audio', format: 'mp4' },
    info.streaming_data
  )

  if (format) {
    // IMPORTANT: do not mutate format.url
        const url = format.url
          ? format.url
          : format.decipher
          ? await format.decipher(yt.session.player)
          :null
    signedUrl = url

    // 2. Keep chosenFormat clean (no mutation dependency)
    chosen = {
      itag: format.itag,
      mime_type: format.mime_type,
      bitrate: format.bitrate,
      quality_label: format.quality_label,
      has_video: format.has_video,
      has_audio: format.has_audio,
      width: format.width,
      height: format.height,
      url
      // ⚠️ intentionally NOT binding signedUrl here
    }
  }
} catch (e) {
  console.warn('Decipher failed:', e)
}

    const res: StreamResponse = {
      title: safeTitle,
      raw,
      adaptive,
      chosenFormat: chosen,
      signedUrl
    }
    // const stream =  await info.download()
  return NextResponse.json(res)

  } catch (error: any) {
    console.error('[download route error]', error)

    _yt = null

    return NextResponse.json(
      { error: error?.message || 'Failed to get Info' },
      { status: 500 }
    )
  }
}

