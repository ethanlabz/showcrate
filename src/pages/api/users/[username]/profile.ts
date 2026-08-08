import type { APIRoute } from 'astro';
import { asyncHandler } from '@/lib/api/async-handler';
import { ok, unauthorized, forbidden, unprocessable } from '@/lib/api/response';
import { createServerClient } from '@/lib/supabase/server';
import { updateProfileSchema } from '@/lib/validators/user.schema';
import { UserRepository } from '@/lib/repositories/UserRepository';

export const PATCH: APIRoute = asyncHandler(async ({ request, cookies, locals, params }) => {
  if (!locals.user) return unauthorized();
  if (locals.user.username.toLowerCase() !== (params.username ?? '').toLowerCase()) return forbidden();

  const body = await request.json().catch(() => null);
  if (!body) return unprocessable('Invalid JSON body');

  const parsed = updateProfileSchema.safeParse(body);
  if (!parsed.success) return unprocessable(parsed.error.issues.map((i) => i.message).join(', '));

  const db = createServerClient(cookies);
  const userRepo = new UserRepository(db);
  const user = await userRepo.updateProfile(locals.user.id, parsed.data);

  return ok({ user });
});
