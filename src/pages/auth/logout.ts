import type { APIRoute } from 'astro';
import { createServerClient } from '@/lib/supabase/server';

export const POST: APIRoute = async ({ cookies, request, redirect }) => {
  const db = createServerClient(cookies);

  try {
    await db.auth.signOut({ scope: 'global' });
  } catch (err) {
    console.error('[auth/logout] Supabase signOut error:', err);
  }

  const rawCookieHeader = request.headers.get('cookie') ?? '';
  for (const pair of rawCookieHeader.split(';')) {
    const name = pair.split('=')[0]?.trim();
    if (!name) continue;
    if (name.startsWith('sb-')) {
      cookies.delete(name, { path: '/' });
    }
  }

  return redirect('/', 302);
};
