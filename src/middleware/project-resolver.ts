/**
 * middleware/project-resolver.ts — Project + permission resolution
 *
 * For all /{username}/{project}/* routes, resolves:
 * - The project owner (by username)
 * - The project (by owner_id + slug)
 * - Whether the current user has write access (owner or accepted collaborator)
 * - 301 redirect if the slug has changed
 *
 * Populates Astro.locals.project so all project-scoped routes
 * can read project data without their own DB queries.
 */
import type { AstroCookies } from 'astro';
import type { Database, ProjectRow, UserRow } from '@/types/database';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { SessionUser } from '@/types/auth';

export interface ResolvedProject {
  project: ProjectRow;
  owner: UserRow;
  /** True if the current user is the project owner */
  isOwner: boolean;
  /** True if the current user is an accepted collaborator */
  isCollaborator: boolean;
  /** True if the current user can write doc pages (Owners only) */
  canWrite: boolean;
}

/**
 * Resolve project context from URL segments.
 * Returns null if the project doesn't exist or isn't accessible.
 * Returns a redirect URL string if the slug has changed.
 */
import { isReservedUsername } from '@/lib/validators/auth.schema';
import {
  resolveCanonical,
  createSupabaseCanonicalAdapter,
} from '@/lib/routing/resolve-canonical';

export async function resolveProject(
  db: SupabaseClient<Database>,
  ownerUsername: string,
  projectSlug: string,
  currentUser: SessionUser | null,
  fullPath: string,
): Promise<ResolvedProject | null | { redirect: string }> {
  // Extract remaining path after /{username}/{project}
  const prefix = `/${ownerUsername}/${projectSlug}`;
  const remainingPath = fullPath.startsWith(prefix) ? fullPath.slice(prefix.length) : '';

  const adapter = createSupabaseCanonicalAdapter(db);
  const canonical = await resolveCanonical(ownerUsername, projectSlug, adapter, {
    remainingPath,
  });

  if (canonical.status === 'notfound') {
    return null;
  }

  if (canonical.status === 'redirect') {
    return { redirect: canonical.location };
  }

  // 1. Fetch full owner and project rows
  const [ownerRes, projectRes] = await Promise.all([
    db.from('users').select('*').eq('id', canonical.ownerId).single(),
    db
      .from('projects')
      .select('*')
      .eq('owner_id', canonical.ownerId)
      .eq('slug', canonical.canonicalProjectSlug!)
      .is('deleted_at', null)
      .single(),
  ]);

  if (!ownerRes.data || !projectRes.data) return null;

  const owner = ownerRes.data;
  const project = projectRes.data;

  // 2. Access check for private/unlisted projects
  const isOwner = currentUser?.id === owner.id;

  let isCollaborator = false;
  if (!isOwner && currentUser) {
    const { data: collab } = await db
      .from('project_collaborators')
      .select('id')
      .eq('project_id', project.id)
      .eq('user_id', currentUser.id)
      .not('accepted_at', 'is', null)
      .single();

    isCollaborator = !!collab;
  }

  // Private projects: only the owner can see (returns 404 to everyone else)
  if (project.visibility === 'private' && !isOwner) {
    return null;
  }

  // Unpublished projects: only owner can see
  if (!project.published && !isOwner) {
    return null;
  }

  return {
    project,
    owner,
    isOwner,
    isCollaborator,
    canWrite: isOwner,
  };
}
