import { NextResponse } from 'next/server';
import { checkDbHealth } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  const db = await checkDbHealth();

  const status = db.ok ? 200 : 503;

  return NextResponse.json(
    {
      status: db.ok ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      checks: {
        database: { ok: db.ok, latencyMs: db.latency },
      },
    },
    { status }
  );
}
