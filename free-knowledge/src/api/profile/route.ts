// ============================================================
// free-knowledge — Next.js API Route
// GET /api/profile?q=Subject+Name&profile=general
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { Orchestrator } from '../../../core/orchestrator';

// Singleton orchestrator instance
let orchestrator: Orchestrator | null = null;

function getOrchestrator(): Orchestrator {
  if (!orchestrator) {
    orchestrator = new Orchestrator({
      anthropicApiKey: process.env.ANTHROPIC_API_KEY,
      cacheTTL: 3600,
      maxCacheEntries: 5000,
    });
  }
  return orchestrator;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('q');
  const profileId = searchParams.get('profile') || 'general';
  const skipCache = searchParams.get('fresh') === 'true';
  const skipSynthesis = searchParams.get('raw') === 'true';

  if (!query) {
    return NextResponse.json(
      { error: 'Missing required parameter: q' },
      { status: 400 }
    );
  }

  if (query.length > 200) {
    return NextResponse.json(
      { error: 'Query too long (max 200 characters)' },
      { status: 400 }
    );
  }

  try {
    const engine = getOrchestrator();

    const result = await engine.generateProfile({
      query: query.trim(),
      profileId,
      options: {
        skipCache,
        skipSynthesis,
      },
    });

    return NextResponse.json({
      success: true,
      cached: result.cached,
      timing: result.timing,
      profile: result.profile,
    });
  } catch (error: any) {
    console.error('[API] Profile generation failed:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to generate profile',
        message: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}

// Health check
export async function HEAD() {
  return new NextResponse(null, { status: 200 });
}
