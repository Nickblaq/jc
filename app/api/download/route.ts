import { NextRequest, NextResponse } from 'next/server';
import { Innertube } from 'youtubei.js';

export async function GET(request: NextRequest) {
  try {
    const videoId = request.nextUrl.searchParams.get('id')?.trim();
    
    if (!videoId) {
      return NextResponse.json(
        { error: 'Video ID is required' },
        { status: 400 }
      );
    }

    // Validate video ID format (11 characters, alphanumeric with underscores/dashes)
    if (!/^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
      return NextResponse.json(
        { error: 'Invalid video ID format' },
        { status: 400 }
      );
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
      quality: 'best',
      type: 'video+audio',
      format: 'mp4',
    };
    
    // Get the readable stream using YouTube.js
    const stream = await youtube.download(videoId);
    
    // Return stream response with download headers
    return new NextResponse(stream as any, {
      headers: {
        'Content-Disposition': `attachment; filename="${filename}.mp4"`,
        'Content-Type': 'video/mp4',
        'Cache-Control':       'no-store',
        'X-Video-Title':       filename,
        'X-Video-Id':          videoId,
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

// Helper: Convert Web ReadableStream to Node.js 
