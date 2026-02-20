// ============================================================
// free-civics — User Alerts API
// GET   /api/user/alerts          — list alerts (paginated)
// PATCH /api/user/alerts          — mark alerts as read/unread
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  const token = await getToken({ req: request });
  if (!token?.id) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const page = parseInt(request.nextUrl.searchParams.get('page') ?? '1', 10);
  const limit = Math.min(parseInt(request.nextUrl.searchParams.get('limit') ?? '20', 10), 100);
  const skip = (page - 1) * limit;

  const userId = token.id as string;

  const [alerts, total] = await Promise.all([
    prisma.alert.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      include: {
        savedOfficial: {
          select: { name: true, bioguideId: true, party: true },
        },
      },
    }),
    prisma.alert.count({ where: { userId } }),
  ]);

  const unread = await prisma.alert.count({ where: { userId, read: false } });

  return NextResponse.json({
    alerts,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    unread,
  });
}

export async function PATCH(request: NextRequest) {
  const token = await getToken({ req: request });
  if (!token?.id) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const body = await request.json();
  const { alertIds, read } = body;

  if (!Array.isArray(alertIds) || typeof read !== 'boolean') {
    return NextResponse.json({ error: 'alertIds (array) and read (boolean) are required' }, { status: 400 });
  }

  await prisma.alert.updateMany({
    where: {
      id: { in: alertIds },
      userId: token.id as string,
    },
    data: { read },
  });

  return NextResponse.json({ success: true });
}
