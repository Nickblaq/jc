
// lib/youtube.ts
import { Innertube } from 'youtubei.js';

export async function getLatestShorts(channelQuery: string) {
  const yt = await Innertube.create();

  // 1. Search for the channel
  const search = await yt.search(channelQuery, { type: 'channel' });

  const channel = search.results[0];
  if (!channel) throw new Error('Channel not found');

  // 2. Go to channel
  const channelPage = await yt.getChannel(channel.id);

  // 3. Get Shorts tab
  const shortsTab = channelPage.tabs.find(tab => tab.title === 'Shorts');

  if (!shortsTab) {
    return [];
  }

  const shortsPage = await shortsTab.endpoint.call(yt);

  // 4. Extract videos
  const shorts =
    shortsPage.contents
      ?.filter((item: any) => item.type === 'ShortsVideo') || [];

  // 5. Return top 5 latest
  return shorts.slice(0, 5).map((video: any) => ({
    id: video.id,
    title: video.title?.text,
    thumbnail: video.thumbnails?.[0]?.url,
    views: video.view_count?.text
  }));
}
