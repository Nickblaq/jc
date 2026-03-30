
import { spawn } from 'child_process'
import { writeFile, mkdir, unlink, readFile } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import { v4 as uuid } from 'uuid'
import { CTASlide, ProcessJob, ProcessResult } from '@/types'

export const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads')
export const OUTPUT_DIR = path.join(process.cwd(), 'public', 'output')

export async function ensureDirs() {
  await mkdir(UPLOAD_DIR, { recursive: true })
  await mkdir(OUTPUT_DIR, { recursive: true })
}

// ─── Core: run any ffmpeg command, returns stdout+stderr ──────────────────────

function runFFmpeg(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn('ffmpeg', ['-y', ...args], { stdio: ['ignore', 'pipe', 'pipe'] })

    const errLines: string[] = []
    proc.stderr.on('data', (d: Buffer) => errLines.push(d.toString()))

    proc.on('close', (code) => {
      if (code === 0) {
        resolve()
      } else {
        // FFmpeg writes progress to stderr — last meaningful line is the error
        const msg = errLines.slice(-5).join('\n')
        reject(new Error(`FFmpeg exited with code ${code}:\n${msg}`))
      }
    })

    proc.on('error', (err) => {
      if ((err as any).code === 'ENOENT') {
        reject(new Error('ffmpeg not found. Install it: brew install ffmpeg (macOS) or sudo apt install ffmpeg (Linux)'))
      } else {
        reject(err)
      }
    })
  })
}

// ─── Probe: get video metadata without any wrapper ────────────────────────────

export function probeVideo(filePath: string): Promise<{
  duration: number; width: number; height: number; fps: number
}> {
  return new Promise((resolve, reject) => {
    const proc = spawn('ffprobe', [
      '-v', 'quiet',
      '-print_format', 'json',
      '-show_streams',
      '-show_format',
      filePath,
    ], { stdio: ['ignore', 'pipe', 'pipe'] })

    const out: string[] = []
    proc.stdout.on('data', (d: Buffer) => out.push(d.toString()))

    proc.on('close', (code) => {
      if (code !== 0) return reject(new Error('ffprobe failed'))
      try {
        const data = JSON.parse(out.join(''))
        const vs = data.streams?.find((s: any) => s.codec_type === 'video') ?? {}
        const duration = parseFloat(data.format?.duration ?? '0')

        // Parse fps from r_frame_rate e.g. "30/1" or "30000/1001"
        let fps = 30
        if (vs.r_frame_rate) {
          const [n, d] = vs.r_frame_rate.split('/').map(Number)
          if (d) fps = Math.round(n / d)
        }

        resolve({
          duration,
          width:  vs.width  ?? 0,
          height: vs.height ?? 0,
          fps,
        })
      } catch (e) {
        reject(e)
      }
    })

    proc.on('error', (err) => {
      if ((err as any).code === 'ENOENT') {
        reject(new Error('ffprobe not found. Install FFmpeg which includes ffprobe.'))
      } else {
        reject(err)
      }
    })
  })
}

// ─── Step 1: Trim ─────────────────────────────────────────────────────────────

async function trimVideo(
  inputPath: string,
  outputPath: string,
  startSec: number,
  endSec: number,
  mute: boolean,
  fadeIn: boolean,
  fadeOut: boolean,
  totalDuration: number,
): Promise<void> {
  const keepDuration = endSec - startSec

  // Build video filter
  const vfParts: string[] = [
    // Normalise to 9:16 1080×1920, pad with black if needed
    'scale=1080:1920:force_original_aspect_ratio=decrease',
    'pad=1080:1920:(ow-iw)/2:(oh-ih)/2:black',
  ]
  if (fadeIn)  vfParts.push('fade=t=in:st=0:d=0.5')
  if (fadeOut) vfParts.push(`fade=t=out:st=${(keepDuration - 0.5).toFixed(2)}:d=0.5`)

  const audioArgs = mute ? ['-an'] : [
    '-c:a', 'aac',
    '-b:a', '192k',
    ...(fadeIn  ? ['-af', `afade=t=in:st=0:d=0.5`] : []),
  ]

  await runFFmpeg([
    '-ss',   String(startSec),
    '-i',    inputPath,
    '-t',    String(keepDuration),
    '-vf',   vfParts.join(','),
    '-c:v',  'libx264',
    '-preset', 'fast',
    '-crf',  '22',
    '-movflags', '+faststart',
    ...audioArgs,
    outputPath,
  ])
}

// ─── Step 2: Generate a CTA slide as an mp4 clip ─────────────────────────────

async function generateSlide(slide: CTASlide, outputPath: string): Promise<void> {
  // Escape text for ffmpeg drawtext filter
  const escText = (s: string) => s
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/:/g, '\\:')
    .replace(/\[/g, '\\[')
    .replace(/\]/g, '\\]')

  const mainText = escText(slide.text || 'CTA')
  const subText  = escText(slide.subtext || '')

  // Convert #rrggbb → 0xRRGGBBAA for lavfi
  const bgHex = slide.bgColor.replace('#', '0x') + 'ff'

  // Build drawtext filter — font fallback chain that works cross-platform
  const fontFallback = process.platform === 'win32'
    ? 'C\\\\:/Windows/Fonts/arialbd.ttf'
    : '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'

  const mainY   = subText ? '(h/2)-80' : '(h-text_h)/2'
  const subtextFilter = subText
    ? `,drawtext=fontfile='${fontFallback}':text='${subText}':fontsize=50:fontcolor=${slide.accentColor}:x=(w-text_w)/2:y=(h/2)+30`
    : ''

  const vf = `drawtext=fontfile='${fontFallback}':text='${mainText}':fontsize=90:fontcolor=${slide.textColor}:x=(w-text_w)/2:y=${mainY}:fontweight=bold${subtextFilter}`

  await runFFmpeg([
    // Generate a solid-colour video of the right duration
    '-f',   'lavfi',
    '-i',   `color=c=${bgHex}:size=1080x1920:rate=30:d=${slide.duration}`,
    // Silent audio track of the same length
    '-f',   'lavfi',
    '-i',   `anullsrc=r=44100:cl=stereo`,
    '-t',   String(slide.duration),
    '-vf',  vf,
    '-c:v', 'libx264',
    '-preset', 'fast',
    '-crf',  '22',
    '-c:a', 'aac',
    '-shortest',
    '-movflags', '+faststart',
    outputPath,
  ])
}

// ─── Step 3: Concatenate via concat demuxer ───────────────────────────────────

async function concatVideos(parts: string[], outputPath: string): Promise<void> {
  const listPath = outputPath + '.txt'
  const lines    = parts.map(p => `file '${p.replace(/'/g, "'\\''")}'`).join('\n')
  await writeFile(listPath, lines, 'utf8')

  try {
    await runFFmpeg([
      '-f',       'concat',
      '-safe',    '0',
      '-i',       listPath,
      '-c',       'copy',
      '-movflags', '+faststart',
      outputPath,
    ])
  } finally {
    await unlink(listPath).catch(() => {})
  }
}

// ─── Main pipeline ────────────────────────────────────────────────────────────

export async function processVideo(job: ProcessJob): Promise<ProcessResult> {
  await ensureDirs()

  const id        = uuid().slice(0, 8)
  const inputPath = path.join(UPLOAD_DIR, job.filename)
  const meta      = await probeVideo(inputPath)

  const trimStart = Math.max(0, job.trimStart)
  const trimEnd   = Math.min(meta.duration, job.trimEnd > 0 ? job.trimEnd : meta.duration)

  // Temp paths
  const trimmedPath = path.join(UPLOAD_DIR, `tmp_trimmed_${id}.mp4`)
  const slidePaths: string[] = []

  try {
    // 1. Trim source
    await trimVideo(
      inputPath,
      trimmedPath,
      trimStart,
      trimEnd,
      job.muteOriginalAudio,
      job.addFadeIn,
      job.addFadeOut,
      meta.duration,
    )

    // 2. Generate slides
    const beforeSlides: string[] = []
    const afterSlides:  string[] = []

    for (const slide of job.slides) {
      const slidePath = path.join(UPLOAD_DIR, `tmp_slide_${id}_${slidePaths.length}.mp4`)
      await generateSlide(slide, slidePath)
      slidePaths.push(slidePath)
      if (slide.position === 'before') beforeSlides.push(slidePath)
      else                             afterSlides.push(slidePath)
    }

    // 3. Concatenate
    const filename   = `edited_${id}.mp4`
    const outputPath = path.join(OUTPUT_DIR, filename)
    const parts      = [...beforeSlides, trimmedPath, ...afterSlides]

    if (parts.length === 1) {
      // No slides — just copy trimmed
      const { copyFile } = await import('fs/promises')
      await copyFile(trimmedPath, outputPath)
    } else {
      await concatVideos(parts, outputPath)
    }

    const finalMeta = await probeVideo(outputPath)

    return {
      publicPath: `/output/${filename}`,
      filename,
      duration:   finalMeta.duration,
    }
  } finally {
    // Clean up all temp files regardless of success/failure
    const toDelete = [trimmedPath, ...slidePaths]
    await Promise.allSettled(toDelete.map(f => unlink(f).catch(() => {})))
  }
}
