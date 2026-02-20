// In-memory LRU cache with TTL
// Supplements PostgreSQL cache for hot-path performance

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

export class LRUCache<T = unknown> {
  private cache = new Map<string, CacheEntry<T>>();
  private readonly maxEntries: number;
  private readonly defaultTTL: number;

  constructor(opts: { maxEntries?: number; defaultTTL?: number } = {}) {
    this.maxEntries = opts.maxEntries ?? 500;
    this.defaultTTL = opts.defaultTTL ?? 30 * 60 * 1000; // 30 min
  }

  get(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    // Move to end (most recently used)
    this.cache.delete(key);
    this.cache.set(key, entry);
    return entry.value;
  }

  set(key: string, value: T, ttlMs?: number): void {
    // Evict oldest if at capacity
    if (this.cache.size >= this.maxEntries) {
      const oldest = this.cache.keys().next().value;
      if (oldest !== undefined) this.cache.delete(oldest);
    }
    this.cache.set(key, {
      value,
      expiresAt: Date.now() + (ttlMs ?? this.defaultTTL),
    });
  }

  has(key: string): boolean {
    return this.get(key) !== null;
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  get size(): number {
    return this.cache.size;
  }
}

// Shared singleton instances
export const profileCache = new LRUCache({ maxEntries: 200, defaultTTL: 30 * 60 * 1000 });
export const zipCache = new LRUCache({ maxEntries: 1000, defaultTTL: 24 * 60 * 60 * 1000 });
export const financeCache = new LRUCache({ maxEntries: 200, defaultTTL: 6 * 60 * 60 * 1000 });
