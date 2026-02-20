// GET /api/civics/member/[id]/finance?name=Sean+Casten
// Returns FEC campaign finance data

import { NextRequest, NextResponse } from 'next/server';
import { Orchestrator } from '@/core/orchestrator';

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
  const name = request.nextUrl.searchParams.get('name');

  if (!bioguideId || !name) {
    return NextResponse.json(
      { error: 'Both bioguide ID and name are required' },
      { status: 400 }
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
