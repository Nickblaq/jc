
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

export interface AgentInput {
  topic: string
  channelNiche: string
  targetAudience: string
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
