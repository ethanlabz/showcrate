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

/** Type guard: is the user on Pro tier? */
export function isPro(user: SessionUser): boolean {
  return user.platformRole === 'pro' || user.platformRole === 'developer';
}

/** Plan limits per role */
export const PLAN_LIMITS = {
  user: { maxProjects: 7, maxCollaborators: 5, maxVersionSnapshots: 10 },
  pro: { maxProjects: Infinity, maxCollaborators: Infinity, maxVersionSnapshots: Infinity },
  developer: { maxProjects: Infinity, maxCollaborators: Infinity, maxVersionSnapshots: Infinity },
  moderator: { maxProjects: Infinity, maxCollaborators: Infinity, maxVersionSnapshots: Infinity },
  restricted: { maxProjects: 0, maxCollaborators: 0, maxVersionSnapshots: 10 },
  banned: { maxProjects: 0, maxCollaborators: 0, maxVersionSnapshots: 0 },
} as const satisfies Record<PlatformRole, { maxProjects: number; maxCollaborators: number; maxVersionSnapshots: number }>;

export function getPlanLimits(role: PlatformRole) {
  return PLAN_LIMITS[role];
}
