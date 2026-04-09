
import { generateJSON } from '@/lib/agent'
import { generateId } from '@/lib/utils'
import { ContentStrategy, Script, TikTokPackage, TikTokClip } from '@/types'

interface TikTokOutput {
  hooks: string[]
  captions: string[]
  hashtags: string[]
  clipTimestamps: {
    startSeconds: number
    endSeconds: number
    timeLabel: string
    note: string
    hookPotential: number
  }[]
  viralityScore: number
  insights: string[]
}

export async function runTikTokAgent(
  strategy: ContentStrategy,
  script: Script
): Promise<TikTokPackage> {
  const sectionSummary = script.sections
    .map((s, i) => {
      const startSec = i === 0 ? 30 : script.sections
        .slice(0, i)
        .reduce((acc, sec) => acc + sec.durationSeconds, 30)
      const endSec = startSec + s.durationSeconds
      return `Section ${i + 1} "${s.title}": ${formatTime(startSec)}–${formatTime(endSec)}`
    })
    .join('\n')

  const prompt = `You are a TikTok growth expert who understands what makes short-form content go viral, especially for finance, business, crypto, and wealth-building niches.

VIDEO CONTEXT:
- Topic: ${strategy.topic}
- Angle: ${strategy.angle}
- Target audience: ${strategy.targetAudience}
- Total video duration: ${formatTime(script.totalDurationSeconds)}
- Hook (first 30s): ${script.hook}

SCRIPT SECTION TIMESTAMPS:
${sectionSummary}

TASK: Generate a complete TikTok distribution package. TikTok is the top-of-funnel — every piece of content should drive viewers to the full YouTube video.

TikTok best practices for this niche:
- First 2 seconds MUST create a pattern interrupt
- Finance/crypto hooks that work: shocking stat, counterintuitive claim, "nobody talks about X"
- Captions must include a clear bridge to YouTube ("Full breakdown in bio link")
- Hashtags: 3–5 targeted, NOT generic
- Clip selection: pick moments that work WITHOUT context — standalone punchy insights

Return a JSON object with this exact structure:
{
  "hooks": [
    "Hook 1 — shocking stat or number that stops the scroll (under 10 words)",
    "Hook 2 — counterintuitive claim that challenges assumption (under 10 words)",
    "Hook 3 — direct question that target audience asks themselves (under 10 words)"
  ],
  "captions": [
    "Caption 1 (2–3 sentences): hook sentence + value teaser + bridge to YouTube. Include question to drive comments.",
    "Caption 2: different angle on same topic, ends with CTA to link in bio",
    "Caption 3: personal/story framing, most conversational tone"
  ],
  "hashtags": ["#hashtag1", "#hashtag2", "#hashtag3", "#hashtag4", "#hashtag5"],
  "clipTimestamps": [
    {
      "startSeconds": 0,
      "endSeconds": 45,
      "timeLabel": "0:00–0:45",
      "note": "Why this moment works as standalone TikTok — what makes it punchable",
      "hookPotential": 88
    },
    {
      "startSeconds": 240,
      "endSeconds": 310,
      "timeLabel": "4:00–5:10",
      "note": "Why this moment works",
      "hookPotential": 75
    },
    {
      "startSeconds": 480,
      "endSeconds": 540,
      "timeLabel": "8:00–9:00",
      "note": "Why this moment works",
      "hookPotential": 70
    }
  ],
  "viralityScore": 76,
  "insights": [
    "Insight about why this topic has TikTok virality potential",
    "Insight about the optimal posting time / format for this niche on TikTok",
    "Insight about the content series potential — follow-up TikTok ideas from this video"
  ]
}`

  const output = await generateJSON<TikTokOutput>(prompt, {
    system: 'You are a TikTok growth expert for finance/business content. Respond with valid JSON only.',
    maxTokens: 1500,
  })

  const pkg: TikTokPackage = {
    id: generateId('tiktok'),
    scriptId: script.id,
    hooks: output.hooks,
    captions: output.captions,
    hashtags: output.hashtags,
    clipTimestamps: output.clipTimestamps as TikTokClip[],
    viralityScore: output.viralityScore,
    insights: output.insights,
    createdAt: new Date().toISOString(),
  }

  return pkg
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}
