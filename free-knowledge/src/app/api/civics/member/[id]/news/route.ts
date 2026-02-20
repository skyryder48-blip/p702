// GET /api/civics/member/[id]/news
// Returns recent news articles about the official

import { NextRequest, NextResponse } from 'next/server';
import { getOrchestrator } from '@/lib/orchestrator';
import { checkRateLimit, getRateLimitKey } from '@/core/auth/rate-limit';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const bioguideId = params.id;

  if (!bioguideId || !/^[A-Z]\d{6}$/.test(bioguideId)) {
    return NextResponse.json(
      { error: 'Invalid bioguide ID format. Expected pattern: A000000' },
      { status: 400 }
    );
  }

  // Rate limit check
  const rateKey = getRateLimitKey(request);
  const rateResult = checkRateLimit(rateKey, 'free');
  if (!rateResult.allowed) {
    return NextResponse.json(
      { error: 'Rate limit exceeded. Please try again later.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(Math.ceil((rateResult.retryAfterMs ?? 60000) / 1000)),
        },
      }
    );
  }

  try {
    const name = request.nextUrl.searchParams.get('name');
    if (!name) {
      return NextResponse.json(
        { error: 'Missing required "name" query parameter' },
        { status: 400 }
      );
    }

    const limit = Math.min(parseInt(request.nextUrl.searchParams.get('limit') ?? '5', 10), 20);
    const articles = await getOrchestrator().getMemberNews(name, limit);

    return NextResponse.json({ bioguideId, articles });
  } catch (error: any) {
    console.error('[API:civics/member/news] Error:', error);
    return NextResponse.json(
      { error: error.message ?? 'Failed to fetch news articles' },
      { status: 500 }
    );
  }
}
