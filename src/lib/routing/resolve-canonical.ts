/**
 * src/lib/routing/resolve-canonical.ts
 *
 * Deterministic canonical URL resolver for username and project slugs.
 * Implements Prompt 2 Section 6:
 *
 * 1. Reserved name: notfound, no DB query.
 * 2. Username found in users: continue.
 * 3. Else found in username_redirects: owner is that user_id; canonical username = current users.username.
 * 4. For project segment: if slug is not live for that owner, check project_redirects for new_slug.
 * 5. If anything changed, return ONE 301 to the final canonical URL (preserving remaining path and query).
 * 6. Redirects carry Cache-Control: public, max-age=3600.
 */

import { isReservedUsername } from '../validators/auth.schema.ts';

export type CanonicalResolution =
  | { status: 'notfound' }
  | {
      status: 'ok';
      ownerId: string;
      canonicalUsername: string;
      canonicalProjectSlug?: string;
    }
  | {
      status: 'redirect';
      location: string;
      canonicalUsername: string;
      canonicalProjectSlug?: string;
    };

export interface CanonicalLookupAdapter {
  findUserByUsername(username: string): Promise<{ id: string; username: string } | null>;
  findUserById(userId: string): Promise<{ id: string; username: string } | null>;
  findUsernameRedirect(oldUsername: string): Promise<{ old_username: string; user_id: string } | null>;
  findLiveProject(ownerId: string, slug: string): Promise<{ id: string; slug: string } | null>;
  findProjectRedirect(ownerId: string, oldSlug: string): Promise<{ new_slug: string } | null>;
}

export interface ResolveCanonicalOptions {
  remainingPath?: string;
  searchParams?: string;
}

export async function resolveCanonical(
  rawUsername: string,
  projectSlug?: string,
  adapter?: CanonicalLookupAdapter,
  options?: ResolveCanonicalOptions,
): Promise<CanonicalResolution> {
  const cleanUsername = rawUsername.trim();
  const lowerUsername = cleanUsername.toLowerCase();

  // 1. Reserved name check: notfound immediately, no DB query.
  if (isReservedUsername(cleanUsername)) {
    return { status: 'notfound' };
  }

  if (!adapter) {
    return { status: 'notfound' };
  }

  // 2. Find user in `users`
  let owner: { id: string; username: string } | null = null;
  let usernameChanged = false;

  const directUser = await adapter.findUserByUsername(lowerUsername);
  if (directUser) {
    owner = directUser;
    // Check if URL used a case variant that differs from canonical username
    if (directUser.username !== cleanUsername) {
      usernameChanged = true;
    }
  } else {
    // 3. Else find in `username_redirects`
    const redirectRow = await adapter.findUsernameRedirect(lowerUsername);
    if (!redirectRow) {
      return { status: 'notfound' };
    }

    const canonicalUser = await adapter.findUserById(redirectRow.user_id);
    if (!canonicalUser) {
      return { status: 'notfound' };
    }

    owner = canonicalUser;
    usernameChanged = true;
  }

  let canonicalSlug = projectSlug;
  let slugChanged = false;

  // 4. For project segment: check if live or in project_redirects
  if (projectSlug) {
    const liveProject = await adapter.findLiveProject(owner.id, projectSlug);
    if (liveProject) {
      canonicalSlug = liveProject.slug;
      if (liveProject.slug !== projectSlug) {
        slugChanged = true;
      }
    } else {
      const projectRedirect = await adapter.findProjectRedirect(owner.id, projectSlug);
      if (!projectRedirect) {
        return { status: 'notfound' };
      }
      canonicalSlug = projectRedirect.new_slug;
      slugChanged = true;
    }
  }

  // 5. If anything changed, return ONE 301 to final canonical URL
  if (usernameChanged || slugChanged) {
    let location = `/${owner.username}`;
    if (canonicalSlug) {
      location += `/${canonicalSlug}`;
    }
    if (options?.remainingPath) {
      location += options.remainingPath;
    }
    if (options?.searchParams) {
      const q = options.searchParams.startsWith('?')
        ? options.searchParams
        : `?${options.searchParams}`;
      location += q;
    }

    return {
      status: 'redirect',
      location,
      canonicalUsername: owner.username,
      canonicalProjectSlug: canonicalSlug,
    };
  }

  return {
    status: 'ok',
    ownerId: owner.id,
    canonicalUsername: owner.username,
    canonicalProjectSlug: canonicalSlug,
  };
}

export function createSupabaseCanonicalAdapter(
  db: any,
): CanonicalLookupAdapter {
  return {
    async findUserByUsername(username: string) {
      const { data, error } = await db
        .from('users')
        .select('id, username')
        .ilike('username', username)
        .single();
      if (error || !data) return null;
      return data;
    },
    async findUserById(userId: string) {
      const { data, error } = await db
        .from('users')
        .select('id, username')
        .eq('id', userId)
        .single();
      if (error || !data) return null;
      return data;
    },
    async findUsernameRedirect(oldUsername: string) {
      const { data, error } = await db
        .from('username_redirects')
        .select('old_username, user_id')
        .eq('old_username', oldUsername.toLowerCase())
        .single();
      if (error || !data) return null;
      return data;
    },
    async findLiveProject(ownerId: string, slug: string) {
      const { data, error } = await db
        .from('projects')
        .select('id, slug')
        .eq('owner_id', ownerId)
        .eq('slug', slug)
        .is('deleted_at', null)
        .single();
      if (error || !data) return null;
      return data;
    },
    async findProjectRedirect(ownerId: string, oldSlug: string) {
      const { data, error } = await db
        .from('project_redirects')
        .select('new_slug')
        .eq('owner_id', ownerId)
        .eq('old_slug', oldSlug)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      if (error || !data) return null;
      return data;
    },
  };
}
