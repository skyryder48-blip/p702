// Server-side auth middleware
// gateProfileResponse(), requireFeature(), getRateLimit()

import { type Tier, FEATURES, RATE_LIMITS, canAccess, getFeatureLimit } from './tiers';

// Strip premium fields from API responses before they reach the client
export function gateProfileResponse(fullProfile: any, userTier: Tier): any {
  const gated = { ...fullProfile };

  // Finance data — premium only
  if (!canAccess('finance.summary', userTier)) {
    delete gated.finance;
  }

  // Full vote history — limit for free
  if (gated.votes && !canAccess('votes.full_history', userTier)) {
    const limit = getFeatureLimit('votes.recent', userTier) ?? 5;
    gated.votes = gated.votes.slice(0, limit);
    gated.votesLimited = true;
  }

  // Bills — limit for free
  if (gated.bills && !canAccess('legislation.bill_details', userTier)) {
    const limit = getFeatureLimit('legislation.sponsored_bills', userTier) ?? 5;
    gated.bills = gated.bills.slice(0, limit);
    gated.billsLimited = true;
  }

  // Metrics — premium only
  if (!canAccess('metrics.scorecard', userTier)) {
    delete gated.scorecard;
  }

  // News — limit for free
  if (gated.news && !canAccess('news.archive', userTier)) {
    const limit = getFeatureLimit('news.recent', userTier) ?? 3;
    gated.news = gated.news.slice(0, limit);
  }

  return gated;
}

// Require a feature — returns error response or null
export function requireFeature(feature: string, userTier: Tier): { error: string; status: number } | null {
  if (canAccess(feature, userTier)) return null;
  const def = FEATURES[feature];
  if (!def) return { error: 'Unknown feature', status: 404 };
  if (def.behavior === 'auth_required') {
    return { error: 'Authentication required', status: 401 };
  }
  return {
    error: `This feature requires a ${def.tier} subscription`,
    status: 403,
  };
}

// Get rate limit for a tier
export function getRateLimit(tier: Tier) {
  return RATE_LIMITS[tier];
}
