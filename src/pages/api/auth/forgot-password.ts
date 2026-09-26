import type { APIRoute } from 'astro';
import { asyncHandler } from '@/lib/api/async-handler';
import { ok, unprocessable } from '@/lib/api/response';
import { createServerClient } from '@/lib/supabase/server';
import { forgotPasswordSchema } from '@/lib/validators/auth.schema';
import { config } from '@/lib/config/unified-config';

export const POST: APIRoute = asyncHandler(async ({ request, cookies }) => {
  const body = await request.json().catch(() => null);
  if (!body) return unprocessable('Invalid JSON body');

  const parsed = forgotPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return unprocessable(parsed.error.issues.map((i) => i.message).join(', '));
  }

  const db = createServerClient(cookies);
  const config_site_url = config.site?.url ?? 'http://localhost:4321';

  await db.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${config_site_url}/auth/reset-password`,
  });

  return ok({ message: 'If an account with that email exists, a reset link has been sent.' });
});
