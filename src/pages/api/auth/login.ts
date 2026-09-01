import type { APIRoute } from 'astro';
import { asyncHandler } from '@/lib/api/async-handler';
import { ok, unprocessable, unauthorized } from '@/lib/api/response';
import { createServerClient, createAdminClient } from '@/lib/supabase/server';
import { loginSchema } from '@/lib/validators/auth.schema';

export const POST: APIRoute = asyncHandler(async ({ request, cookies }) => {
  const body = await request.json().catch(() => null);
  if (!body) return unprocessable('Invalid JSON body');

  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return unprocessable(parsed.error.issues.map((i) => i.message).join(', '));
  }

  const { identifier, password } = parsed.data;
  const db = createServerClient(cookies);

  let emailToUse = identifier.trim();

  try {
    // If identifier does NOT contain '@', resolve username -> email
    if (!emailToUse.includes('@')) {
      const { data: userRow, error: userErr } = await db
        .from('users')
        .select('id')
        .eq('username', emailToUse.toLowerCase())
        .single();

      if (userErr || !userRow) {
        return unauthorized('Invalid username or password');
      }

      const adminDb = createAdminClient();
      const { data: authUser } = await adminDb.auth.admin.getUserById(userRow.id);
      if (!authUser?.user?.email) {
        return unauthorized('Invalid username or password');
      }

      emailToUse = authUser.user.email;
    }

    const { data, error } = await db.auth.signInWithPassword({
      email: emailToUse,
      password,
    });

    if (error || !data.user) {
      return unauthorized('Invalid username/email or password');
    }

    return ok({ userId: data.user.id });
  } catch (err: any) {
    if (err.message?.includes('fetch failed') || err.name === 'TypeError') {
      return unprocessable('Cannot connect to Supabase. Please ensure your .env file has valid SUPABASE_URL credentials.');
    }
    throw err;
  }
});
