// ============================================================
// free-civics — User Profile API
// GET  /api/user/profile  — return current user's profile
// PATCH /api/user/profile — update name, zipCode, defaultState
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  const token = await getToken({ req: request });
  if (!token?.id) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: token.id as string },
    select: {
      id: true,
      email: true,
      name: true,
      tier: true,
      zipCode: true,
      defaultState: true,
      createdAt: true,
    },
  });

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  return NextResponse.json(user);
}

export async function PATCH(request: NextRequest) {
  const token = await getToken({ req: request });
  if (!token?.id) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const body = await request.json();
  const { name, zipCode, defaultState } = body;

  // Validate zip code format
  if (zipCode !== undefined && zipCode !== null && zipCode !== '') {
    if (!/^\d{5}$/.test(zipCode)) {
      return NextResponse.json({ error: 'Zip code must be 5 digits' }, { status: 400 });
    }
  }

  // Validate name length
  if (name !== undefined && name !== null && name.length > 100) {
    return NextResponse.json({ error: 'Name must be 100 characters or less' }, { status: 400 });
  }

  // Validate state abbreviation
  if (defaultState !== undefined && defaultState !== null && defaultState !== '') {
    if (!/^[A-Z]{2}$/.test(defaultState)) {
      return NextResponse.json({ error: 'State must be a 2-letter abbreviation' }, { status: 400 });
    }
  }

  const updateData: Record<string, unknown> = {};
  if (name !== undefined) updateData.name = name?.trim() || null;
  if (zipCode !== undefined) updateData.zipCode = zipCode || null;
  if (defaultState !== undefined) updateData.defaultState = defaultState || null;

  const user = await prisma.user.update({
    where: { id: token.id as string },
    data: updateData,
    select: {
      id: true,
      email: true,
      name: true,
      tier: true,
      zipCode: true,
      defaultState: true,
      createdAt: true,
    },
  });

  return NextResponse.json(user);
}
