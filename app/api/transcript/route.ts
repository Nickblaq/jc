

/**
 * GET /api/transcript?id=VIDEO_ID&lang=en
 *
 * Fetches a YouTube video's transcript via youtubei.js.
 *
 * Why getInfo() and not getBasicInfo()?
 *   getTranscript() is a method on the VideoInfo object returned by getInfo().
 *   getBasicInfo() returns a lighter object that does NOT expose getTranscript().
 *   getInfo() makes two InnerTube requests (player + next) but is required here.
 *
 * Data path inside the response:
 *   transcriptData
 *     .transcript
 *     .content
 *     .body
 *     .initial_segments[]          ← array of segment objects
 *       .transcript_segment_renderer
 *         .snippet.text / .snippet.runs[]   ← the caption text
 *         .start_ms                          ← start time in milliseconds
 *         .end_ms                            ← end time in milliseconds
 *
 * Query params:
 *   id    — YouTube video ID or full URL (required)
 *   lang  — BCP-47 language code, e.g. "en", "es", "fr" (optional, default: first available)
 *
 * Response shape:
 *   {
 *     videoId:    string
 *     title:      string
 *     language:   string
 *     segments:   TranscriptSegment[]   ← timed captions
 *     fullText:   string                ← plain concatenated transcript
 *     duration:   number                ← total seconds (from last segment end)
 *   }
 */

import { NextRequest, NextResponse } from 'next/server'
import { Innertube, UniversalCache } from 'youtubei.js'

export const runtime    = 'nodejs'
export const maxDuration = 30

// ── Types ─────────────────────────────────────────────────────────────────────

export interface TranscriptSegment {
  text:     string   // decoded caption text
  start:    number   // seconds
  end:      number   // seconds
  duration: number   // seconds
}

export interface TranscriptResponse {
  videoId:  string
  title:    string
  language: string
  segments: TranscriptSegment[]
  fullText: string
  duration: number
}

// ── Singleton Innertube ───────────────────────────────────────────────────────
// getInfo() is heavier than getBasicInfo() so we keep one session alive.

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

// ── Route handler ─────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const params  = req.nextUrl.searchParams
  const rawId   = params.get('id')?.trim()
  const lang    = params.get('lang')?.trim() ?? ''

  if (!rawId) {
    return NextResponse.json(
      { error: "Missing required param 'id' — provide a video ID or YouTube URL" },
      { status: 400 }
    )
  }

  const videoId = extractVideoId(rawId)
  if (!videoId) {
    return NextResponse.json(
      { error: `Could not parse a video ID from: "${rawId}"` },
      { status: 400 }
    )
  }

  try {
    const yt = await getYT()

    // ── Step 1: getInfo (required for getTranscript) ─────────────────────────
    // We use the TV client — same reason as download routes: avoids SABR issues
    // on the WEB client and gives us stable InnerTube responses.
    let info: any
    try {
      info = await yt.getInfo(videoId, { client: 'TV' })
    } catch (err: any) {
      _yt = null
      return NextResponse.json(
        { error: `getInfo() failed: ${err?.message ?? String(err)}` },
        { status: 502 }
      )
    }

    const title = String(info.basic_info?.title ?? videoId)

    // ── Step 2: check playability ────────────────────────────────────────────
    const playStatus = info.playability_status?.status
    if (playStatus === 'LOGIN_REQUIRED') {
      return NextResponse.json(
        { error: 'Video requires login (age-restricted or private). Set YOUTUBE_COOKIE to access.' },
        { status: 403 }
      )
    }

    // ── Step 3: getTranscript() ──────────────────────────────────────────────
    let transcriptData: any
    try {
      transcriptData = await info.getTranscript()
    } catch (err: any) {
      return NextResponse.json(
        { error: `getTranscript() failed: ${err?.message ?? String(err)}` },
        { status: 502 }
      )
    }

    // ── Step 4: validate the data shape ──────────────────────────────────────
    const body = transcriptData?.transcript?.content?.body
    if (!body) {
      return NextResponse.json(
        {
          error: 'No transcript data returned. The video may not have captions.',
          videoId,
          title,
        },
        { status: 404 }
      )
    }

    // ── Step 5: language selection ───────────────────────────────────────────
    // If a lang param was provided, try to switch to it via selectLanguage()
    // then re-fetch the body. If not found, we fall back to the default.
    let segments: any[] = body.initial_segments ?? []
    let resolvedLang    = detectLanguage(transcriptData)

    if (lang && lang !== resolvedLang) {
      try {
        const switched = await transcriptData.selectLanguage(lang)
        const switchedBody = switched?.transcript?.content?.body
        if (switchedBody?.initial_segments?.length) {
          segments     = switchedBody.initial_segments
          resolvedLang = lang
        }
      } catch {
        // Language not available — continue with the default
      }
    }

    if (!segments.length) {
      return NextResponse.json(
        { error: 'Transcript is empty for this video.', videoId, title },
        { status: 404 }
      )
    }

    // ── Step 6: parse segments ────────────────────────────────────────────────
    const parsed = segments
      .map(parseSegment)
      .filter((s): s is TranscriptSegment => s !== null && s.text.length > 0)

    if (!parsed.length) {
      return NextResponse.json(
        { error: 'Could not parse any transcript segments.', videoId, title },
        { status: 404 }
      )
    }

    const lastSeg  = parsed[parsed.length - 1]
    const duration = lastSeg.end || lastSeg.start + lastSeg.duration

    const fullText = parsed.map(s => s.text).join(' ')

    const response: TranscriptResponse = {
      videoId,
      title,
      language: resolvedLang,
      segments: parsed,
      fullText,
      duration,
    }

    return NextResponse.json(response)

  } catch (err: any) {
    console.error('[transcript]', err)
    _yt = null
    return NextResponse.json(
      { error: err?.message ?? 'Unexpected error fetching transcript' },
      { status: 500 }
    )
  }
}

// ── Parsers ───────────────────────────────────────────────────────────────────

/**
 * Parse one raw InnerTube segment into a clean TranscriptSegment.
 * Handles both `transcript_segment_renderer` and `cue_group_renderer` shapes.
 */
function parseSegment(seg: any): TranscriptSegment | null {
  try {
    // Primary shape: transcript_segment_renderer
    const tsr = seg?.transcript_segment_renderer
    if (tsr) {
      const text     = decodeHtml(extractText(tsr))
      const startMs  = parseFloat(tsr.start_ms ?? '0')
      const endMs    = parseFloat(tsr.end_ms   ?? String(startMs))
      const start    = startMs / 1000
      const end      = endMs   / 1000
      return { text, start, end, duration: end - start }
    }

    // Alternative shape: cue_group_renderer (some auto-generated captions)
    const cgr = seg?.cue_group_renderer
    if (cgr) {
      const cue      = cgr.cues?.[0]?.cue_renderer
      if (!cue) return null
      const text     = decodeHtml(extractText(cue.text ?? cue))
      const startMs  = parseFloat(cue.start_offset_ms ?? '0')
      const durMs    = parseFloat(cue.duration_ms     ?? '0')
      const start    = startMs / 1000
      const duration = durMs   / 1000
      return { text, start, end: start + duration, duration }
    }

    return null
  } catch {
    return null
  }
}

/**
 * Pull plain text out of the various shapes YouTube uses for caption snippets:
 *   snippet.text (simple string)
 *   snippet.runs[].text (rich text array)
 *   tsr.text / tsr.runs[] (top-level alternatives)
 */
function extractText(node: any): string {
  if (!node) return ''

  // snippet.text
  if (node.snippet?.text) return String(node.snippet.text)
  // snippet.runs[]
  if (Array.isArray(node.snippet?.runs))
    return node.snippet.runs.map((r: any) => r.text ?? '').join('')

  // direct text string
  if (typeof node.text === 'string') return node.text
  // text as snippet object
  if (node.text?.text) return String(node.text.text)
  if (Array.isArray(node.text?.runs))
    return node.text.runs.map((r: any) => r.text ?? '').join('')

  // direct runs[]
  if (Array.isArray(node.runs))
    return node.runs.map((r: any) => r.text ?? '').join('')

  return ''
}

/** Decode the handful of HTML entities YouTube encodes in captions. */
function decodeHtml(text: string): string {
  return text
    .replace(/&amp;/g,  '&')
    .replace(/&lt;/g,   '<')
    .replace(/&gt;/g,   '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g,  "'")
    .replace(/&nbsp;/g, ' ')
    .trim()
}

/**
 * Try to read the language code from the transcript response.
 * The label is a human-readable string like "English (auto-generated)".
 */
function detectLanguage(transcriptData: any): string {
  const lang =
    transcriptData?.transcript?.content?.lang ??
    transcriptData?.header?.language_menu?.sub_menu_items?.[0]?.title ??
    'unknown'
  return String(lang)
}

/**
 * Extract a YouTube video ID from:
 *   - A raw 11-char ID
 *   - youtube.com/watch?v=…
 *   - youtu.be/…
 *   - youtube.com/embed/…
 *   - youtube.com/shorts/…
 */
function extractVideoId(input: string): string | null {
  // Bare 11-char ID
  if (/^[a-zA-Z0-9_-]{11}$/.test(input)) return input

  try {
    const url = new URL(input)

    if (url.hostname === 'youtu.be')
      return url.pathname.slice(1).split('?')[0] || null

    if (url.hostname.endsWith('youtube.com')) {
      if (url.pathname === '/watch')
        return url.searchParams.get('v')
      const m = url.pathname.match(/^\/(embed|shorts|v)\/([a-zA-Z0-9_-]{11})/)
      if (m) return m[2]
    }
  } catch {
    // not a URL — try regex on raw string
    const m = input.match(/(?:v=|youtu\.be\/|embed\/|shorts\/)([a-zA-Z0-9_-]{11})/)
    if (m) return m[1]
  }

  return null
}
