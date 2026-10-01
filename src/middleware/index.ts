/**
 * middleware/index.ts — Astro middleware chain
 *
 * Execution order per request:
 * 1. Rate limiting (IP-based, by tier)
 * 2. Static asset bypass
 * 3. Marketing route bypass (skip session resolution entirely; never call getUser())
 * 4. Reserved username route rejection (404 without DB query)
 * 5. Session resolution → Astro.locals.viewer (& locals.user alias)
 * 6. Strict username completion gate
 * 7. /dashboard and /dashboard/** guards & project scoping
 * 8. /auth/login & /auth/signup redirect for authenticated users
 * 9. /admin route guard
 * 10. Public project resolution (/{username}/{project}/**)
 * 11. next() → apply Cache-Control and X-Robots-Tag headers for /dashboard and /auth
 */
import { defineMiddleware } from 'astro:middleware';
import { z } from 'zod';
import { createServerClient } from '@/lib/supabase/server';
import { checkRateLimit, getTier } from './rate-limit';
import { isAdmin } from '@/types/auth';
import { resolveProject } from './project-resolver';
import { safeNext } from '@/lib/auth/safe-next';
import { isReservedUsername } from '@/lib/validators/auth.schema';
import type { SessionUser } from '@/types/auth';
import type { ProjectRow } from '@/types/database';
import { tooManyRequests, forbidden } from '@/lib/api/response';

// Extend Astro.locals type
declare global {
  namespace App {
    interface Locals {
      /** Authenticated user (Rule 3) */
      viewer: SessionUser | null;
      /** Alias for locals.viewer — backwards compatibility for existing API routes */
      user: SessionUser | null;
      /** Resolved project (ProjectRow or ResolvedProject) */
      project: ProjectRow | any | null;
      /** True if current viewer is the project owner */
      isOwner: boolean;
    }
  }
}

const MARKETING_ROUTES = new Set(['/', '/about', '/help', '/terms', '/privacy']);

export const onRequest = defineMiddleware(async (context, next) => {
  const { request, cookies, url, redirect, locals } = context;
  const pathname = url.pathname;

  // Initialize locals
  locals.viewer = null;
  locals.user = null;
  locals.project = null;
  locals.isOwner = false;

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

  // ── Step 2: Static assets and Vite client bundles bypass ───────────────
  const isStaticAsset =
    pathname.startsWith('/_astro/') ||
    pathname.startsWith('/@') ||
    pathname.startsWith('/favicon') ||
    /\.(svg|png|jpg|jpeg|webp|gif|css|js|woff2?|ico|txt)$/i.test(pathname);

  if (isStaticAsset) {
    return next();
  }

  // ── Step 3: Marketing routes skip session resolution entirely ──────────
  // Rule 3 exception: '/', '/about', '/help', '/terms', '/privacy' must remain
  // static-cacheable and must NEVER call getUser().
  if (MARKETING_ROUTES.has(pathname)) {
    return next();
  }

  // ── Step 4: Reserved username check for top-level routes ───────────────
  // Return 404 immediately, without a DB query, when segment is in reserved list.
  const pathSegments = pathname.split('/').filter(Boolean);
  if (pathSegments.length >= 1) {
    const firstSegment = pathSegments[0].toLowerCase();
    if (isReservedUsername(firstSegment)) {
      const allowedTopLevel = [
        'auth',
        'admin',
        'dashboard',
        'editor',
        'api',
        'showcase',
        'templates',
        'contact',
        'community',
        'blog',
        'changelog',
        'features',
        'guides',
        'playground',
        'security',
      ];
      if (!allowedTopLevel.includes(firstSegment)) {
        return new Response('Not Found', { status: 404 });
      }
    }
  }

  // ── Step 5: Session resolution ─────────────────────────────────────────
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

    const sessionUser: SessionUser = {
      id: authUser.id,
      email: authUser.email ?? '',
      username: profile?.username ?? null,
      displayName: profile?.display_name ?? null,
      avatarUrl: profile?.avatar_url ?? null,
      platformRole: profile?.platform_role ?? 'user',
    };
    locals.viewer = sessionUser;
    locals.user = sessionUser; // keep alias in sync
  }

  // ── Step 6: Strict username completion gate ────────────────────────────
  if (locals.viewer && !locals.viewer.username) {
    const isSocialSignupPage =
      pathname === '/auth/signup' && url.searchParams.get('social') === 'true';
    const isAuthCallback = pathname === '/auth/callback';
    const isSetUsernameApi = pathname === '/api/auth/set-username';
    const isLogout =
      pathname === '/api/auth/logout' || pathname === '/auth/logout';

    const isAllowed =
      isSocialSignupPage || isAuthCallback || isSetUsernameApi || isLogout;

    if (!isAllowed) {
      if (pathname.startsWith('/api/')) {
        return new Response(
          JSON.stringify({
            error: {
              code: 'USERNAME_REQUIRED',
              message: 'You must set up a username before performing any actions.',
            },
          }),
          {
            status: 403,
            headers: { 'Content-Type': 'application/json' },
          },
        );
      }

      const nextParam =
        pathname !== '/' && !pathname.startsWith('/auth/')
          ? `&next=${encodeURIComponent(url.pathname + url.search)}`
          : '';

      return redirect(`/auth/signup?social=true${nextParam}`, 302);
    }
  }

  // ── Step 7: /dashboard and /dashboard/** guards ────────────────────────
  if (pathname === '/dashboard' || pathname.startsWith('/dashboard/')) {
    if (!locals.viewer) {
      const fullTarget = pathname + url.search;
      const cappedTarget =
        fullTarget.length > 200 ? fullTarget.slice(0, 200) : fullTarget;
      const res = redirect(
        `/auth/login?next=${encodeURIComponent(cappedTarget)}`,
        302,
      );
      res.headers.set('Cache-Control', 'private, no-store');
      res.headers.set('X-Robots-Tag', 'noindex');
      return res;
    }

    // TODO(legal-age-gate)

    // Check project routes: /dashboard/projects/[id]/**
    const dashProjectMatch = pathname.match(
      /^\/dashboard\/projects\/([^/]+)(\/.*)?$/,
    );
    if (dashProjectMatch) {
      const projectId = dashProjectMatch[1];
      const uuidParsed = z.string().uuid().safeParse(projectId);
      if (!uuidParsed.success) {
        const res = new Response('Not Found', { status: 404 });
        res.headers.set('Cache-Control', 'private, no-store');
        res.headers.set('X-Robots-Tag', 'noindex');
        return res;
      }

      const { data: projectRow } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .eq('owner_id', locals.viewer.id)
        .is('deleted_at', null)
        .single();

      if (!projectRow) {
        // Return 404 with identical status and body as nonexistent id. Never 403.
        const res = new Response('Not Found', { status: 404 });
        res.headers.set('Cache-Control', 'private, no-store');
        res.headers.set('X-Robots-Tag', 'noindex');
        return res;
      }

      locals.project = projectRow;
      locals.isOwner = true;
    }
  }

  // ── Step 7b: /editor and /editor/** guards ───────────────────────────
  // Prompt 2 Section 0: Guarded prefixes are /dashboard/** AND /editor/**.
  // /editor/[projectId]/[...page] is owner-only.
  // Anonymous /editor/{id} redirects to login with validated next.
  // Non-owner and nonexistent /editor/{id} return identical 404 (never 403).
  if (pathname === '/editor' || pathname.startsWith('/editor/')) {
    if (!locals.viewer) {
      const fullTarget = pathname + url.search;
      const cappedTarget =
        fullTarget.length > 200 ? fullTarget.slice(0, 200) : fullTarget;
      const res = redirect(
        `/auth/login?next=${encodeURIComponent(cappedTarget)}`,
        302,
      );
      res.headers.set('Cache-Control', 'private, no-store');
      res.headers.set('X-Robots-Tag', 'noindex');
      return res;
    }

    const editorMatch = pathname.match(/^\/editor\/([^/]+)(\/.*)?$/);
    if (editorMatch) {
      const projectId = editorMatch[1];
      const uuidParsed = z.string().uuid().safeParse(projectId);
      if (!uuidParsed.success) {
        const res = new Response('Not Found', { status: 404 });
        res.headers.set('Cache-Control', 'private, no-store');
        res.headers.set('X-Robots-Tag', 'noindex');
        return res;
      }

      const { data: projectRow } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .eq('owner_id', locals.viewer.id)
        .is('deleted_at', null)
        .single();

      if (!projectRow) {
        const res = new Response('Not Found', { status: 404 });
        res.headers.set('Cache-Control', 'private, no-store');
        res.headers.set('X-Robots-Tag', 'noindex');
        return res;
      }

      locals.project = projectRow;
      locals.isOwner = true;
    } else {
      // Bare /editor navigates to dashboard
      return redirect('/dashboard', 302);
    }
  }

  // ── Step 8: /auth/login and /auth/signup redirect with viewer ──────────
  if (
    (pathname === '/auth/login' || pathname === '/auth/signup') &&
    locals.viewer &&
    locals.viewer.username &&
    url.searchParams.get('social') !== 'true'
  ) {
    const rawNext = url.searchParams.get('next');
    const target = safeNext(rawNext);
    const res = redirect(target, 302);
    res.headers.set('Cache-Control', 'private, no-store');
    res.headers.set('X-Robots-Tag', 'noindex');
    return res;
  }

  // ── Step 9: /admin route guard ─────────────────────────────────────────
  if (pathname.startsWith('/admin')) {
    if (!locals.viewer) {
      const res = redirect('/auth/login', 302);
      res.headers.set('Cache-Control', 'private, no-store');
      res.headers.set('X-Robots-Tag', 'noindex');
      return res;
    }
    if (!isAdmin(locals.viewer)) {
      if (pathname.startsWith('/api/')) return forbidden();
      return new Response('Forbidden', { status: 403 });
    }
  }

  // ── Step 10: Public project resolution (/{username}/{project}/**) ───────
  const publicProjectMatch = pathname.match(/^\/([^/]+)\/([^/]+)(\/.*)?$/);
  if (
    publicProjectMatch &&
    !pathname.startsWith('/api/') &&
    !pathname.startsWith('/admin') &&
    !pathname.startsWith('/auth') &&
    !pathname.startsWith('/dashboard') &&
    !pathname.startsWith('/editor')
  ) {
    const [, ownerUsername, projectSlug] = publicProjectMatch;
    if (!isReservedUsername(ownerUsername)) {
      const result = await resolveProject(
        supabase,
        ownerUsername!,
        projectSlug!,
        locals.viewer,
        pathname,
      );

      if (result === null) {
        return new Response('Not Found', { status: 404 });
      }

      if ('redirect' in result) {
        const redirectRes = redirect(result.redirect, 301);
        redirectRes.headers.set('Cache-Control', 'public, max-age=3600');
        return redirectRes;
      }

      locals.project = result.project;
      locals.isOwner = result.isOwner;
    }
  }

  // ── Step 11: Call next() and attach security / cache headers ───────────
  const response = await next();

  if (
    pathname === '/dashboard' ||
    pathname.startsWith('/dashboard/') ||
    pathname === '/editor' ||
    pathname.startsWith('/editor/') ||
    pathname === '/auth' ||
    pathname.startsWith('/auth/')
  ) {
    response.headers.set('Cache-Control', 'private, no-store');
    response.headers.set('X-Robots-Tag', 'noindex');
  }

  return response;
});
