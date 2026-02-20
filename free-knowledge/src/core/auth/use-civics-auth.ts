'use client';

// Client-side auth hook
// canAccess(), getGate(), applyLimit()

import { useSession } from 'next-auth/react';
import { canAccess as checkAccess, getFeatureLimit, getFeatureBehavior, type Tier } from './tiers';

export function useCivicsAuth() {
  const { data: session, status } = useSession();
  const isStub = process.env.NEXT_PUBLIC_AUTH_PROVIDER === 'stub';

  const tier: Tier = isStub
    ? (process.env.NEXT_PUBLIC_FORCE_TIER as Tier ?? 'free')
    : (session?.user as any)?.tier ?? 'free';

  const isAuthenticated = isStub
    ? !!process.env.NEXT_PUBLIC_FORCE_TIER
    : status === 'authenticated';

  const isLoading = status === 'loading';

  function canAccess(feature: string): boolean {
    return checkAccess(feature, tier);
  }

  function getGate(feature: string) {
    return {
      allowed: checkAccess(feature, tier),
      behavior: getFeatureBehavior(feature, tier),
      limit: getFeatureLimit(feature, tier),
    };
  }

  function applyLimit<T>(feature: string, items: T[]): { items: T[]; limited: boolean; total: number } {
    const limit = getFeatureLimit(feature, tier);
    if (limit === undefined) return { items, limited: false, total: items.length };
    return {
      items: items.slice(0, limit),
      limited: items.length > limit,
      total: items.length,
    };
  }

  return {
    session,
    tier,
    isAuthenticated,
    isLoading,
    canAccess,
    getGate,
    applyLimit,
    user: session?.user ?? null,
  };
}
