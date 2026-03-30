
import { NextRequest, NextResponse } from 'next/server'
import { writeFile } from 'fs/promises'
import path from 'path'
import { v4 as uuid } from 'uuid'
import { ensureDirs, UPLOAD_DIR, probeVideo } from '@/lib/ffmpeg'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    await ensureDirs()

    const form = await req.formData()
    const file = form.get('video') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const allowed = ['video/mp4', 'video/quicktime', 'video/webm', 'video/x-msvideo', 'video/x-matroska']
    if (!file.type.startsWith('video/') && !allowed.includes(file.type)) {
      return NextResponse.json({ error: 'Unsupported file type' }, { status: 400 })
    }

    const ext      = path.extname(file.name) || '.mp4'
    const filename = `upload_${uuid().slice(0, 8)}${ext}`
    const filePath = path.join(UPLOAD_DIR, filename)

    const buffer = Buffer.from(await file.arrayBuffer())
    await writeFile(filePath, buffer)

    const meta = await probeVideo(filePath)

    return NextResponse.json({
      filename,
      publicPath: `/uploads/${filename}`,
      size: buffer.byteLength,
      ...meta,
    })
  } catch (err: any) {
    console.error('[upload]', err.message)
    return NextResponse.json({ error: err.message ?? 'Upload failed' }, { status: 500 })
  }
}
