
import { NextRequest, NextResponse } from 'next/server';
import { getChannelVideos } from '@/lib/youtubeClient';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sort = request.nextUrl.searchParams.get('sort') as 'popular' | 'latest' || 'popular';
    const videos = await getChannelVideos(params.id, sort);
    return NextResponse.json(videos);
  } catch (error) {
    console.error('Error fetching videos:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch videos' },
      { status: 500 }
    );
  }
}
