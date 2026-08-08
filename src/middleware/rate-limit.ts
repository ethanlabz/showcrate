/**
 * middleware/rate-limit.ts — Sliding window rate limiter
 *
 * In-memory implementation (sufficient for single-instance Netlify functions).
 * For multi-region deployments, replace with Redis/Upstash.
 *
 * Limits:
 *   - Auth endpoints:    10 req/min per IP
 *   - Write endpoints:   60 req/min per user
 *   - Public reads:     200 req/min per IP
 */

interface WindowEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, WindowEntry>();

// Clean up expired entries every 5 minutes to prevent memory leak
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (entry.resetAt < now) store.delete(key);
  }
}, 5 * 60 * 1000);

export type RateLimitTier = 'auth' | 'write' | 'public';

const LIMITS: Record<RateLimitTier, { max: number; windowMs: number }> = {
  auth:   { max: 10,  windowMs: 60_000 },
  write:  { max: 60,  windowMs: 60_000 },
  public: { max: 200, windowMs: 60_000 },
};

/**
 * Check and increment rate limit counter.
 * @returns true if the request is allowed, false if rate limited.
 */
export function checkRateLimit(key: string, tier: RateLimitTier): boolean {
  const { max, windowMs } = LIMITS[tier];
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || entry.resetAt < now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (entry.count >= max) return false;

  entry.count++;
  return true;
}

/**
 * Classify a request path into a rate limit tier.
 */
export function getTier(pathname: string): RateLimitTier {
  if (pathname.startsWith('/api/auth/')) return 'auth';
  if (pathname.startsWith('/api/')) return 'write';
  return 'public';
}
