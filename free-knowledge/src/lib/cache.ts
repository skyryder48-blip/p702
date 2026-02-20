// In-memory TTL cache for API route data
// Used by sub-routes (votes, committees, news, finance, metrics)
// The main member route uses PostgreSQL-backed CachedProfile instead.

const store = new Map<string, { data: unknown; expiresAt: number }>();

const DEFAULT_TTL: Record<string, number> = {
  finance: 6 * 60 * 60 * 1000,    // 6 hours
  votes: 30 * 60 * 1000,          // 30 minutes
  committees: 24 * 60 * 60 * 1000, // 24 hours
  news: 30 * 60 * 1000,           // 30 minutes
  metrics: 60 * 60 * 1000,        // 1 hour
  compare: 30 * 60 * 1000,        // 30 minutes
  issues: 60 * 60 * 1000,         // 1 hour
};

export function getCached<T>(key: string): T | null {
  const entry = store.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    return null;
  }
  return entry.data as T;
}

export function setCache(key: string, data: unknown, category: string): void {
  const ttl = DEFAULT_TTL[category] ?? 30 * 60 * 1000;
  store.set(key, { data, expiresAt: Date.now() + ttl });

  // Lazy eviction: purge expired entries when cache grows large
  if (store.size > 500) {
    const now = Date.now();
    for (const [k, v] of store) {
      if (now > v.expiresAt) store.delete(k);
    }
  }
}
