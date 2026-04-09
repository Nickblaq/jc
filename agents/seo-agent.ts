
import { generateJSON } from '@/lib/claude'
import { generateId } from '@/lib/utils'
import type { ContentStrategy, Script, YouTubeSEO, Chapter } from '@/types'

interface SEOOutput {
  titles: string[]
  selectedTitle: string
  description: string
  tags: string[]
  hashtags: string[]
  chapters: { timestamp: string; title: string; seconds: number }[]
  thumbnailCopy: { primary: string; secondary: string }[]
  seoScore: number
  insights: string[]
  categoryId: number
}

export async function runSEOAgent(
  strategy: ContentStrategy,
  script: Script
): Promise<YouTubeSEO> {
  const prompt = `You are a YouTube SEO expert who consistently achieves top search rankings and high CTR.

VIDEO CONTEXT:
- Topic: ${strategy.topic}
- Angle: ${strategy.angle}
- Content type: ${strategy.contentType}
- Target audience: ${strategy.targetAudience}
- Primary keyword: ${strategy.keywords[0]}
- All keywords: ${strategy.keywords.join(', ')}
- Script title: ${script.title}
- Section titles: ${script.sections.map((s) => s.title).join(' | ')}
- Total duration: ~${Math.round(script.totalDurationSeconds / 60)} minutes

TASK: Generate a complete YouTube SEO package optimised for both search ranking and CTR.

Return a JSON object with this exact structure:
{
  "titles": [
    "Title 1 — optimised for search (include primary keyword near start)",
    "Title 2 — optimised for CTR (curiosity/emotion driven)",
    "Title 3 — optimised for authority (complete/ultimate/guide angle)",
    "Title 4 — optimised for specificity (numbers/year/specific outcome)",
    "Title 5 — pattern interrupt (counterintuitive or myth-bust angle)"
  ],
  "selectedTitle": "the single best title considering both SEO and CTR",
  "description": "SEO-optimised description, 300–400 words. First 125 chars must contain primary keyword and hook. Include: overview bullet points, timestamps section (placeholder), links section (placeholder), related content note, keyword-rich about section, subscribe CTA. Natural language — not keyword stuffed.",
  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5", "tag6", "tag7", "tag8", "tag9", "tag10", "tag11", "tag12", "tag13", "tag14", "tag15"],
  "hashtags": ["#hashtag1", "#hashtag2", "#hashtag3", "#hashtag4", "#hashtag5"],
  "chapters": [
    { "timestamp": "0:00", "title": "Introduction", "seconds": 0 },
    { "timestamp": "1:20", "title": "Section title here", "seconds": 80 }
  ],
  "thumbnailCopy": [
    { "primary": "BOLD MAIN TEXT", "secondary": "supporting line" },
    { "primary": "ALTERNATIVE TEXT", "secondary": "alternative support" }
  ],
  "seoScore": 82,
  "insights": [
    "Strategic insight about search opportunity for this topic",
    "CTR insight about the thumbnail/title combination",
    "Audience insight about who will find this video and why"
  ],
  "categoryId": 22
}

Category IDs: Education=27, Technology=28, Business=28, Finance=27, Entertainment=24, People&Blogs=22, HowTo=26`

  const output = await generateJSON<SEOOutput>(prompt, {
    system: 'You are a YouTube SEO expert. Respond with valid JSON only.',
    maxTokens: 2500,
  })

  const seo: YouTubeSEO = {
    id: generateId('seo'),
    scriptId: script.id,
    titles: output.titles,
    selectedTitle: output.selectedTitle,
    description: output.description,
    tags: output.tags.slice(0, 15),
    hashtags: output.hashtags.slice(0, 5),
    chapters: output.chapters as Chapter[],
    thumbnailCopy: output.thumbnailCopy,
    seoScore: output.seoScore,
    insights: output.insights,
    categoryId: output.categoryId ?? 22,
    createdAt: new Date().toISOString(),
  }

  return seo
}
