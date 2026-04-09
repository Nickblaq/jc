
// ─── Types ────────────────────────────────────────────────────────────────────

export interface VideoItem {
  id: string
  title: string
  viewCount: string
  viewCountRaw: number
  publishedTime: string
  duration: string
  thumbnail: string
  url: string
}

export interface ChannelResult {
  channelId: string
  channelName: string
  channelHandle: string
  subscriberCount: string
  channelThumbnail: string
  channelBanner: string
  videos: VideoItem[]
}

export interface ShortItem {
  id: string
  title: string
  thumbnail: string
  views: string
  viewRaw?: number
  url: string
  duration?: string
}

export interface ShortResult {
  channelId: string
  channelName: string
  channelHandle: string
  subscriberCount: string
  channelThumbnail: string
  channelBanner: string
  shorts: ShortItem[]
}

export type SortType = 'popular' | 'latest';

// ─── Channel & Channel Config ────────────────────────────────────────────────

export interface ChannelConfig {
  name: string
  niche: string
  targetAudience: string
  region: string
  social?: 'youtube'  |  'tiktok'
}

// ─── Strategy ────────────────────────────────────────────────────────────────

export interface TrendingTopic {
  topic: string
  searchVolume: number
  competitionScore: number // 0–100, lower = less competition
  opportunityScore: number // 0–100, higher = better
  source: 'youtube_trending' | 'youtube_search' | 'manual'
}

export interface ContentStrategy {
  id: string
  topic: string
  angle: string
  targetAudience: string
  contentType: 'Tutorial' | 'Explainer' | 'List' | 'Review' | 'Story' | 'News'
  keywords: string[]
  estimatedViews: number
  bestPublishTime: string
  trendData?: TrendingTopic
  createdAt: string
}

// ─── Script ──────────────────────────────────────────────────────────────────

export interface ScriptSection {
  title: string
  content: string
  durationSeconds: number
  visualNote?: string // what to show on screen
}

export interface Script {
  id: string
  strategyId: string
  title: string
  hook: string
  introduction: string
  sections: ScriptSection[]
  conclusion: string
  callToAction: string
  totalDurationSeconds: number
  wordCount: number
  ttsText: string // cleaned for TTS generation
  createdAt: string
}

// ─── SEO Package ─────────────────────────────────────────────────────────────

export interface Chapter {
  timestamp: string
  title: string
  seconds: number
}

export interface YouTubeSEO {
  id: string
  scriptId: string
  titles: string[]          // 5 variations
  selectedTitle: string
  description: string
  tags: string[]            // up to 15, ranked
  hashtags: string[]
  chapters: Chapter[]
  thumbnailCopy: { primary: string; secondary: string }[]
  seoScore: number          // 0–100
  insights: string[]
  categoryId: number
  createdAt: string
}

// ─── TikTok Package ──────────────────────────────────────────────────────────

export interface TikTokClip {
  startSeconds: number
  endSeconds: number
  timeLabel: string
  note: string
  hookPotential: number // 0–100
}

export interface TikTokPackage {
  id: string
  scriptId: string
  hooks: string[]           // 3 punchy opening lines
  captions: string[]        // 3 caption variations with CTA
  hashtags: string[]        // 5 ranked hashtags
  clipTimestamps: TikTokClip[]
  viralityScore: number     // 0–100
  insights: string[]
  createdAt: string
}

// ─── Thumbnail ───────────────────────────────────────────────────────────────

export interface ThumbnailConcept {
  primaryText: string
  secondaryText: string
  style: string
  colorScheme: { primary: string; secondary: string; accent: string }
  emotion: string
  composition: string
}

export interface Thumbnail {
  id: string
  scriptId: string
  concept: ThumbnailConcept
  imagePath?: string        // set once generated
  imageUrl?: string         // set once generated
  dimensions: { width: number; height: number }
  generatedWith?: string    // 'ideogram' | 'replicate' | 'placeholder'
  createdAt: string
}

// ─── Media Assets (Phase 2+) ─────────────────────────────────────────────────

export interface AudioAsset {
  id: string
  scriptId: string
  filePath: string
  durationSeconds: number
  provider: 'google_tts' | 'elevenlabs' | 'openai' | 'simulated'
  voiceId?: string
  createdAt: string
}

export interface VisualAsset {
  id: string
  scriptId: string
  sectionIndex: number
  filePath: string
  prompt: string
  provider: 'replicate_flux' | 'ideogram' | 'dalle3' | 'simulated'
  createdAt: string
}

export interface VideoAsset {
  id: string
  productionId: string
  filePath: string
  durationSeconds: number
  resolution: string
  format: string
  hasAudio: boolean
  hasCaptions: boolean
  fileSize: number
  createdAt: string
}

// ─── Production ──────────────────────────────────────────────────────────────

export type ProductionStatus =
  | 'pending'
  | 'generating_script'
  | 'generating_seo'
  | 'generating_tiktok'
  | 'generating_audio'
  | 'generating_visuals'
  | 'assembling_video'
  | 'ready'
  | 'scheduled'
  | 'published'
  | 'failed'

export interface Production {
  id: string
  strategyId: string
  scriptId?: string
  seoId?: string
  tiktokId?: string
  thumbnailId?: string
  audioId?: string
  videoId?: string
  status: ProductionStatus
  statusMessage?: string
  scheduledPublishTime?: string
  youtubeVideoId?: string
  youtubeUrl?: string
  tiktokVideoId?: string
  tiktokUrl?: string
  priority: number
  createdAt: string
  updatedAt: string
}

// ─── Analytics ───────────────────────────────────────────────────────────────

export interface VideoAnalytics {
  id: string
  productionId: string
  youtubeVideoId?: string
  views: number
  impressions: number
  ctr: number               // click-through rate %
  averageViewDuration: number
  averageViewPercentage: number
  likes: number
  comments: number
  engagementRate: number
  performanceScore: number  // 0–100 composite
  performanceGrade: string  // A+, A, B, C, D, F
  analyzedAt: string
}

// ─── Agent Pipeline ──────────────────────────────────────────────────────────
export interface PipelineStage {
  name: string
  status: 'pending' | 'running' | 'complete' | 'error'
  durationMs?: number
  error?: string
}

export interface PipelineResult {
  productionId: string
  strategy: ContentStrategy
  script: Script
  seo: YouTubeSEO
  tiktok: TikTokPackage
  thumbnail: Thumbnail
  stages: PipelineStage[]
  totalDurationMs: number
}

export interface AgentInput {
  topic: string
  niche: string
  targetAudience: string
  channelConfig?: ChannelConfig
}

export interface AgentOutput {
  titles: string[]
  description: string
  tags: string[]
  hooks: string[]
  thumbnailCopy: { primary: string; secondary: string }[]
  seoScore: number
  insights: string[]
}


export interface ChannelInfo {
  id: string;
  name: string;
  handle?: string;
  avatar?: string;
  subscriberCount?: string;
  description?: string;
}

export interface Video {
  id: string;
  title: string;
  thumbnail: string;
  viewCount: string;
  publishedAt: string;
  duration?: string;
  channelName: string;
  channelId: string;
  url: string;
  downloadUrl?: string; // Optional: pre-fetched download URL
}

export interface VideoMeta {
  filename: string
  publicPath: string
  duration: number
  width: number
  height: number
  fps: number
  size: number
}

export interface CTASlide {
  id: string
  position: 'before' | 'after'
  text: string
  subtext: string
  duration: number
  bgColor: string
  textColor: string
  accentColor: string
}

export interface ProcessJob {
  filename: string
  trimStart: number
  trimEnd: number
  slides: CTASlide[]
  muteOriginalAudio: boolean
  addFadeIn: boolean
  addFadeOut: boolean
}

export interface ProcessResult {
  publicPath: string
  filename: string
  duration: number
}

// ─── API Response shapes ─────────────────────────────────────────────────────

export interface ApiSuccess<T> {
  success: true
  data: T
}

export interface ApiError {
  success: false
  error: string
  code?: string
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError
