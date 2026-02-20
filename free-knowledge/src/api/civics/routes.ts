// ============================================================
// free-civics — Next.js API Routes
// /api/civics/profile     — Official profile
// /api/civics/zip         — Zip code lookup
// /api/civics/compare     — Compare two officials
// /api/civics/issues      — Issue-specific reports
// /api/civics/categories  — Available issue categories
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { CivicsOrchestrator } from '../../../config/civics';

let civics: CivicsOrchestrator | null = null;

function getCivics(): CivicsOrchestrator {
  if (!civics) {
    civics = new CivicsOrchestrator({
      anthropicApiKey: process.env.ANTHROPIC_API_KEY,
      congressApiKey: process.env.CONGRESS_API_KEY,
      fecApiKey: process.env.FEC_API_KEY,
      googleCivicApiKey: process.env.GOOGLE_CIVIC_API_KEY,
      gnewsApiKey: process.env.GNEWS_API_KEY,
    });
  }
  return civics;
}

// --- GET /api/civics/profile?name=John+Smith ---

export async function profileHandler(request: NextRequest) {
  const name = request.nextUrl.searchParams.get('name');
  if (!name) {
    return NextResponse.json({ error: 'Missing name parameter' }, { status: 400 });
  }

  try {
    const profile = await getCivics().getOfficialProfile(name.trim());
    return NextResponse.json({ success: true, profile });
  } catch (error: any) {
    console.error('[API:civics/profile] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// --- GET /api/civics/zip?code=60188 ---

export async function zipHandler(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');
  if (!code || !/^\d{5}(-\d{4})?$/.test(code)) {
    return NextResponse.json(
      { error: 'Invalid zip code. Use 5-digit format (e.g., 60188)' },
      { status: 400 }
    );
  }

  try {
    const result = await getCivics().lookupByZipCode(code);
    return NextResponse.json({ success: true, district: result });
  } catch (error: any) {
    console.error('[API:civics/zip] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// --- GET /api/civics/compare?official1=Name+One&official2=Name+Two ---

export async function compareHandler(request: NextRequest) {
  const official1 = request.nextUrl.searchParams.get('official1');
  const official2 = request.nextUrl.searchParams.get('official2');

  if (!official1 || !official2) {
    return NextResponse.json(
      { error: 'Both official1 and official2 parameters are required' },
      { status: 400 }
    );
  }

  try {
    const comparison = await getCivics().compareOfficials(
      official1.trim(),
      official2.trim()
    );
    return NextResponse.json({ success: true, comparison });
  } catch (error: any) {
    console.error('[API:civics/compare] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// --- GET /api/civics/issues?official=Name&issues=healthcare,economy ---

export async function issuesHandler(request: NextRequest) {
  const official = request.nextUrl.searchParams.get('official');
  const issueIds = request.nextUrl.searchParams.get('issues');

  if (!official || !issueIds) {
    return NextResponse.json(
      { error: 'Both official and issues parameters are required' },
      { status: 400 }
    );
  }

  const ids = issueIds.split(',').map((id) => id.trim());

  try {
    const reports = await getCivics().getIssueReports(official.trim(), ids);
    return NextResponse.json({ success: true, reports });
  } catch (error: any) {
    console.error('[API:civics/issues] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// --- GET /api/civics/categories ---

export async function categoriesHandler() {
  const categories = getCivics().getIssueCategories();
  return NextResponse.json({ success: true, categories });
}
