// GET /api/civics/issues?official=BIOGUIDE&issue=healthcare
// Returns issue-specific report for an official

import { NextRequest, NextResponse } from 'next/server';
import { getOrchestrator } from '@/lib/orchestrator';
import { checkRateLimit, getRateLimitKey } from '@/core/auth/rate-limit';
import { IssuesEngine } from '@/engines/issues/index';
import { getRequestTier } from '@/lib/api-auth';
import { requireFeature } from '@/core/auth/middleware';
import type { IssueCategoryId } from '@/config/profiles';

const VALID_ISSUES = [
  'healthcare', 'economy', 'education', 'environment', 'defense',
  'immigration', 'civil-rights', 'taxation', 'infrastructure',
  'technology', 'agriculture', 'foreign-policy',
];

export async function GET(request: NextRequest) {
  const officialId = request.nextUrl.searchParams.get('official');
  const issueId = request.nextUrl.searchParams.get('issue');

  if (!officialId || !/^[A-Z]\d{6}$/.test(officialId)) {
    return NextResponse.json(
      { error: 'Invalid or missing "official" bioguide ID parameter' },
      { status: 400 }
    );
  }

  if (!issueId || !VALID_ISSUES.includes(issueId)) {
    return NextResponse.json(
      { error: `Invalid issue. Valid issues: ${VALID_ISSUES.join(', ')}` },
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

  // Feature gate — issue reports are premium only
  const denied = requireFeature('issues.report', tier);
  if (denied) {
    return NextResponse.json({ error: denied.error }, { status: denied.status });
  }

  try {
    const orchestrator = getOrchestrator();

    // Fetch member profile + votes in parallel
    const [profileResult, votesResult] = await Promise.allSettled([
      orchestrator.getMemberProfile(officialId),
      orchestrator.getMemberVotes(
        officialId,
        (request.nextUrl.searchParams.get('chamber') as 'house' | 'senate') ?? 'house',
        50
      ),
    ]);

    if (profileResult.status !== 'fulfilled') {
      throw new Error('Failed to fetch member profile');
    }

    const { member, bills } = profileResult.value;
    const votes = votesResult.status === 'fulfilled' ? votesResult.value : [];

    const engine = new IssuesEngine();
    const report = engine.generateReport(
      member.name,
      issueId as IssueCategoryId,
      bills,
      votes,
    );

    return NextResponse.json(report);
  } catch (error: any) {
    console.error('[API:civics/issues] Error:', error);
    return NextResponse.json(
      { error: error.message ?? 'Failed to generate issue report' },
      { status: 500 }
    );
  }
}
