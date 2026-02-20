// Barrel exports for auth system
export { canAccess, getFeatureLimit, getFeatureBehavior, FEATURES, RATE_LIMITS } from './tiers';
export type { Tier, FeatureDefinition } from './tiers';
export { createAuthAdapter, StubAuthAdapter, NextAuthAdapter } from './adapter';
export type { AuthUser, AuthAdapter } from './adapter';
export { gateProfileResponse, requireFeature, getRateLimit } from './middleware';
export { FeatureGate, TeaserList, UpgradePrompt, AuthProvider } from './components';
export { useCivicsAuth } from './use-civics-auth';
