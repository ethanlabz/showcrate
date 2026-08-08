import type { APIRoute } from 'astro';
import { asyncHandler } from '@/lib/api/async-handler';
import { ok } from '@/lib/api/response';
import { createServerClient } from '@/lib/supabase/server';

export const POST: APIRoute = asyncHandler(async ({ cookies }) => {
  const db = createServerClient(cookies);
  await db.auth.signOut();
  return ok({ message: 'Logged out successfully' });
});
