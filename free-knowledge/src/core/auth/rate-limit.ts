// Sliding window rate limiter
// Tracks requests per key (user ID or IP) using in-memory Map with TTL

import { RATE_LIMITS, type Tier } from './tiers';

interface RateLimitEntry {
  count: number;
  windowStart: number;
}

// Per-minute tracking
const minuteCounters = new Map<string, RateLimitEntry>();
// Per-day tracking
const dayCounters = new Map<string, RateLimitEntry>();

// Clean up expired entries periodically
const CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 minutes
let lastCleanup = Date.now();

function cleanup() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;

  for (const [key, entry] of minuteCounters) {
    if (now - entry.windowStart > 60_000) minuteCounters.delete(key);
  }
  for (const [key, entry] of dayCounters) {
    if (now - entry.windowStart > 86_400_000) dayCounters.delete(key);
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
  let minuteEntry = minuteCounters.get(minuteKey);
  if (!minuteEntry || now - minuteEntry.windowStart > 60_000) {
    minuteEntry = { count: 0, windowStart: now };
    minuteCounters.set(minuteKey, minuteEntry);
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
    let dayEntry = dayCounters.get(dayKey);
    if (!dayEntry || now - dayEntry.windowStart > 86_400_000) {
      dayEntry = { count: 0, windowStart: now };
      dayCounters.set(dayKey, dayEntry);
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
