// ============================================================
// free-civics — Saved Officials API
// GET    /api/user/saved              — list saved officials
// POST   /api/user/saved              — save an official
// PATCH  /api/user/saved              — update alertsOn
// DELETE /api/user/saved?bioguideId=X — remove a saved official
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  const token = await getToken({ req: request });
  if (!token?.id) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const saved = await prisma.savedOfficial.findMany({
    where: { userId: token.id as string },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({ officials: saved });
}

export async function POST(request: NextRequest) {
  const token = await getToken({ req: request });
  if (!token?.id) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const body = await request.json();
  const { bioguideId, name, title, party, state, chamber } = body;

  if (!bioguideId || !name) {
    return NextResponse.json({ error: 'bioguideId and name are required' }, { status: 400 });
  }

  try {
    const saved = await prisma.savedOfficial.create({
      data: {
        userId: token.id as string,
        bioguideId,
        name,
        title: title ?? null,
        party: party ?? null,
        state: state ?? null,
        chamber: chamber ?? null,
      },
    });
    return NextResponse.json(saved, { status: 201 });
  } catch (err: any) {
    // Unique constraint violation — already saved
    if (err?.code === 'P2002') {
      return NextResponse.json({ error: 'Official already saved' }, { status: 409 });
    }
    throw err;
  }
}

export async function PATCH(request: NextRequest) {
  const token = await getToken({ req: request });
  if (!token?.id) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const body = await request.json();
  const { bioguideId, alertsOn } = body;

  if (!bioguideId || typeof alertsOn !== 'boolean') {
    return NextResponse.json({ error: 'bioguideId and alertsOn are required' }, { status: 400 });
  }

  const saved = await prisma.savedOfficial.updateMany({
    where: { userId: token.id as string, bioguideId },
    data: { alertsOn },
  });

  if (saved.count === 0) {
    return NextResponse.json({ error: 'Saved official not found' }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(request: NextRequest) {
  const token = await getToken({ req: request });
  if (!token?.id) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const bioguideId = request.nextUrl.searchParams.get('bioguideId');
  if (!bioguideId) {
    return NextResponse.json({ error: 'bioguideId is required' }, { status: 400 });
  }

  const deleted = await prisma.savedOfficial.deleteMany({
    where: { userId: token.id as string, bioguideId },
  });

  if (deleted.count === 0) {
    return NextResponse.json({ error: 'Saved official not found' }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
