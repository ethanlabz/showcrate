/**
 * middleware/auth-guard.ts — Route-level access control
 *
 * Called from the main middleware after session resolution.
 * Returns null if access is permitted, or a redirect/Response if denied.
 *
 * Role matrix (from overview.md):
 *   /admin/**       → developer OR admin
 *   /dashboard/**   → any authenticated user (not banned)
 *   /{username}/{project}/** → public read-only (owner-facing pages are under /dashboard/**)
 */
import type { SessionUser } from '@/types/auth';
import { isAdmin } from '@/types/auth';

export type GuardResult =
  | { allowed: true }
  | { allowed: false; redirectTo: string }
  | { allowed: false; status: 401 | 403 };

const ADMIN_PREFIX = '/admin';

export function checkRouteAccess(
  pathname: string,
  user: SessionUser | null,
): GuardResult {
  // Admin routes: require developer or admin
  if (pathname.startsWith(ADMIN_PREFIX)) {
    if (!user) return { allowed: false, redirectTo: '/auth/login' };
    if (!isAdmin(user)) return { allowed: false, status: 403 };
    return { allowed: true };
  }

  // Authenticated-only routes: /dashboard and /dashboard/**
  if (pathname === '/dashboard' || pathname.startsWith('/dashboard/')) {
    if (!user) {
      return {
        allowed: false,
        redirectTo: `/auth/login?next=${encodeURIComponent(pathname)}`,
      };
    }

    // Banned users can only access appeal page (not implemented in v1 — block all)
    if (user.platformRole === 'banned') return { allowed: false, status: 403 };

    return { allowed: true };
  }

  // Public routes — always permitted
  return { allowed: true };
}
