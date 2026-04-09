import { NextRequest, NextResponse } from 'next/server'
import { runYouTubeAgent } from '@/lib/agent'
import { AgentInput } from '@/types'

export async function POST(req: NextRequest) {
  try {
    const body: AgentInput & { mode?: 'hosted' | 'api-key' } = await req.json()

    if (!body.topic || !body.niche || !body.targetAudience) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const result = await runYouTubeAgent(body, body.mode ?? 'hosted')
    return NextResponse.json(result)
  } catch (err) {
    console.error('Agent error:', err)
    return NextResponse.json({ error: 'Agent failed' }, { status: 500 })
  }
}
