
import { NextRequest, NextResponse } from 'next/server'
import { processVideo } from '@/lib/ffmpeg'
import type { ProcessJob } from '@/types'

export const runtime    = 'nodejs'
export const maxDuration = 300

export async function POST(req: NextRequest) {
  try {
    const job = await req.json() as ProcessJob

    if (!job.filename) {
      return NextResponse.json({ error: 'filename required' }, { status: 400 })
    }

    const result = await processVideo(job)
    return NextResponse.json(result)
  } catch (err: any) {
    console.error('[process]', err.message)
    return NextResponse.json({ error: err.message ?? 'Processing failed' }, { status: 500 })
  }
}
