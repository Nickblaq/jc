
import { generateJSON } from '@/lib/agent'
import {
  fetchTrendingVideos,
  extractTrendingTopics,
  getFallbackTopics,
  isYouTubeConfigured,
} from '@/lib/youtube'
import { generateId } from '@/lib/youtube'
import { ContentStrategy, AgentInput, TrendingTopic } from '@/types'

interface StrategyOutput {
  topic: string
  angle: string
  targetAudience: string
  contentType: 'Tutorial' | 'Explainer' | 'List' | 'Review' | 'Story' | 'News'
  keywords: string[]
  estimatedViews: number
  bestPublishTime: string
  rationale: string
}

export async function runStrategyAgent(
  input: AgentInput
): Promise<ContentStrategy> {
  // Step 1: Get trending topics (real API or fallback)
  let trendingTopics: TrendingTopic[]

  if (isYouTubeConfigured()) {
    try {
      const videos = await fetchTrendingVideos('US', 50)
      trendingTopics = extractTrendingTopics(videos, input.niche)
    } catch {
      trendingTopics = getFallbackTopics(input.niche)
    }
  } else {
    trendingTopics = getFallbackTopics(input.niche)
  }

  const topTopics = trendingTopics.slice(0, 10)

  // Step 2: Claude selects the best angle and builds the strategy
  const prompt = `You are an expert YouTube content strategist with deep knowledge of what drives views, engagement, and subscriber growth.

CHANNEL CONTEXT:
- Niche: ${input.niche}
- Target audience: ${input.targetAudience}
- Requested topic: ${input.topic}

TRENDING DATA (from YouTube, sorted by opportunity score):
${topTopics.map((t, i) => `${i + 1}. "${t.topic}" — opportunity: ${t.opportunityScore}/100, competition: ${t.competitionScore}/100`).join('\n')}

TASK:
Based on the requested topic and trending data, generate an optimal content strategy. If the requested topic strongly aligns with a trending topic, use that. Otherwise, find the best angle for the requested topic given what's trending.

Return a JSON object with this exact structure:
{
  "topic": "the refined topic (specific, not vague)",
  "angle": "the unique angle that differentiates this video from competition",
  "targetAudience": "specific description of who will watch this",
  "contentType": "one of: Tutorial, Explainer, List, Review, Story, News",
  "keywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"],
  "estimatedViews": 15000,
  "bestPublishTime": "Tuesday 2:00 PM EST",
  "rationale": "one sentence explaining why this topic/angle will perform well"
}`

  const output = await generateJSON<StrategyOutput>(prompt, {
    system: 'You are an expert YouTube content strategist. Always respond with valid JSON only.',
    maxTokens: 800,
  })

  const strategy: ContentStrategy = {
    id: generateId('strat'),
    topic: output.topic,
    angle: output.angle,
    targetAudience: output.targetAudience || input.targetAudience,
    contentType: output.contentType,
    keywords: output.keywords,
    estimatedViews: output.estimatedViews,
    bestPublishTime: output.bestPublishTime,
    trendData: topTopics[0],
    createdAt: new Date().toISOString(),
  }

  return strategy
}
