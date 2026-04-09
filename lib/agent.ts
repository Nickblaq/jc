
import Anthropic from '@anthropic-ai/sdk'
import { AgentInput, AgentOutput } from '@/types'


// Singleton client — reused across all agent calls
let _client: Anthropic | null = null

const PROMPT = (topic: string, channelNiche: string, targetAudience: string) => `
You are an expert YouTube SEO strategist and growth consultant.

Channel context:
- Niche: ${channelNiche}
- Target audience: ${targetAudience}
- Video topic: ${topic}

Generate a comprehensive YouTube optimization package. Return ONLY valid JSON (no markdown, no backticks) matching this exact schema:

{
  "titles": ["title1", "title2", "title3", "title4", "title5"],
  "description": "full SEO-optimized video description (300-500 words, natural language, includes keyword variations, timestamps placeholder, and call to action)",
  "tags": ["tag1", "tag2"] (15 tags, ranked by relevance),
  "hooks": ["hook1", "hook2", "hook3"],
  "thumbnailCopy": [
    { "primary": "big bold text", "secondary": "smaller supporting text" },
    { "primary": "variation 2", "secondary": "supporting text" }
  ],
  "seoScore": 85,
  "insights": ["insight1", "insight2", "insight3"]
}`

// MODE A: Uses injected key inside Claude.ai (no key needed)
export async function runAgentHosted(input: AgentInput): Promise<AgentOutput> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 2000,
      messages: [
        {
          role: 'user',
          content: PROMPT(input.topic, input.channelNiche, input.targetAudience),
        },
      ],
    }),
  })

  const data = await res.json()
  const text = data.content
    .filter((b: { type: string }) => b.type === 'text')
    .map((b: { text: string }) => b.text)
    .join('')

  return JSON.parse(text) as AgentOutput
}

// MODE B: Uses your own API key (production/self-hosted)
export async function runAgentWithKey(input: AgentInput): Promise<AgentOutput> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2000,
    messages: [
      {
        role: 'user',
        content: PROMPT(input.topic, input.channelNiche, input.targetAudience),
      },
    ],
  })

  const text = response.content
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('')

  return JSON.parse(text) as AgentOutput
}

// Unified runner — auto-selects mode
export async function runYouTubeAgent(
  input: AgentInput,
  mode: 'hosted' | 'api-key' = 'hosted'
): Promise<AgentOutput> {
  return mode === 'hosted'
    ? runAgentHosted(input)
    : runAgentWithKey(input)
}

function getClient(): Anthropic {
  if (!_client) {
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      throw new Error(
        'ANTHROPIC_API_KEY is not set. Add it to .env.local to enable AI agents.'
      )
    }
    _client = new Anthropic({ apiKey })
  }
  return _client
}

export const MODEL = 'claude-sonnet-4-6'

// ─── Core text generation ────────────────────────────────────────────────────

export async function generate(
  prompt: string,
  options: {
    system?: string
    maxTokens?: number
    temperature?: number
  } = {}
): Promise<string> {
  const client = getClient()

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: options.maxTokens ?? 2000,
    system: options.system,
    messages: [{ role: 'user', content: prompt }],
  })

  return response.content
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('')
}

// ─── JSON generation — strict parsing with fallback ──────────────────────────

export async function generateJSON<T>(
  prompt: string,
  options: {
    system?: string
    maxTokens?: number
  } = {}
): Promise<T> {
  const system = [
    options.system,
    'CRITICAL: Respond with ONLY a raw JSON object. No markdown, no backticks, no prose before or after. Start your response with { and end with }.',
  ]
    .filter(Boolean)
    .join('\n\n')

  const raw = await generate(prompt, {
    system,
    maxTokens: options.maxTokens ?? 2000,
  })

  // Extract outermost JSON object — robust against any surrounding text
  const start = raw.indexOf('{')
  const end = raw.lastIndexOf('}')

  if (start === -1 || end === -1) {
    throw new Error(`No JSON found in Claude response. Raw: ${raw.slice(0, 200)}`)
  }

  try {
    return JSON.parse(raw.slice(start, end + 1)) as T
  } catch (err) {
    throw new Error(
      `Failed to parse Claude JSON response: ${(err as Error).message}. Raw: ${raw.slice(0, 300)}`
    )
  }
}

// ─── Streaming — for real-time UI updates ────────────────────────────────────

export async function* generateStream(
  prompt: string,
  options: { system?: string; maxTokens?: number } = {}
): AsyncGenerator<string> {
  const client = getClient()

  const stream = client.messages.stream({
    model: MODEL,
    max_tokens: options.maxTokens ?? 2000,
    system: options.system,
    messages: [{ role: 'user', content: prompt }],
  })

  for await (const event of stream) {
    if (
      event.type === 'content_block_delta' &&
      event.delta.type === 'text_delta'
    ) {
      yield event.delta.text
    }
  }
}

// ─── Health check ────────────────────────────────────────────────────────────

export async function checkClaudeConnection(): Promise<boolean> {
  try {
    await generate('Reply with the single word: ok', { maxTokens: 10 })
    return true
  } catch {
    return false
  }
}
