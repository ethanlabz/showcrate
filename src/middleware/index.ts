/**
 * middleware/index.ts — Astro middleware chain
 *
 * Execution order per request:
 * 1. Rate limiting (IP-based, by tier)
 * 2. Session resolution → Astro.locals.user
 * 3. Route guard → redirect or 403 if access denied
 * 4. Project resolution → Astro.locals.project (for project-scoped routes)
 * 5. next() → continue to page/route handler
 */
import { defineMiddleware } from 'astro:middleware';
import { createServerClient } from '@/lib/supabase/server';
import { checkRateLimit, getTier } from './rate-limit';
import { checkRouteAccess, isProjectAuthRequired } from './auth-guard';
import { resolveProject } from './project-resolver';
import type { SessionUser } from '@/types/auth';
import type { ResolvedProject } from './project-resolver';
import { tooManyRequests, forbidden } from '@/lib/api/response';

// Extend Astro.locals type
declare global {
  namespace App {
    interface Locals {
      user: SessionUser | null;
      project: ResolvedProject | null;
    }
  }
}

export const onRequest = defineMiddleware(async (context, next) => {
  const { request, cookies, url, redirect, locals } = context;
  const pathname = url.pathname;

  // Initialize locals
  locals.user = null;
  locals.project = null;

  // ── Step 1: Rate limiting ─────────────────────────────────────────────
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    'unknown';

  const tier = getTier(pathname);
  const rateLimitKey = tier === 'write' ? `write:${ip}` : `${tier}:${ip}`;

  if (!checkRateLimit(rateLimitKey, tier)) {
    // Return 429 for API routes, redirect for page routes
    if (pathname.startsWith('/api/')) {
      return tooManyRequests();
    }
    return new Response('Too many requests. Please wait a moment.', { status: 429 });
  }

  // ── Step 2: Session resolution ────────────────────────────────────────
  const supabase = createServerClient(cookies);
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (authUser) {
    // Fetch the public profile (platform_role, username, etc.)
    const { data: profile } = await supabase
      .from('users')
      .select('username, display_name, avatar_url, platform_role')
      .eq('id', authUser.id)
      .single();

    if (profile) {
      locals.user = {
        id: authUser.id,
        email: authUser.email ?? '',
        username: profile.username,
        displayName: profile.display_name,
        avatarUrl: profile.avatar_url,
        platformRole: profile.platform_role,
      };
    }
  }

  // ── Step 3: Route guard ────────────────────────────────────────────────
  const guardResult = checkRouteAccess(pathname, locals.user);
  if (!guardResult.allowed) {
    if ('redirectTo' in guardResult) {
      return redirect(guardResult.redirectTo, 302);
    }
    if (pathname.startsWith('/api/')) {
      return guardResult.status === 403 ? forbidden() : new Response('Unauthorized', { status: 401 });
    }
    return redirect('/auth/login', 302);
  }

  // ── Step 4: Project resolution ─────────────────────────────────────────
  // Match /{username}/{project}/* pattern
  const projectRouteMatch = pathname.match(/^\/([^/]+)\/([^/]+)(\/.*)?$/);
  if (
    projectRouteMatch &&
    !pathname.startsWith('/api/') &&
    !pathname.startsWith('/admin') &&
    !pathname.startsWith('/auth') &&
    !pathname.startsWith('/settings') &&
    !pathname.startsWith('/new') &&
    !pathname.startsWith('/notifications') &&
    !pathname.startsWith('/showcase') &&
    !pathname.startsWith('/templates')
  ) {
    const [, ownerUsername, projectSlug] = projectRouteMatch;

    const result = await resolveProject(
      supabase,
      ownerUsername!,
      projectSlug!,
      locals.user,
      pathname,
    );

    if (result === null) {
      // Project doesn't exist or user lacks access → 404
      return new Response('Not Found', { status: 404 });
    }

    if ('redirect' in result) {
      // Slug changed → 301 redirect
      return redirect(result.redirect, 301);
    }

    // Check if auth is required for this project sub-route
    if (isProjectAuthRequired(pathname) && !result.canWrite) {
      if (!locals.user) return redirect(`/auth/login?next=${encodeURIComponent(pathname)}`, 302);
      return new Response('Forbidden', { status: 403 });
    }

    locals.project = result;
  }

  return next();
});
