import { Innertube } from 'youtubei.js';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import ffmpegStatic from 'ffmpeg-static';

const execAsync = promisify(exec);
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
  
  // FIX 1: Await the videos object first, then iterate
  const videosObject = await channel.getVideos();
  
  const videos = [];
  for await (const video of videosObject) {
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
  const format = info.streamingInfo?.formats?.find(f => f.hasVideo && f.hasAudio);
  
  if (!format) throw new Error('No compatible format found');
  
  const url = format.decipher(client.session);
  const response = await fetch(url);
  const buffer = Buffer.from(await response.arrayBuffer());
  
  const outputPath = path.join(process.cwd(), 'data', `${videoId}.mp4`);
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, buffer);
  
  return outputPath;
}

// FIX 2: Use exec with ffmpeg-static binary path (no fluent-ffmpeg)
export async function cutVideo(
  videoPath: string,
  startTime: number,
  endTime: number,
  outputPath: string
): Promise<string> {
  const ffmpegPath = ffmpegStatic as string;
  const command = `${ffmpegPath} -i "${videoPath}" -ss ${startTime} -to ${endTime} -c copy "${outputPath}" -y`;
  
  await execAsync(command);
  return outputPath;
}

export async function cleanupFile(filePath: string) {
  try {
    await fs.unlink(filePath);
  } catch (error) {
    console.error('Cleanup failed:', error);
  }
}
