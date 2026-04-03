

// app/api/shorts/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getLatestShorts } from '@/lib/youtube';

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get('q');

  if (!query) {
    return NextResponse.json({ error: 'Missing query' }, { status: 400 });
  }

  try {
    const shorts = await getLatestShorts(query);
    return NextResponse.json(shorts);
  } catch (err) {
    return NextResponse.json({ error: 'Failed to fetch shorts' }, { status: 500 });
  }
}
