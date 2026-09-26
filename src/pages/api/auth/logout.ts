import type { APIRoute } from 'astro';
import { asyncHandler } from '@/lib/api/async-handler';
import { ok } from '@/lib/api/response';
import { createServerClient } from '@/lib/supabase/server';

export const POST: APIRoute = asyncHandler(async ({ cookies, request }) => {
  const db = createServerClient(cookies);

  // 1. Invalidate session on Supabase — scope:'global' revokes all sessions
  //    for this user (not just the current device/tab)
  try {
    await db.auth.signOut({ scope: 'global' });
  } catch (err) {
    console.error('Supabase signOut error:', err);
  }

  // 2. Force-clear Supabase auth cookies from the response.
  //    Belt-and-suspenders in case signOut's remove hook misses any.
  const rawCookieHeader = request.headers.get('cookie') ?? '';
  for (const pair of rawCookieHeader.split(';')) {
    // Trim both the pair AND the extracted name — the Cookie header can have
    // leading spaces before the name after each semicolon.
    const name = pair.split('=')[0]?.trim();
    if (!name) continue;
    // Only target Supabase's own cookies (sb- prefix) to avoid nuking
    // unrelated cookies that happen to contain the word "auth".
    if (name.startsWith('sb-')) {
      cookies.delete(name, { path: '/' });
    }
  }

  return ok({ message: 'Logged out successfully' });
});
