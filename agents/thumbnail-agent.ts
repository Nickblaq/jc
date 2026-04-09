
import { generateJSON } from '@/lib/agent'
import { generateId } from '@/lib/utils'
import { ContentStrategy, Script, YouTubeSEO, Thumbnail, ThumbnailConcept } from '@/types'

interface ThumbnailOutput {
  primaryText: string
  secondaryText: string
  style: string
  colorScheme: { primary: string; secondary: string; accent: string }
  emotion: string
  composition: string
  designBrief: string
  imagePrompt: string  // ready-to-use prompt for Ideogram/Flux
}

export async function runThumbnailAgent(
  strategy: ContentStrategy,
  script: Script,
  seo: YouTubeSEO
): Promise<Thumbnail> {
  const prompt = `You are a world-class YouTube thumbnail designer who consistently achieves 8–15% CTR.

VIDEO CONTEXT:
- Title: ${seo.selectedTitle}
- Topic: ${strategy.topic}
- Angle: ${strategy.angle}
- Content type: ${strategy.contentType}
- Target audience: ${strategy.targetAudience}

THUMBNAIL PSYCHOLOGY:
- Thumbnails must work at 120px wide (mobile browse size)
- High contrast text + face/reaction = highest CTR formula
- Finance/business thumbnails: bold numbers, money imagery, authoritative expression
- The thumbnail and title must create a "curiosity gap" together — neither gives away everything

Return a JSON object with this exact structure:
{
  "primaryText": "THE BIG BOLD TEXT (3–5 words max, all caps)",
  "secondaryText": "Supporting context line (3–5 words)",
  "style": "one of: bold-finance, minimalist-clean, dramatic-reveal, authority-expert, data-driven",
  "colorScheme": {
    "primary": "#hex — dominant background or main element color",
    "secondary": "#hex — secondary element or text color",
    "accent": "#hex — pop/highlight color for the key text"
  },
  "emotion": "the feeling the thumbnail should evoke: curiosity | urgency | authority | excitement | shock",
  "composition": "one of: rule-of-thirds | centered | left-text-right-image | diagonal-split | full-bleed",
  "designBrief": "2–3 sentence brief for a designer: what to show, how to arrange it, what makes it scroll-stopping",
  "imagePrompt": "Ready-to-use AI image generation prompt for the background/main visual (no text — text is overlaid separately). Detailed, specific, describes lighting, style, subject, mood."
}`

  const output = await generateJSON<ThumbnailOutput>(prompt, {
    system: 'You are a YouTube thumbnail design expert. Respond with valid JSON only.',
    maxTokens: 700,
  })

  const concept: ThumbnailConcept = {
    primaryText: output.primaryText,
    secondaryText: output.secondaryText,
    style: output.style,
    colorScheme: output.colorScheme,
    emotion: output.emotion,
    composition: output.composition,
  }

  const thumbnail: Thumbnail = {
    id: generateId('thumb'),
    scriptId: script.id,
    concept,
    dimensions: { width: 1280, height: 720 },
    generatedWith: 'pending', // updated when image is actually generated
    createdAt: new Date().toISOString(),
  }

  return thumbnail
}
