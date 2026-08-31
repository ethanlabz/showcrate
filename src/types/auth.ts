/**
 * types/auth.ts — Auth and session types
 */
import type { PlatformRole } from './database';

/** The authenticated user stored in Astro.locals */
export interface SessionUser {
  id: string;
  email: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  platformRole: PlatformRole;
}

/** Type guard: is the user an admin (developer or moderator)? */
export function isAdmin(user: SessionUser): boolean {
  return user.platformRole === 'developer' || user.platformRole === 'moderator';
}

/** Type guard: is the user a developer? */
export function isDeveloper(user: SessionUser): boolean {
  return user.platformRole === 'developer';
}

/** Type guard: can the user create new projects? */
export function canCreateProjects(user: SessionUser): boolean {
  return !['restricted', 'banned'].includes(user.platformRole);
}
