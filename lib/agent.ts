
import Anthropic from '@anthropic-ai/sdk'
import { AgentInput, AgentOutput } from '@/types'

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
