import { prisma } from './prisma';

// ===========================
// Health Checks
// ===========================

export async function checkDbHealth(): Promise<{ ok: boolean; latency: number }> {
  const start = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { ok: true, latency: Date.now() - start };
  } catch {
    return { ok: false, latency: Date.now() - start };
  }
}

// ===========================
// Profile Cache
// ===========================

export async function getCachedProfile(bioguideId: string) {
  const cached = await prisma.cachedProfile.findUnique({
    where: { bioguideId },
  });
  if (!cached) return null;
  if (new Date() > cached.expiresAt) return null;
  return cached.data;
}

export async function setCachedProfile(
  bioguideId: string,
  name: string,
  data: unknown,
  ttlMinutes: number = 30
) {
  const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);
  await prisma.cachedProfile.upsert({
    where: { bioguideId },
    update: { name, data: data as any, fetchedAt: new Date(), expiresAt },
    create: { bioguideId, name, data: data as any, expiresAt },
  });
}

// ===========================
// Zip Lookup Cache
// ===========================

export async function getCachedZipLookup(zipCode: string) {
  const cached = await prisma.cachedZipLookup.findUnique({
    where: { zipCode },
  });
  if (!cached) return null;
  if (new Date() > cached.expiresAt) return null;
  return cached.data;
}

export async function setCachedZipLookup(
  zipCode: string,
  state: string,
  district: string,
  data: unknown,
  ttlHours: number = 24
) {
  const expiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000);
  await prisma.cachedZipLookup.upsert({
    where: { zipCode },
    update: { state, district, data: data as any, fetchedAt: new Date(), expiresAt },
    create: { zipCode, state, district, data: data as any, expiresAt },
  });
}

// ===========================
// Cache Purge
// ===========================

export async function purgeExpiredCache() {
  const now = new Date();
  const [profiles, zips] = await Promise.all([
    prisma.cachedProfile.deleteMany({ where: { expiresAt: { lt: now } } }),
    prisma.cachedZipLookup.deleteMany({ where: { expiresAt: { lt: now } } }),
  ]);
  return { purgedProfiles: profiles.count, purgedZips: zips.count };
}

// ===========================
// Tier Management
// ===========================

export async function upgradeTier(
  userId: string,
  tier: 'premium' | 'institutional',
  durationDays: number = 30
) {
  const tierExpiresAt = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000);
  return prisma.user.update({
    where: { id: userId },
    data: { tier, tierExpiresAt },
  });
}

export async function checkExpiredSubscriptions() {
  const now = new Date();
  const result = await prisma.user.updateMany({
    where: {
      tier: { not: 'free' },
      tierExpiresAt: { lt: now },
    },
    data: { tier: 'free', tierExpiresAt: null },
  });
  return { downgraded: result.count };
}

// ===========================
// Analytics
// ===========================

export async function trackUsage(params: {
  feature: string;
  tier: string;
  action: string;
}) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const hour = new Date().getHours();

  await prisma.usageMetric.upsert({
    where: {
      feature_tier_action_date: {
        feature: params.feature,
        tier: params.tier,
        action: params.action,
        date: today,
      },
    },
    update: { count: { increment: 1 } },
    create: {
      feature: params.feature,
      tier: params.tier,
      action: params.action,
      date: today,
      hour,
      count: 1,
    },
  });
}
