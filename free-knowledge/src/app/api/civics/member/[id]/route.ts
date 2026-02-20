// GET /api/civics/member/[id]
// Returns member details + sponsored bills from Congress.gov

import { NextRequest, NextResponse } from 'next/server';
import { Orchestrator } from '@/core/orchestrator';
import { getCachedProfile, setCachedProfile } from '@/lib/db';

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
