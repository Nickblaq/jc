
import { NextRequest, NextResponse } from 'next/server';
import { searchChannel } from '@/lib/youtubeClient';

export async function GET(request: NextRequest) {
  try {
    const query = request.nextUrl.searchParams.get('q');
    
    if (!query) {
      return NextResponse.json(
        { error: 'Query parameter is required' },
        { status: 400 }
      );
    }
    
    const channel = await searchChannel(query);
    return NextResponse.json(channel);
  } catch (error) {
    console.error('Error searching channel:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to search channel' },
      { status: 500 }
    );
  }
}
