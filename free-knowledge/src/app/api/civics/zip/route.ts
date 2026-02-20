// GET /api/civics/zip?code=60188
// Returns representatives for a zip code via Google Civic Info API

import { NextRequest, NextResponse } from 'next/server';
import { Orchestrator } from '@/core/orchestrator';
import { getCachedZipLookup, setCachedZipLookup } from '@/lib/db';

let orchestrator: Orchestrator | null = null;

function getOrchestrator(): Orchestrator {
  if (!orchestrator) {
    orchestrator = new Orchestrator({
      congressApiKey: process.env.CONGRESS_API_KEY,
      fecApiKey: process.env.FEC_API_KEY,
      googleCivicApiKey: process.env.GOOGLE_CIVIC_API_KEY,
      anthropicApiKey: process.env.ANTHROPIC_API_KEY,
      newsApiKey: process.env.NEWS_API_KEY,
    });
  }
  return orchestrator;
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');

  if (!code || !/^\d{5}(-\d{4})?$/.test(code)) {
    return NextResponse.json(
      { error: 'Invalid zip code. Use 5-digit format (e.g., 60188)' },
      { status: 400 }
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
