// Feature tier definitions
// 35+ features with access requirements (free/premium/institutional)

export type Tier = 'free' | 'premium' | 'institutional';

export interface FeatureDefinition {
  id: string;
  label: string;
  tier: Tier;
  limit?: number; // For teaser limits (e.g., show 5 bills on free)
  behavior: 'open' | 'teaser' | 'hidden' | 'auth_required';
}

export const FEATURES: Record<string, FeatureDefinition> = {
  // Profile — Overview
  'profile.overview': { id: 'profile.overview', label: 'Profile Overview', tier: 'free', behavior: 'open' },
  'profile.biography': { id: 'profile.biography', label: 'Biography', tier: 'free', behavior: 'open' },
  'profile.contact': { id: 'profile.contact', label: 'Contact Information', tier: 'free', behavior: 'open' },

  // Profile — Legislation
  'legislation.sponsored_bills': { id: 'legislation.sponsored_bills', label: 'Sponsored Bills', tier: 'free', limit: 5, behavior: 'teaser' },
  'legislation.cosponsored_bills': { id: 'legislation.cosponsored_bills', label: 'Cosponsored Bills', tier: 'premium', behavior: 'hidden' },
  'legislation.bill_details': { id: 'legislation.bill_details', label: 'Bill Details', tier: 'premium', behavior: 'hidden' },
  'legislation.bill_search': { id: 'legislation.bill_search', label: 'Bill Search', tier: 'premium', behavior: 'hidden' },

  // Profile — Finance
  'finance.summary': { id: 'finance.summary', label: 'Finance Summary', tier: 'premium', behavior: 'hidden' },
  'finance.top_contributors': { id: 'finance.top_contributors', label: 'Top Contributors', tier: 'premium', behavior: 'hidden' },
  'finance.pac_contributions': { id: 'finance.pac_contributions', label: 'PAC Contributions', tier: 'premium', behavior: 'hidden' },
  'finance.expenditures': { id: 'finance.expenditures', label: 'Expenditures', tier: 'institutional', behavior: 'hidden' },

  // Profile — Votes
  'votes.recent': { id: 'votes.recent', label: 'Recent Votes', tier: 'free', limit: 5, behavior: 'teaser' },
  'votes.full_history': { id: 'votes.full_history', label: 'Full Vote History', tier: 'premium', behavior: 'hidden' },
  'votes.party_alignment': { id: 'votes.party_alignment', label: 'Party Alignment', tier: 'premium', behavior: 'hidden' },

  // Profile — Committees
  'committees.list': { id: 'committees.list', label: 'Committee List', tier: 'free', behavior: 'open' },
  'committees.details': { id: 'committees.details', label: 'Committee Details', tier: 'premium', behavior: 'hidden' },

  // Profile — Metrics
  'metrics.scorecard': { id: 'metrics.scorecard', label: 'Metrics Dashboard', tier: 'premium', behavior: 'teaser' },
  'metrics.benchmarks': { id: 'metrics.benchmarks', label: 'Benchmark Comparisons', tier: 'premium', behavior: 'hidden' },

  // Profile — News
  'news.recent': { id: 'news.recent', label: 'Recent News', tier: 'free', limit: 3, behavior: 'teaser' },
  'news.archive': { id: 'news.archive', label: 'News Archive', tier: 'premium', behavior: 'hidden' },

  // Compare
  'compare.side_by_side': { id: 'compare.side_by_side', label: 'Side-by-Side Comparison', tier: 'premium', behavior: 'hidden' },
  'compare.voting_alignment': { id: 'compare.voting_alignment', label: 'Voting Alignment', tier: 'premium', behavior: 'hidden' },
  'compare.funding_comparison': { id: 'compare.funding_comparison', label: 'Funding Comparison', tier: 'premium', behavior: 'hidden' },

  // Issues
  'issues.list': { id: 'issues.list', label: 'Issue Categories', tier: 'free', behavior: 'open' },
  'issues.report': { id: 'issues.report', label: 'Issue Reports', tier: 'premium', behavior: 'hidden' },
  'issues.voting_record': { id: 'issues.voting_record', label: 'Issue Voting Record', tier: 'premium', behavior: 'hidden' },

  // User Features
  'user.saved_officials': { id: 'user.saved_officials', label: 'Saved Officials', tier: 'free', behavior: 'auth_required' },
  'user.alerts': { id: 'user.alerts', label: 'Alerts', tier: 'premium', behavior: 'hidden' },
  'user.issue_preferences': { id: 'user.issue_preferences', label: 'Issue Preferences', tier: 'free', behavior: 'auth_required' },
  'user.search_history': { id: 'user.search_history', label: 'Search History', tier: 'free', behavior: 'auth_required' },

  // Export
  'export.pdf': { id: 'export.pdf', label: 'PDF Export', tier: 'premium', behavior: 'hidden' },
  'export.csv': { id: 'export.csv', label: 'CSV Export', tier: 'institutional', behavior: 'hidden' },
  'export.api': { id: 'export.api', label: 'API Access', tier: 'institutional', behavior: 'hidden' },

  // Search
  'search.basic': { id: 'search.basic', label: 'Basic Search', tier: 'free', behavior: 'open' },
  'search.advanced': { id: 'search.advanced', label: 'Advanced Search', tier: 'premium', behavior: 'hidden' },

  // Zip Lookup
  'zip.lookup': { id: 'zip.lookup', label: 'Find Representatives', tier: 'free', behavior: 'open' },
  'zip.history': { id: 'zip.history', label: 'Lookup History', tier: 'free', behavior: 'auth_required' },
};

// Rate limits per tier
export const RATE_LIMITS: Record<Tier, { requestsPerMinute: number; requestsPerDay: number }> = {
  free: { requestsPerMinute: 20, requestsPerDay: 500 },
  premium: { requestsPerMinute: 60, requestsPerDay: 5000 },
  institutional: { requestsPerMinute: 200, requestsPerDay: -1 }, // -1 = unlimited
};

// Helper functions
export function canAccess(feature: string, userTier: Tier): boolean {
  const def = FEATURES[feature];
  if (!def) return false;
  const tierRank: Record<Tier, number> = { free: 0, premium: 1, institutional: 2 };
  return tierRank[userTier] >= tierRank[def.tier];
}

export function getFeatureLimit(feature: string, userTier: Tier): number | undefined {
  const def = FEATURES[feature];
  if (!def) return undefined;
  if (canAccess(feature, userTier) && userTier !== 'free') return undefined; // No limit
  return def.limit;
}

export function getFeatureBehavior(feature: string, userTier: Tier): FeatureDefinition['behavior'] {
  const def = FEATURES[feature];
  if (!def) return 'hidden';
  if (canAccess(feature, userTier)) return 'open';
  return def.behavior;
}
