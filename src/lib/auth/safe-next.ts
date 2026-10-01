/**
 * src/lib/auth/safe-next.ts
 *
 * Validates and sanitizes the `next` redirect target.
 *
 * Rules:
 * 1. URL-decoded exactly once before validation.
 * 2. Must start with `/dashboard` (as a proper route path segment: `/dashboard`, `/dashboard/...`, `/dashboard?...`, `/dashboard#...`).
 * 3. Must not start with `//`.
 * 4. Must not contain `\`.
 * 5. Must not contain control characters (ASCII 0-31, 127).
 * 6. Must not contain `://`.
 *
 * Anything failing validation resolves to `/dashboard`.
 */

export function safeNext(rawUrl: string | null | undefined): string {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return '/dashboard';
  }

  let decoded: string;
  try {
    decoded = decodeURIComponent(rawUrl);
  } catch {
    return '/dashboard';
  }

  // Must not start with //
  if (decoded.startsWith('//')) {
    return '/dashboard';
  }

  // Must not contain \
  if (decoded.includes('\\')) {
    return '/dashboard';
  }

  // Must not contain ://
  if (decoded.includes('://')) {
    return '/dashboard';
  }

  // Must not contain control characters
  // eslint-disable-next-line no-control-regex
  if (/[\x00-\x1F\x7F]/.test(decoded)) {
    return '/dashboard';
  }

  // Must start with /dashboard as a distinct path segment
  // E.g. /dashboard, /dashboard/, /dashboard/new, /dashboard?param=1, /dashboard#section
  // Values like /dashboardx or /dashboards resolve to /dashboard
  if (
    decoded !== '/dashboard' &&
    !decoded.startsWith('/dashboard/') &&
    !decoded.startsWith('/dashboard?') &&
    !decoded.startsWith('/dashboard#')
  ) {
    return '/dashboard';
  }

  return decoded;
}
