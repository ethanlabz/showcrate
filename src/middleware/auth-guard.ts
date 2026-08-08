/**
 * middleware/auth-guard.ts — Route-level access control
 *
 * Called from the main middleware after session resolution.
 * Returns null if access is permitted, or a redirect/Response if denied.
 *
 * Role matrix (from README.md):
 *   /admin/**       → developer OR moderator (any admin)
 *   authenticated/* → any authenticated user (not banned)
 *   editor/settings → owner OR accepted collaborator (checked at route level)
 */
import type { SessionUser } from '@/types/auth';
import { isAdmin } from '@/types/auth';

export type GuardResult =
  | { allowed: true }
  | { allowed: false; redirectTo: string }
  | { allowed: false; status: 401 | 403 };

const AUTHENTICATED_PREFIXES = [
  '/new',
  '/notifications',
  '/settings',
];

const ADMIN_PREFIX = '/admin';

export function checkRouteAccess(
  pathname: string,
  user: SessionUser | null,
): GuardResult {
  // Admin routes: require developer or moderator
  if (pathname.startsWith(ADMIN_PREFIX)) {
    if (!user) return { allowed: false, redirectTo: '/auth/login' };
    if (!isAdmin(user)) return { allowed: false, status: 403 };
    return { allowed: true };
  }

  // Authenticated-only routes
  const isAuthRequired = AUTHENTICATED_PREFIXES.some((p) => pathname.startsWith(p));
  if (isAuthRequired) {
    if (!user) return { allowed: false, redirectTo: `/auth/login?next=${encodeURIComponent(pathname)}` };

    // Banned users can only access the appeal page (not implemented in v1 — block all)
    if (user.platformRole === 'banned') return { allowed: false, status: 403 };

    return { allowed: true };
  }

  // Public routes — always permitted
  return { allowed: true };
}

/**
 * Dynamic project-scoped route guard.
 * Checks if a path like /{username}/{project}/editor or /settings/* requires auth.
 */
export function isProjectAuthRequired(pathname: string): boolean {
  // Match /{username}/{project}/editor, /settings/*, /versions, /export
  return /^\/[^/]+\/[^/]+\/(editor|settings|versions|export)/.test(pathname);
}
