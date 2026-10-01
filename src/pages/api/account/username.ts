import type { APIRoute } from 'astro';
import { z } from 'zod';
import { asyncHandler } from '@/lib/api/async-handler';
import { ok, unauthorized, unprocessable } from '@/lib/api/response';
import { createAdminClient } from '@/lib/supabase/server';
import { usernameSchema } from '@/lib/validators/auth.schema';
import { checkRateLimit } from '@/lib/api/rate-limiter';

/**
 * Seam for public edge/CDN cache invalidation.
 * Called when a username changes to invalidate old and new paths.
 */
export async function purgePublicPaths(paths: string[]): Promise<void> {
  // In v1, this is a clean no-op seam ready for Netlify Purge API / Edge handler.
  // Flagged in execution report.
  if (process.env.NODE_ENV === 'development') {
    console.log('[purgePublicPaths] Purging cache for paths:', paths);
  }
}

const changeUsernameSchema = z.object({
  username: usernameSchema,
});

export const POST: APIRoute = asyncHandler(async ({ request, clientAddress, locals }) => {
  const viewer = locals.viewer ?? locals.user;
  if (!viewer) return unauthorized();

  // Rate limit: 5 changes per 10 minutes per user/IP
  const rlKey = `username_change:${viewer.id}:${clientAddress || 'local'}`;
  const rl = checkRateLimit(rlKey, 5, 10 * 60 * 1000);
  if (!rl.allowed) {
    return new Response(
      JSON.stringify({
        error: 'Too many requests. Please try again later.',
        retryAfter: rl.retryAfter,
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': String(rl.retryAfter ?? 60),
        },
      },
    );
  }

  const body = await request.json().catch(() => null);
  if (!body) return unprocessable('Invalid JSON body');

  const parsed = changeUsernameSchema.safeParse(body);
  if (!parsed.success) {
    return new Response(
      JSON.stringify({
        error: parsed.error.issues.map((i) => i.message).join(', '),
      }),
      {
        status: 422,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }

  const newUsername = parsed.data.username.toLowerCase();
  const oldUsername = viewer.username?.toLowerCase();

  const adminDb = createAdminClient();

  try {
    const { error } = await adminDb.rpc('change_username', {
      p_user: viewer.id,
      p_new: newUsername,
    });

    if (error) {
      throw error;
    }

    // Call cache invalidation seam for old and new public paths
    if (oldUsername) {
      await purgePublicPaths([`/${oldUsername}`, `/${newUsername}`]);
    }

    return ok({
      message: 'Username updated successfully',
      username: newUsername,
    });
  } catch (err: any) {
    const msg = err.message || '';
    const code = err.code || '';

    // Cooldown check (P0008)
    if (msg.includes('cooldown') || code === 'P0008') {
      const match = msg.match(/cooldown active until (.+)$/);
      const nextAllowedDate = match ? match[1] : undefined;
      return new Response(
        JSON.stringify({
          error: 'Username change is on cooldown',
          nextAllowedDate,
        }),
        {
          status: 429,
          headers: { 'Content-Type': 'application/json' },
        },
      );
    }

    // Taken or held check (P0009)
    if (
      msg.includes('taken') ||
      msg.includes('held') ||
      msg.includes('already taken') ||
      code === 'P0009'
    ) {
      return new Response(
        JSON.stringify({
          error: 'Username is unavailable',
        }),
        {
          status: 409,
          headers: { 'Content-Type': 'application/json' },
        },
      );
    }

    // Same username check (P0007)
    if (msg.includes('same as current') || code === 'P0007') {
      return new Response(
        JSON.stringify({
          error: 'New username must be different from current username',
        }),
        {
          status: 422,
          headers: { 'Content-Type': 'application/json' },
        },
      );
    }

    return unprocessable(msg || 'Failed to change username');
  }
});
