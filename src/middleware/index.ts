/**
 * middleware/index.ts — Astro middleware chain
 *
 * Execution order per request:
 * 1. Rate limiting (IP-based, by tier)
 * 2. Session resolution → Astro.locals.user
 * 3. Route guard → redirect or 403 if access denied
 * 4. Project resolution → Astro.locals.project (for project-scoped routes)
 * 5. next() → continue to page/route handler
 *
 * ─── LOCALS SHAPE NOTE ─────────────────────────────────────────────────────
 * Overview.md Critical Rule #3 specifies locals.viewer / locals.isOwner.
 * This middleware currently sets locals.USER (not locals.viewer).
 * THE MISMATCH IS INTENTIONAL HERE PENDING A TEAM DECISION:
 *   - locals.user  → the authenticated SessionUser (set here)
 *   - locals.viewer → ALIAS for locals.user (added for forward-compat)
 *   - locals.isOwner is resolved per-project inside project-resolver.ts
 *     and exposed via locals.project.isOwner — not as a top-level local.
 * TODO: Decide on canonical name (user vs viewer) and update both here and
 * all consuming pages/routes. Until then, locals.user is the real shape.
 * ────────────────────────────────────────────────────────────────────────────
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
      /** Authenticated user. Canonical name. See LOCALS SHAPE NOTE above. */
      user: SessionUser | null;
      /** Alias for locals.user — matches Overview.md Critical Rule #3 naming */
      viewer: SessionUser | null;
      project: ResolvedProject | null;
    }
  }
}

export const onRequest = defineMiddleware(async (context, next) => {
  const { request, cookies, url, redirect, locals } = context;
  const pathname = url.pathname;

  // Initialize locals
  locals.user = null;
  locals.viewer = null;
  locals.project = null;

  // ── Step 1: Rate limiting ─────────────────────────────────────────────
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    'unknown';

  const tier = getTier(pathname);
  const rateLimitKey = tier === 'write' ? `write:${ip}` : `${tier}:${ip}`;

  if (!checkRateLimit(rateLimitKey, tier)) {
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
    const { data: profile } = await supabase
      .from('users')
      .select('username, display_name, avatar_url, platform_role')
      .eq('id', authUser.id)
      .single();

    if (profile) {
      const sessionUser: SessionUser = {
        id: authUser.id,
        email: authUser.email ?? '',
        username: profile.username,
        displayName: profile.display_name,
        avatarUrl: profile.avatar_url,
        platformRole: profile.platform_role,
      };
      locals.user = sessionUser;
      locals.viewer = sessionUser; // keep both names in sync
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
      return new Response('Not Found', { status: 404 });
    }

    if ('redirect' in result) {
      return redirect(result.redirect, 301);
    }

    if (isProjectAuthRequired(pathname) && !result.canWrite) {
      if (!locals.user) return redirect(`/auth/login?next=${encodeURIComponent(pathname)}`, 302);
      return new Response('Forbidden', { status: 403 });
    }

    locals.project = result;
  }

  return next();
});
