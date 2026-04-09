
import { generateJSON } from '@/lib/agent'
import { generateId } from '@/lib/utils'
import { ContentStrategy, Script, ScriptSection } from '@/types'

interface ScriptOutput {
  title: string
  hook: string
  introduction: string
  sections: {
    title: string
    content: string
    durationSeconds: number
    visualNote: string
  }[]
  conclusion: string
  callToAction: string
}

export async function runScriptAgent(
  strategy: ContentStrategy
): Promise<Script> {
  const sectionCount = getSectionCount(strategy.contentType)

  const prompt = `You are an expert YouTube scriptwriter known for creating highly engaging, retention-optimized video scripts.

VIDEO STRATEGY:
- Topic: ${strategy.topic}
- Angle: ${strategy.angle}
- Target audience: ${strategy.targetAudience}
- Content type: ${strategy.contentType}
- Primary keyword: ${strategy.keywords[0]}
- Supporting keywords: ${strategy.keywords.slice(1).join(', ')}

SCRIPT REQUIREMENTS:
- Total target duration: 10–15 minutes
- Number of main sections: ${sectionCount}
- Tone: Authoritative but conversational, direct value delivery
- Hook: Must stop the scroll in first 3 sentences — start with a bold claim, surprising stat, or provocative question
- Each section must deliver concrete, actionable value
- Conclusion must tease the next logical question (creates watch-more behaviour)
- CTA must feel natural, not forced

Return a JSON object with this exact structure:
{
  "title": "compelling video title (60–70 chars, includes primary keyword)",
  "hook": "the complete opening hook — 2–4 sentences, under 60 words, designed to stop the scroll",
  "introduction": "brief introduction that previews what viewer will learn (30–50 words)",
  "sections": [
    {
      "title": "Section title",
      "content": "Complete section script (150–250 words). Write as spoken word — natural, direct, conversational.",
      "durationSeconds": 120,
      "visualNote": "What should be on screen during this section (B-roll, text overlay, diagram, etc.)"
    }
  ],
  "conclusion": "Wrap-up and key takeaways (50–80 words)",
  "callToAction": "Natural subscribe/like/comment CTA (20–30 words)"
}`

  const output = await generateJSON<ScriptOutput>(prompt, {
    system: 'You are an expert YouTube scriptwriter. Respond with valid JSON only. Write scripts as natural spoken word — no stage directions in brackets.',
    maxTokens: 3000,
  })

  // Build TTS-ready text
  const ttsText = buildTTSText(output)

  // Calculate word count and duration
  const wordCount = ttsText.split(/\s+/).length
  const totalDurationSeconds = Math.round((wordCount / 150) * 60) // 150 wpm

  const script: Script = {
    id: generateId('script'),
    strategyId: strategy.id,
    title: output.title,
    hook: output.hook,
    introduction: output.introduction,
    sections: output.sections as ScriptSection[],
    conclusion: output.conclusion,
    callToAction: output.callToAction,
    totalDurationSeconds,
    wordCount,
    ttsText,
    createdAt: new Date().toISOString(),
  }

  return script
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getSectionCount(contentType: ContentStrategy['contentType']): number {
  const counts: Record<ContentStrategy['contentType'], number> = {
    Tutorial: 5,
    Explainer: 4,
    List: 7,
    Review: 5,
    Story: 4,
    News: 3,
  }
  return counts[contentType] ?? 5
}

function buildTTSText(script: ScriptOutput): string {
  const parts = [
    script.hook,
    script.introduction,
    ...script.sections.map((s) => `${s.title}. ${s.content}`),
    script.conclusion,
    script.callToAction,
  ]
  return parts
    .filter(Boolean)
    .join('\n\n')
    .replace(/\[.*?\]/g, '') // remove stage directions
    .trim()
}
