// GET /api/civics/compare?a=BIOGUIDE1&b=BIOGUIDE2
// Returns side-by-side comparison of two officials

import { NextRequest, NextResponse } from 'next/server';
import { getOrchestrator } from '@/lib/orchestrator';
import { checkRateLimit, getRateLimitKey } from '@/core/auth/rate-limit';
import { CompareEngine } from '@/engines/compare/index';
import { getRequestTier } from '@/lib/api-auth';
import { requireFeature } from '@/core/auth/middleware';
import { getCached, setCache } from '@/lib/cache';
import { trackUsage } from '@/lib/db';

export async function GET(request: NextRequest) {
  const a = request.nextUrl.searchParams.get('a');
  const b = request.nextUrl.searchParams.get('b');

  if (!a || !b || !/^[A-Z]\d{6}$/.test(a) || !/^[A-Z]\d{6}$/.test(b)) {
    return NextResponse.json(
      { error: 'Two valid bioguide IDs required (params: a, b). Expected pattern: A000000' },
      { status: 400 }
    );
  }

  if (a === b) {
    return NextResponse.json(
      { error: 'Cannot compare an official with themselves' },
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

  // Feature gate — compare is premium only
  const denied = requireFeature('compare.side_by_side', tier);
  if (denied) {
    return NextResponse.json({ error: denied.error }, { status: denied.status });
  }

  try {
    const cacheKey = `compare:${[a, b].sort().join(':')}`;
    const cached = getCached<any>(cacheKey);
    if (cached) return NextResponse.json(cached);

    const orchestrator = getOrchestrator();

    // Fetch both full profiles in parallel
    const [profile1, profile2] = await Promise.all([
      orchestrator.getFullProfile(a),
      orchestrator.getFullProfile(b),
    ]);

    const engine = new CompareEngine();
    const comparison = engine.compare(profile1, profile2);
    setCache(cacheKey, comparison, 'compare');
    trackUsage({ feature: 'compare.view', tier, action: 'view' }).catch(() => {});

    return NextResponse.json(comparison);
  } catch (error: any) {
    console.error('[API:civics/compare] Error:', error);
    return NextResponse.json(
      { error: error.message ?? 'Failed to compare officials' },
      { status: 500 }
    );
  }
}
