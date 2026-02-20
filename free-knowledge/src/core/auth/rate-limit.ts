// Sliding window rate limiter
// In-memory by default. For serverless deployments at scale,
// replace with a Redis or database-backed store (see RateLimitStore interface).

import { RATE_LIMITS, type Tier } from './tiers';

interface RateLimitEntry {
  count: number;
  windowStart: number;
}

// ---------------------------------------------------------------------------
// Store interface — swap in Redis/Upstash for distributed rate limiting
// ---------------------------------------------------------------------------

interface RateLimitStore {
  get(key: string): RateLimitEntry | undefined;
  set(key: string, entry: RateLimitEntry): void;
  delete(key: string): void;
  entries(): IterableIterator<[string, RateLimitEntry]>;
}

// Default in-memory store (works for single-instance or dev)
class MemoryStore implements RateLimitStore {
  private map = new Map<string, RateLimitEntry>();
  get(key: string) { return this.map.get(key); }
  set(key: string, entry: RateLimitEntry) { this.map.set(key, entry); }
  delete(key: string) { this.map.delete(key); }
  entries() { return this.map.entries(); }
}

// Per-minute and per-day tracking
const minuteStore: RateLimitStore = new MemoryStore();
const dayStore: RateLimitStore = new MemoryStore();

// Clean up expired entries periodically
const CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 minutes
let lastCleanup = Date.now();

function cleanup() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;

  for (const [key, entry] of minuteStore.entries()) {
    if (now - entry.windowStart > 60_000) minuteStore.delete(key);
  }
  for (const [key, entry] of dayStore.entries()) {
    if (now - entry.windowStart > 86_400_000) dayStore.delete(key);
  }
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  limit: number;
  retryAfterMs?: number;
}

export function checkRateLimit(key: string, tier: Tier): RateLimitResult {
  cleanup();

  const limits = RATE_LIMITS[tier];
  const now = Date.now();

  // Check per-minute limit
  const minuteKey = `min:${key}`;
  let minuteEntry = minuteStore.get(minuteKey);
  if (!minuteEntry || now - minuteEntry.windowStart > 60_000) {
    minuteEntry = { count: 0, windowStart: now };
    minuteStore.set(minuteKey, minuteEntry);
  }

  if (minuteEntry.count >= limits.requestsPerMinute) {
    const retryAfterMs = 60_000 - (now - minuteEntry.windowStart);
    return {
      allowed: false,
      remaining: 0,
      limit: limits.requestsPerMinute,
      retryAfterMs,
    };
  }

  // Check per-day limit (skip if unlimited)
  if (limits.requestsPerDay > 0) {
    const dayKey = `day:${key}`;
    let dayEntry = dayStore.get(dayKey);
    if (!dayEntry || now - dayEntry.windowStart > 86_400_000) {
      dayEntry = { count: 0, windowStart: now };
      dayStore.set(dayKey, dayEntry);
    }

    if (dayEntry.count >= limits.requestsPerDay) {
      const retryAfterMs = 86_400_000 - (now - dayEntry.windowStart);
      return {
        allowed: false,
        remaining: 0,
        limit: limits.requestsPerDay,
        retryAfterMs,
      };
    }

    dayEntry.count++;
  }

  minuteEntry.count++;

  return {
    allowed: true,
    remaining: limits.requestsPerMinute - minuteEntry.count,
    limit: limits.requestsPerMinute,
  };
}

// Helper to extract rate limit key from request
export function getRateLimitKey(request: Request): string {
  // Use IP address for anonymous users
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded?.split(',')[0]?.trim() ?? 'unknown';
  return `ip:${ip}`;
}
