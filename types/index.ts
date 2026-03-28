
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

export type SortType = 'popular' | 'latest';
