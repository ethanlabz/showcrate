import type { APIRoute } from 'astro';
import { asyncHandler } from '@/lib/api/async-handler';
import { ok, unauthorized, forbidden } from '@/lib/api/response';
import { createAdminClient } from '@/lib/supabase/server';
import { isAdmin } from '@/types/auth';

export const GET: APIRoute = asyncHandler(async ({ locals, url }) => {
  if (!locals.user) return unauthorized();
  if (!isAdmin(locals.user)) return forbidden();

  const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1', 10));
  const limit = Math.min(100, parseInt(url.searchParams.get('limit') ?? '50', 10));
  const offset = (page - 1) * limit;

  const adminDb = createAdminClient();
  const { data, count, error } = await adminDb
    .from('projects')
    .select('*', { count: 'exact' })
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;
  return ok({ projects: data ?? [], total: count ?? 0, page, limit });
});
