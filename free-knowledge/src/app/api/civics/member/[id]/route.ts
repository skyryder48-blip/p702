// GET /api/civics/member/[id]
// Returns member details + sponsored bills from Congress.gov

import { NextRequest, NextResponse } from 'next/server';
import { getOrchestrator } from '@/lib/orchestrator';
import { getCachedProfile, setCachedProfile } from '@/lib/db';
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
    // Check PostgreSQL cache
    try {
      const cached = await getCachedProfile(bioguideId);
      if (cached) {
        return NextResponse.json(cached);
      }
    } catch {
      // DB not available
    }

    const { member, bills } = await getOrchestrator().getMemberProfile(bioguideId);

    // Also fetch biography data
    let biography = null;
    let wikidataFacts = null;
    try {
      const bio = await getOrchestrator().getMemberBiography(member.name);
      biography = bio.wikipedia;
      wikidataFacts = bio.wikidata;
    } catch {
      // Biography fetch failure is non-fatal
    }

    const result = { member, bills, biography, wikidataFacts };

    // Cache for 30 minutes
    try {
      await setCachedProfile(bioguideId, member.name, result, 30);
    } catch {
      // Cache write failure is non-fatal
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('[API:civics/member] Error:', error);
    return NextResponse.json(
      { error: error.message ?? 'Failed to fetch member data' },
      { status: 500 }
    );
  }
}
