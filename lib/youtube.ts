import { Innertube } from 'youtubei.js';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';
import fs from 'fs/promises';
import path from 'path';

ffmpeg.setFfmpegPath(ffmpegStatic as string);

const CHANNEL_ID = 'UCxxxxxx'; // Replace with actual channel ID

let youtube: Innertube | null = null;

async function getClient() {
  if (!youtube) {
    youtube = await Innertube.create();
  }
  return youtube;
}

export async function getTopShorts() {
  const client = await getClient();
  const channel = await client.getChannel(CHANNEL_ID);
  
  const videos = [];
  for await (const video of channel.getVideos()) {
    if (video.isShort() && videos.length < 5) {
      videos.push({
        id: video.id,
        title: video.title,
        thumbnail: video.thumbnails[0]?.url,
        duration: video.duration,
        viewCount: video.view_count
      });
    }
    if (videos.length >= 5) break;
  }
  
  return videos;
}

export async function getTranscript(videoId: string) {
  const client = await getClient();
  const info = await client.getInfo(videoId);
  const captions = await info.getCaptions();
  
  if (!captions) return [];
  
  const transcript = await captions.getTranscript();
  return transcript.content.map(item => ({
    text: item.text,
    start: item.start,
    duration: item.duration
  }));
}

export async function downloadVideo(videoId: string): Promise<string> {
  const client = await getClient();
  const info = await client.getInfo(videoId);
  const format = info.streamingInfo.formats.find(f => f.hasVideo && f.hasAudio);
  
  if (!format) throw new Error('No compatible format found');
  
  const url = format.decipher(client.session);
  const response = await fetch(url);
  const buffer = Buffer.from(await response.arrayBuffer());
  
  const outputPath = path.join(process.cwd(), 'data', `${videoId}.mp4`);
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, buffer);
  
  return outputPath;
}

export async function cutVideo(
  videoPath: string,
  startTime: number,
  endTime: number,
  outputPath: string
): Promise<string> {
  return new Promise((resolve, reject) => {
    ffmpeg(videoPath)
      .outputOptions([
        `-ss ${startTime}`,
        `-to ${endTime}`,
        '-c copy'
      ])
      .output(outputPath)
      .on('end', () => resolve(outputPath))
      .on('error', reject)
      .run();
  });
}

export async function cleanupFile(filePath: string) {
  try {
    await fs.unlink(filePath);
  } catch (error) {
    console.error('Cleanup failed:', error);
  }
}
