// GET /api/civics/member/[id]/finance?name=Sean+Casten
// Returns FEC campaign finance data

import { NextRequest, NextResponse } from 'next/server';
import { getOrchestrator } from '@/lib/orchestrator';
import { checkRateLimit, getRateLimitKey } from '@/core/auth/rate-limit';
import { getRequestTier } from '@/lib/api-auth';
import { requireFeature } from '@/core/auth/middleware';
import { getCached, setCache } from '@/lib/cache';
import { trackUsage } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const bioguideId = params.id;
  const name = request.nextUrl.searchParams.get('name');

  if (!bioguideId || !name) {
    return NextResponse.json(
      { error: 'Both bioguide ID and name are required' },
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
      { status: 429, headers: { 'Retry-After': String(Math.ceil((rateResult.retryAfterMs ?? 60000) / 1000)) } }
    );
  }

  // Feature gate — finance is premium only
  const denied = requireFeature('finance.summary', tier);
  if (denied) {
    return NextResponse.json({ error: denied.error }, { status: denied.status });
  }

  try {
    const cacheKey = `finance:${bioguideId}`;
    const cached = getCached<any>(cacheKey);
    if (cached) return NextResponse.json(cached);

    const result = await getOrchestrator().getMemberFinance(bioguideId, name);
    const response = { bioguideId, ...result };
    setCache(cacheKey, response, 'finance');
    trackUsage({ feature: 'finance.view', tier, action: 'view' }).catch(() => {});

    return NextResponse.json(response);
  } catch (error: any) {
    console.error('[API:civics/member/finance] Error:', error);
    return NextResponse.json(
      { error: error.message ?? 'Failed to fetch finance data' },
      { status: 500 }
    );
  }
}
