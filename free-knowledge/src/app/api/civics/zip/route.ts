// GET /api/civics/zip?code=60188
// Returns representatives for a zip code
// Primary: Google Civic Info API, Fallback: Congress.gov API

import { NextRequest, NextResponse } from 'next/server';
import { getOrchestrator } from '@/lib/orchestrator';
import { getCachedZipLookup, setCachedZipLookup } from '@/lib/db';
import { checkRateLimit, getRateLimitKey } from '@/core/auth/rate-limit';
import { getRequestTier } from '@/lib/api-auth';
import { zipToState } from '@/core/adapters/government/zip-to-state';
import { CongressAdapter } from '@/core/adapters/government/congress';

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');

  if (!code || !/^\d{5}(-\d{4})?$/.test(code)) {
    return NextResponse.json(
      { error: 'Invalid zip code. Use 5-digit format (e.g., 60188)' },
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

    // Try the orchestrator (Google Civic API with internal fallback)
    let result;
    try {
      result = await getOrchestrator().lookupByZipCode(code);
    } catch (orchestratorError: any) {
      console.warn('[API:civics/zip] Orchestrator lookup failed:', orchestratorError.message);

      // Route-level fallback: call Congress.gov directly
      const state = zipToState(code);
      if (!state) {
        throw new Error(
          `Unable to determine state for zip code ${code}. API error: ${orchestratorError.message}`
        );
      }

      console.log(`[API:civics/zip] Trying direct Congress.gov fallback for state=${state}`);
      try {
        const congress = new CongressAdapter({ apiKey: process.env.CONGRESS_API_KEY });
        const members = await congress.getMembersByState(state);
        console.log(`[API:civics/zip] Congress.gov returned ${members.length} members for ${state}`);

        result = {
          zipCode: code,
          state,
          officials: members.map((m: any) => ({
            name: m.name,
            title: m.chamber === 'senate'
              ? `U.S. Senator — ${m.state}`
              : `U.S. Representative — ${m.state}${m.district ? ` District ${m.district}` : ''}`,
            party: m.party,
            chamber: m.chamber,
            photoUrl: m.depiction,
            bioguideId: m.bioguideId,
            phones: [],
            urls: m.officialUrl ? [m.officialUrl] : [],
            channels: [],
          })),
        };
      } catch (congressError: any) {
        console.error('[API:civics/zip] Congress.gov fallback also failed:', congressError.message);
        throw new Error(
          `Both APIs failed. Google Civic: ${orchestratorError.message}. ` +
          `Congress.gov: ${congressError.message}. ` +
          `Verify GOOGLE_CIVIC_API_KEY and CONGRESS_API_KEY are set correctly.`
        );
      }
    }

    // Cache in PostgreSQL
    try {
      await setCachedZipLookup(code, result.state, '', result, 24);
    } catch {
      // Cache write failure is non-fatal
    }

    return NextResponse.json(result);
  } catch (error: any) {
    const message = error.message ?? 'Failed to look up zip code';
    console.error('[API:civics/zip] Final error:', message);

    const status = message.includes('Unable to determine state') ? 400 : 502;
    return NextResponse.json(
      { error: 'Failed to look up representatives. Please try again later.', detail: message },
      { status }
    );
  }
}
