// GET /api/civics/member/[id]/metrics
// Returns scorecard metrics with chamber benchmarks

import { NextRequest, NextResponse } from 'next/server';
import { getOrchestrator } from '@/lib/orchestrator';
import { checkRateLimit, getRateLimitKey } from '@/core/auth/rate-limit';
import { ScorecardEngine } from '@/engines/scorecard/index';
import { getRequestTier } from '@/lib/api-auth';
import { requireFeature } from '@/core/auth/middleware';
import { getCached, setCache } from '@/lib/cache';
import { trackUsage } from '@/lib/db';

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

  // Feature gate — metrics is premium only
  const denied = requireFeature('metrics.scorecard', tier);
  if (denied) {
    return NextResponse.json({ error: denied.error }, { status: denied.status });
  }

  try {
    const chamber = (request.nextUrl.searchParams.get('chamber') as 'house' | 'senate') ?? 'house';
    const cacheKey = `metrics:${bioguideId}:${chamber}`;
    const cached = getCached<any>(cacheKey);
    if (cached) return NextResponse.json(cached);

    const orchestrator = getOrchestrator();

    // Fetch member + votes + committees in parallel
    const [profileResult, votesResult, committeesResult] = await Promise.allSettled([
      orchestrator.getMemberProfile(bioguideId),
      orchestrator.getMemberVotes(bioguideId, chamber, 50),
      orchestrator.getMemberCommittees(bioguideId),
    ]);

    if (profileResult.status !== 'fulfilled') {
      throw new Error('Failed to fetch member profile');
    }

    const { member } = profileResult.value;
    const votes = votesResult.status === 'fulfilled' ? votesResult.value : [];
    const committees = committeesResult.status === 'fulfilled' ? committeesResult.value : [];

    // Compute vote stats
    let votesWithParty = 0;
    let votesAgainstParty = 0;
    let missedVotes = 0;
    const totalVotes = votes.length;

    for (const v of votes) {
      if (v.memberPosition === 'Not Voting') {
        missedVotes++;
        continue;
      }
      // Determine majority position of member's party
      const partyKey = member.party.toLowerCase().includes('democrat') ? 'democratic' : 'republican';
      const partyVotes = v.partyBreakdown[partyKey];
      if (partyVotes) {
        const partyMajority = partyVotes.yea > partyVotes.nay ? 'Yea' : 'Nay';
        if (v.memberPosition === partyMajority) {
          votesWithParty++;
        } else {
          votesAgainstParty++;
        }
      }
    }

    const engine = new ScorecardEngine();
    const scorecard = engine.generate({
      bioguideId: member.bioguideId,
      name: member.name,
      chamber: member.chamber,
      sponsoredCount: member.sponsoredCount,
      cosponsoredCount: member.cosponsoredCount,
      votesWithParty,
      votesAgainstParty,
      missedVotes,
      totalVotes,
      committeeMemberships: committees.length + committees.reduce((sum, c) => sum + (c.subcommittees?.length ?? 0), 0),
    });

    setCache(cacheKey, scorecard, 'metrics');
    trackUsage({ feature: 'metrics.view', tier, action: 'view' }).catch(() => {});
    return NextResponse.json(scorecard);
  } catch (error: any) {
    console.error('[API:civics/member/metrics] Error:', error);
    return NextResponse.json(
      { error: error.message ?? 'Failed to generate metrics' },
      { status: 500 }
    );
  }
}
