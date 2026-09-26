import type { APIRoute } from 'astro';
import { asyncHandler } from '@/lib/api/async-handler';
import { ok, unprocessable, unauthorized } from '@/lib/api/response';
import { createServerClient } from '@/lib/supabase/server';
import { resetPasswordSchema } from '@/lib/validators/auth.schema';

export const POST: APIRoute = asyncHandler(async ({ request, cookies }) => {
  const body = await request.json().catch(() => null);
  if (!body) return unprocessable('Invalid JSON body');

  const parsed = resetPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return unprocessable(parsed.error.issues.map((i) => i.message).join(', '));
  }

  const db = createServerClient(cookies);

  // Supabase establishes a session from the recovery token in the URL hash
  // before the client submits this form. The server-side session is already live
  // via the cookie that the Supabase JS client exchanges the token hash for.
  const { error } = await db.auth.updateUser({ password: parsed.data.password });

  if (error) {
    if (error.message.toLowerCase().includes('session')) {
      return unauthorized('Reset link has expired. Please request a new one.');
    }
    throw error;
  }

  return ok({ message: 'Password updated successfully.' });
});
