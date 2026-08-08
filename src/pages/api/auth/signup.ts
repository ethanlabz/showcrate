import type { APIRoute } from 'astro';
import { asyncHandler } from '@/lib/api/async-handler';
import { ok, unprocessable } from '@/lib/api/response';
import { createAdminClient, createServerClient } from '@/lib/supabase/server';
import { signupSchema } from '@/lib/validators/auth.schema';
import { AuthService } from '@/lib/services/authService';

export const POST: APIRoute = asyncHandler(async ({ request, cookies }) => {
  const body = await request.json().catch(() => null);
  if (!body) return unprocessable('Invalid JSON body');

  const parsed = signupSchema.safeParse(body);
  if (!parsed.success) {
    return unprocessable(parsed.error.issues.map((i) => i.message).join(', '));
  }

  const db = createServerClient(cookies);
  const adminDb = createAdminClient();
  const authService = new AuthService(db, adminDb);

  const { userId } = await authService.signup(parsed.data);
  return ok({ userId }, 201);
});
