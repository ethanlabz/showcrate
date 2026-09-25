/**
 * api/auth/oauth.ts — Initiate OAuth sign-in via Supabase
 *
 * POST { provider: 'github' | 'google', next?: string }
 *
 * Uses the server-side Supabase client so the PKCE code verifier is
 * stored in an httpOnly cookie (handled by @supabase/ssr).
 * Returns the provider redirect URL for the client to navigate to.
 */
import type { APIRoute } from 'astro';
import { asyncHandler } from '@/lib/api/async-handler';
import { ok, unprocessable } from '@/lib/api/response';
import { createServerClient } from '@/lib/supabase/server';
import { config } from '@/lib/config/unified-config';

const ALLOWED_PROVIDERS = ['github', 'google'] as const;
type OAuthProvider = (typeof ALLOWED_PROVIDERS)[number];

export const POST: APIRoute = asyncHandler(async ({ request, cookies }) => {
  const body = await request.json().catch(() => null);
  if (!body) return unprocessable('Invalid JSON body');

  const provider = body.provider as string;
  if (!ALLOWED_PROVIDERS.includes(provider as OAuthProvider)) {
    return unprocessable(`Invalid provider. Must be one of: ${ALLOWED_PROVIDERS.join(', ')}`);
  }

  const next = typeof body.next === 'string' ? body.next : '/';
  const siteUrl = new URL(request.url).origin || config.site?.url || 'http://localhost:4321';

  const db = createServerClient(cookies);

  const { data, error } = await db.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: `${siteUrl}/auth/callback?next=${encodeURIComponent(next)}`,
      // Scopes for richer profile data
      ...(provider === 'github' && { scopes: 'read:user user:email' }),
      ...(provider === 'google' && { scopes: 'openid email profile' }),
    },
  });

  if (error) {
    return unprocessable(error.message);
  }

  return ok({ url: data.url });
});
