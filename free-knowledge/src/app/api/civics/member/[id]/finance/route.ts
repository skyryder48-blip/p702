// GET /api/civics/member/[id]/finance?name=Sean+Casten
// Returns FEC campaign finance data

import { NextRequest, NextResponse } from 'next/server';
import { getOrchestrator } from '@/lib/orchestrator';
import { checkRateLimit, getRateLimitKey } from '@/core/auth/rate-limit';

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

  // Rate limit check
  const rateKey = getRateLimitKey(request);
  const rateResult = checkRateLimit(rateKey, 'free');
  if (!rateResult.allowed) {
    return NextResponse.json(
      { error: 'Rate limit exceeded. Please try again later.' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil((rateResult.retryAfterMs ?? 60000) / 1000)) } }
    );
  }

  try {
    const result = await getOrchestrator().getMemberFinance(bioguideId, name);

    return NextResponse.json({
      bioguideId,
      ...result,
    });
  } catch (error: any) {
    console.error('[API:civics/member/finance] Error:', error);
    return NextResponse.json(
      { error: error.message ?? 'Failed to fetch finance data' },
      { status: 500 }
    );
  }
}
