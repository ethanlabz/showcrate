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
export async function resolveProject(
  db: SupabaseClient<Database>,
  ownerUsername: string,
  projectSlug: string,
  currentUser: SessionUser | null,
  fullPath: string,
): Promise<ResolvedProject | null | { redirect: string }> {
  // 1. Find the owner by username (case-insensitive)
  const { data: owner } = await db
    .from('users')
    .select('*')
    .ilike('username', ownerUsername)
    .single();

  if (!owner) return null;

  // 2. Find the project
  let { data: project } = await db
    .from('projects')
    .select('*')
    .eq('owner_id', owner.id)
    .eq('slug', projectSlug)
    .is('deleted_at', null)
    .single();

  // 3. Check redirect table if not found (slug may have changed)
  if (!project) {
    const { data: redirect } = await db
      .from('project_redirects')
      .select('new_slug')
      .eq('owner_id', owner.id)
      .eq('old_slug', projectSlug)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (redirect) {
      // Build the new URL: replace old slug with new slug
      const newPath = fullPath.replace(
        `/${ownerUsername}/${projectSlug}`,
        `/${ownerUsername}/${redirect.new_slug}`,
      );
      return { redirect: newPath };
    }

    return null;
  }

  // 4. Access check for private/unlisted projects
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

  // Private projects: only owner/collaborator can see
  if (project.visibility === 'private' && !isOwner && !isCollaborator) {
    return null;
  }

  // Unpublished projects: only owner/collaborator can see
  if (!project.published && !isOwner && !isCollaborator) {
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
