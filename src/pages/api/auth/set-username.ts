/**
 * api/auth/set-username.ts — Set username for a new OAuth user
 *
 * Called by SocialUsernameForm after GitHub/Google signup.
 * The user is already authenticated (session exists) but their
 * public.users row has no username yet.
 *
 * POST { username: string }
 */
import type { APIRoute } from 'astro';
import { asyncHandler } from '@/lib/api/async-handler';
import { ok, unauthorized, unprocessable, conflict } from '@/lib/api/response';
import { createServerClient } from '@/lib/supabase/server';
import { usernameSchema } from '@/lib/validators/auth.schema';
import { UserRepository } from '@/lib/repositories/UserRepository';

export const POST: APIRoute = asyncHandler(async ({ request, cookies }) => {
  // 1. Verify the caller has an active session
  const supabase = createServerClient(cookies);
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) return unauthorized('You must be signed in to set a username');

  // 2. Parse and validate the body
  const body = await request.json().catch(() => null);
  if (!body) return unprocessable('Invalid JSON body');

  const parsed = usernameSchema.safeParse(body.username);
  if (!parsed.success) {
    return unprocessable(parsed.error.issues[0]?.message ?? 'Invalid username');
  }

  const username = parsed.data;

  // 3. Check the user doesn't already have a username (idempotency guard)
  const userRepo = new UserRepository(supabase as any);
  const existing = await userRepo.findById(authUser.id);
  if (existing?.username) {
    return conflict('You already have a username', 'USERNAME_ALREADY_SET');
  }

  // 4. Check availability (case-insensitive)
  const available = await userRepo.isUsernameAvailable(username);
  if (!available) {
    return conflict('This username is already taken', 'USERNAME_TAKEN');
  }

  // 5. Write to DB
  const { error: updateError } = await supabase
    .from('users')
    .update({ username })
    .eq('id', authUser.id);

  if (updateError) throw updateError;

  return ok({ username });
});
