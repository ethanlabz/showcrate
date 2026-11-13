import type { APIRoute } from 'astro';
import { asyncHandler } from '@/lib/api/async-handler';
import { ok, unauthorized } from '@/lib/api/response';
import { createServerClient, createAdminClient } from '@/lib/supabase/server';
import { AuthService } from '@/lib/services/authService';

export const DELETE: APIRoute = asyncHandler(async ({ cookies, locals }) => {
  if (!locals.user) return unauthorized();

  const db = createServerClient(cookies);
  const adminDb = createAdminClient();
  const authService = new AuthService(db, adminDb);

  await authService.deleteAccount(locals.user.id);
  await db.auth.signOut();

  return ok({ message: 'Account deleted' });
});
