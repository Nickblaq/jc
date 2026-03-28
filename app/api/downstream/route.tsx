
import { NextRequest, NextResponse } from 'next/server';
import { Innertube } from 'youtubei.js';

export async function GET(request: NextRequest) {
  try {

    const videoId = req.nextUrl.searchParams.get('id')?.trim()
  const type    = (req.nextUrl.searchParams.get('type') || 'video+audio') as 'video+audio' | 'video' | 'audio'
  const quality = req.nextUrl.searchParams.get('quality') || 'best'

  if (!videoId) {
    return new Response(JSON.stringify({ error: 'Missing video ID' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

    // Create YouTube client
    const youtube = await Innertube.create();
    
    // Get video info
    const video = await youtube.getInfo(videoId);
    
    // Check if video is playable
    if (!video.streaming_data) {
      throw new Error('Streaming data not available for this video');
    }

    // Get video title for filename (sanitize)
    const filename = video.basic_info.title?.replace(/[^\w\s]/gi, '') || 'video';
    
    // Set download options
    const downloadOptions = {
      quality: 'best',           // or '1080p', '720p', etc.
      type: 'video+audio',       // combined format
      format: 'mp4',             // preferred container
    };
    
    // Get the readable stream using YouTube.js
    const stream = await youtube.download(
      videoId,
      downloadOptions
    );
    
    // Convert ReadableStream to Node.js Readable for Next.js response
    const nodeStream = await streamToNodeStream(stream);
    
    // Return stream response with download headers
    return new NextResponse(nodeStream as any, {
      headers: {
        'Content-Disposition': `attachment; filename="${filename}.mp4"`,
        'Content-Type': 'video/mp4',
      },
    });
    
  } catch (error) {
    console.error('Download error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to download video' },
      { status: 500 }
    );
  }
}

// Helper: Extract video ID from YouTube URL
function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /youtube\.com\/watch\?.*v=([^&\n?#]+)/
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

// Helper: Convert Web ReadableStream to Node.js Readable
async function streamToNodeStream(webStream: ReadableStream<Uint8Array>): Promise<Readable> {
  const { Readable } = await import('stream');
  
  const reader = webStream.getReader();
  
  return new Readable({
    async read() {
      try {
        const { done, value } = await reader.read();
        if (done) {
          this.push(null);
        } else {
          this.push(Buffer.from(value));
        }
      } catch (error) {
        this.destroy(error as Error);
      }
    },
    async destroy(error, callback) {
      await reader.cancel();
      callback(error);
    }
  });
}
