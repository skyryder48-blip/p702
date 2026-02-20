// Shared helper for extracting user tier from JWT in API routes

import { getToken } from 'next-auth/jwt';
import type { NextRequest } from 'next/server';
import type { Tier } from '@/core/auth/tiers';

export async function getRequestTier(request: NextRequest): Promise<{ tier: Tier; userId?: string }> {
  // In stub mode, use environment variable
  if (process.env.NEXT_PUBLIC_AUTH_PROVIDER === 'stub') {
    const tier = (process.env.NEXT_PUBLIC_FORCE_TIER as Tier) ?? 'free';
    return { tier };
  }

  const token = await getToken({ req: request });
  if (!token) return { tier: 'free' };
  return {
    tier: (token.tier as Tier) ?? 'free',
    userId: token.id as string,
  };
}
