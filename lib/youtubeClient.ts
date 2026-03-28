import { Innertube, UniversalCache } from 'youtubei.js';

let youtubeInstance: Innertube | null = null;

export async function getYouTubeClient() {
  if (!youtubeInstance) {
    youtubeInstance = await Innertube.create({
      cache: new UniversalCache(true), // Enable caching
    });
  }
  return youtubeInstance;
}

export async function searchChannel(query: string) {
  const youtube = await getYouTubeClient();
  
  // Search for channel
  const searchResults = await youtube.search(query, {
    type: 'channel',
  });
  
  if (!searchResults.channels || searchResults.channels.length === 0) {
    throw new Error('No channel found');
  }
  
  const channel = searchResults.channels[0];
  
  return {
    id: channel.id,
    name: channel.title || channel.name || '',
    handle: channel.author?.channel_handle || channel.handle || '',
    avatar: channel.thumbnails?.[0]?.url || '',
    subscriberCount: channel.subscribers || channel.subscriber_count,
    description: channel.description || '',
  };
}

export async function getChannelVideos(channelId: string, sort: 'popular' | 'latest' = 'popular') {
  const youtube = await getYouTubeClient();
  
  // Get channel info with videos
  const channel = await youtube.getChannel(channelId);
  
  let videos: any[] = [];
  
  if (sort === 'popular') {
    // Get most popular videos (usually in the 'Popular' section)
    const popularTab = channel.tabs?.find(tab => tab.name === 'Popular' || tab.title === 'Popular');
    if (popularTab && popularTab.content) {
      videos = popularTab.content.contents || [];
    }
  } else {
    // Get latest videos
    const videosTab = channel.tabs?.find(tab => tab.name === 'Videos' || tab.title === 'Videos');
    if (videosTab && videosTab.content) {
      videos = videosTab.content.contents || [];
    }
  }
  
  // If no videos found through tabs, try alternative method
  if (videos.length === 0) {
    const allVideos = await channel.getVideos();
    videos = allVideos.contents || [];
  }
  
  // Format and limit to 5 videos
  return videos.slice(0, 5).map((video: any) => ({
    id: video.id || video.video_id,
    title: video.title || video.name,
    thumbnail: video.thumbnails?.[0]?.url || video.thumbnail?.url || '',
    viewCount: video.view_count ? formatNumber(video.view_count) : 'N/A',
    publishedAt: video.published_at ? formatDate(video.published_at) : '',
    duration: video.duration || '',
    channelName: video.author?.name || '',
    channelId: video.author?.id || '',
    url: `https://www.youtube.com/watch?v=${video.id || video.video_id}`,
  }));
}

function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
}

function formatDate(date: string | Date): string {
  const d = new Date(date);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
  return `${Math.floor(diffDays / 365)} years ago`;
}
