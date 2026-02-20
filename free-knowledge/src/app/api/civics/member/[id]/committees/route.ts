// GET /api/civics/member/[id]/committees
// Returns committee and subcommittee memberships

import { NextRequest, NextResponse } from 'next/server';
import { getOrchestrator } from '@/lib/orchestrator';
import { checkRateLimit, getRateLimitKey } from '@/core/auth/rate-limit';
import { getRequestTier } from '@/lib/api-auth';
import { getCached, setCache } from '@/lib/cache';

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

  // Rate limit check (tier-aware)
  const { tier, userId } = await getRequestTier(request);
  const rateKey = userId ? `user:${userId}` : getRateLimitKey(request);
  const rateResult = checkRateLimit(rateKey, tier);
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
    const cacheKey = `committees:${bioguideId}`;
    const cached = getCached<any>(cacheKey);
    if (cached) return NextResponse.json(cached);

    const committees = await getOrchestrator().getMemberCommittees(bioguideId);
    const response = { bioguideId, committees };
    setCache(cacheKey, response, 'committees');

    return NextResponse.json(response);
  } catch (error: any) {
    console.error('[API:civics/member/committees] Error:', error);
    return NextResponse.json(
      { error: error.message ?? 'Failed to fetch committee assignments' },
      { status: 500 }
    );
  }
}
