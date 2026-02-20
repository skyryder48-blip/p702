// GET /api/civics/member/[id]/votes
// Returns recent roll call votes with the member's position

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
    const chamber = (request.nextUrl.searchParams.get('chamber') as 'house' | 'senate') ?? 'house';
    const limit = Math.min(parseInt(request.nextUrl.searchParams.get('limit') ?? '20', 10), 50);

    const votes = await getOrchestrator().getMemberVotes(bioguideId, chamber, limit);

    return NextResponse.json({ bioguideId, votes });
  } catch (error: any) {
    console.error('[API:civics/member/votes] Error:', error);
    return NextResponse.json(
      { error: error.message ?? 'Failed to fetch voting record' },
      { status: 500 }
    );
  }
}
