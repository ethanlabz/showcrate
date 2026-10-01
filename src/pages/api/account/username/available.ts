import type { APIRoute } from 'astro';
import { asyncHandler } from '@/lib/api/async-handler';
import { ok } from '@/lib/api/response';
import { createServerClient } from '@/lib/supabase/server';
import { usernameSchema } from '@/lib/validators/auth.schema';
import { UserRepository } from '@/lib/repositories/UserRepository';
import { checkRateLimit } from '@/lib/api/rate-limiter';

export const GET: APIRoute = asyncHandler(async ({ url, clientAddress, cookies }) => {
  const rawName = url.searchParams.get('name') ?? '';
  const trimmed = rawName.trim().toLowerCase();

  // Rate limit: 60 availability checks per minute per IP
  const rlKey = `username_available:${clientAddress || 'local'}`;
  const rl = checkRateLimit(rlKey, 60, 60 * 1000);
  if (!rl.allowed) {
    return new Response(
      JSON.stringify({
        status: 'unavailable',
        error: 'Too many requests. Please try again later.',
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': String(rl.retryAfter ?? 30),
        },
      },
    );
  }

  // Format and reserved check
  const parsed = usernameSchema.safeParse(trimmed);
  if (!parsed.success) {
    return ok({ status: 'invalid' });
  }

  const db = createServerClient(cookies);
  const userRepo = new UserRepository(db);

  try {
    const isAvailable = await userRepo.isUsernameAvailable(trimmed);
    return ok({
      status: isAvailable ? 'available' : 'unavailable',
    });
  } catch (err) {
    console.error('[username/available] Error checking availability:', err);
    return ok({ status: 'unavailable' });
  }
});
