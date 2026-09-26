import type { APIRoute } from 'astro';
import { asyncHandler } from '@/lib/api/async-handler';
import { ok, unauthorized, forbidden } from '@/lib/api/response';
import { createAdminClient } from '@/lib/supabase/server';
import { AdminService } from '@/lib/services/adminService';
import { isAdmin } from '@/types/auth';

export const GET: APIRoute = asyncHandler(async ({ locals, url }) => {
  if (!locals.user) return unauthorized();
  if (!isAdmin(locals.user)) return forbidden();

  const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1', 10));
  const actorId = url.searchParams.get('actorId') ?? undefined;
  const targetType = url.searchParams.get('targetType') ?? undefined;

  const adminDb = createAdminClient();
  const adminService = new AdminService(adminDb);
  const result = await adminService.getAuditLog(page, 50, { actorId, targetType });

  return ok(result);
});
