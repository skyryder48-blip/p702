// ============================================================
// free-civics — User Issue Preferences API
// GET /api/user/issues — list user's issue preferences
// PUT /api/user/issues — replace all issue preferences
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  const token = await getToken({ req: request });
  if (!token?.id) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const prefs = await prisma.userIssuePreference.findMany({
    where: { userId: token.id as string },
    orderBy: { priority: 'asc' },
  });

  return NextResponse.json({ issues: prefs });
}

export async function PUT(request: NextRequest) {
  const token = await getToken({ req: request });
  if (!token?.id) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const body = await request.json();
  const { issues } = body;

  if (!Array.isArray(issues)) {
    return NextResponse.json({ error: 'issues must be an array' }, { status: 400 });
  }

  // Validate each issue entry
  for (const issue of issues) {
    if (!issue.issueId || typeof issue.priority !== 'number') {
      return NextResponse.json({ error: 'Each issue must have issueId and priority' }, { status: 400 });
    }
  }

  const userId = token.id as string;

  // Transaction: delete all existing, create new
  await prisma.$transaction([
    prisma.userIssuePreference.deleteMany({ where: { userId } }),
    ...issues.map((issue: { issueId: string; priority: number }) =>
      prisma.userIssuePreference.create({
        data: {
          userId,
          issueId: issue.issueId,
          priority: issue.priority,
        },
      })
    ),
  ]);

  const prefs = await prisma.userIssuePreference.findMany({
    where: { userId },
    orderBy: { priority: 'asc' },
  });

  return NextResponse.json({ issues: prefs });
}
