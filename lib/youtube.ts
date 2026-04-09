
import { google, youtube_v3 } from 'googleapis'
import { TrendingTopic } from '@/types'

function getYouTubeClient(): youtube_v3.Youtube {
  const apiKey = process.env.YOUTUBE_API_KEY
  if (!apiKey) {
    throw new Error('YOUTUBE_API_KEY is not set. Add it to .env.local.')
  }
  return google.youtube({ version: 'v3', auth: apiKey })
}

// ─── Trending videos in a region ─────────────────────────────────────────────

export async function fetchTrendingVideos(
  regionCode = 'US',
  maxResults = 50
): Promise<youtube_v3.Schema$Video[]> {
  const youtube = getYouTubeClient()

  const response = await youtube.videos.list({
    part: ['snippet', 'statistics'],
    chart: 'mostPopular',
    regionCode,
    maxResults,
  })

  return response.data.items ?? []
}

// ─── Search for videos by keyword ────────────────────────────────────────────

export async function searchVideos(
  query: string,
  maxResults = 20
): Promise<youtube_v3.Schema$SearchResult[]> {
  const youtube = getYouTubeClient()

  const response = await youtube.search.list({
    part: ['snippet'],
    q: query,
    type: ['video'],
    order: 'viewCount',
    maxResults,
  })

  return response.data.items ?? []
}

// ─── Get video details by IDs ─────────────────────────────────────────────────

export async function getVideoDetails(
  videoIds: string[]
): Promise<youtube_v3.Schema$Video[]> {
  if (videoIds.length === 0) return []
  const youtube = getYouTubeClient()

  const response = await youtube.videos.list({
    part: ['snippet', 'statistics', 'contentDetails'],
    id: videoIds,
  })

  return response.data.items ?? []
}

// ─── Derive trending topics from videos ──────────────────────────────────────

export function extractTrendingTopics(
  videos: youtube_v3.Schema$Video[],
  niche: string
): TrendingTopic[] {
  const topicMap = new Map<
    string,
    { totalViews: number; count: number; tags: string[] }
  >()

  for (const video of videos) {
    const title = video.snippet?.title ?? ''
    const tags = video.snippet?.tags ?? []
    const views = parseInt(video.statistics?.viewCount ?? '0')

    // Extract meaningful keywords from title
    const keywords = extractKeywords(title)

    keywords.forEach((kw) => {
      const existing = topicMap.get(kw) ?? { totalViews: 0, count: 0, tags: [] }
      existing.totalViews += views
      existing.count += 1
      existing.tags = [...new Set([...existing.tags, ...tags.slice(0, 3)])]
      topicMap.set(kw, existing)
    })
  }

  return Array.from(topicMap.entries())
    .map(([topic, data]) => {
      const avgViews = data.totalViews / data.count
      const opportunityScore = Math.min(
        100,
        Math.round((avgViews / 100000) * 40 + (1 / data.count) * 60)
      )
      return {
        topic,
        searchVolume: data.count,
        competitionScore: Math.min(100, data.count * 3),
        opportunityScore,
        source: 'youtube_trending' as const,
      }
    })
    .sort((a, b) => b.opportunityScore - a.opportunityScore)
    .slice(0, 20)
}

// ─── Simple keyword extractor ─────────────────────────────────────────────────

const STOP_WORDS = new Set([
  'the','is','at','which','on','and','a','an','as','are','was','were',
  'been','be','have','has','had','do','does','did','will','would','could',
  'should','may','might','must','can','i','you','he','she','it','we','they',
  'what','who','when','where','why','how','all','each','every','both','few',
  'more','most','other','some','such','no','not','only','own','same','so',
  'than','too','very','just','now','in','of','to','for','with','from','by',
  'about','into','through','during','before','after','above','below','up',
  'down','out','off','over','under','this','that','these','those','my','your',
])

export function extractKeywords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter((w) => w.length > 3 && !STOP_WORDS.has(w))
}

// ─── Check if YouTube API is configured ──────────────────────────────────────

export function isYouTubeConfigured(): boolean {
  return Boolean(process.env.YOUTUBE_API_KEY)
}

// ─── Fallback topics when API not configured ─────────────────────────────────

export function getFallbackTopics(niche: string): TrendingTopic[] {
  const templates = [
    `${niche} for beginners`,
    `how to make money with ${niche}`,
    `${niche} mistakes to avoid`,
    `${niche} strategy 2025`,
    `${niche} explained simply`,
  ]

  return templates.map((topic, i) => ({
    topic,
    searchVolume: 50 - i * 5,
    competitionScore: 40 + i * 5,
    opportunityScore: 75 - i * 5,
    source: 'youtube_search' as const,
  }))
}
