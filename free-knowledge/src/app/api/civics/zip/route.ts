// GET /api/civics/zip?code=60188
// Returns representatives for a zip code via Google Civic Info API

import { NextRequest, NextResponse } from 'next/server';
import { getOrchestrator } from '@/lib/orchestrator';
import { getCachedZipLookup, setCachedZipLookup } from '@/lib/db';
import { checkRateLimit, getRateLimitKey } from '@/core/auth/rate-limit';

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');

  if (!code || !/^\d{5}(-\d{4})?$/.test(code)) {
    return NextResponse.json(
      { error: 'Invalid zip code. Use 5-digit format (e.g., 60188)' },
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
          'X-RateLimit-Limit': String(rateResult.limit),
          'X-RateLimit-Remaining': '0',
        },
      }
    );
  }

  try {
    // Check PostgreSQL cache first
    try {
      const cached = await getCachedZipLookup(code);
      if (cached) {
        return NextResponse.json(cached);
      }
    } catch {
      // DB not available — proceed without cache
    }

    const result = await getOrchestrator().lookupByZipCode(code);

    // Cache in PostgreSQL
    try {
      await setCachedZipLookup(code, result.state, '', result, 24);
    } catch {
      // Cache write failure is non-fatal
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('[API:civics/zip] Error:', error);
    return NextResponse.json(
      { error: error.message ?? 'Failed to look up zip code' },
      { status: 500 }
    );
  }
}
