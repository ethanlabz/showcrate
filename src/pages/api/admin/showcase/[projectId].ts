import type { APIRoute } from 'astro';
import { asyncHandler } from '@/lib/api/async-handler';
import { ok, unauthorized, forbidden, unprocessable } from '@/lib/api/response';
import { createAdminClient } from '@/lib/supabase/server';
import { featureProjectSchema } from '@/lib/validators/admin.schema';
import { AdminService } from '@/lib/services/adminService';
import { isAdmin } from '@/types/auth';

export const PATCH: APIRoute = asyncHandler(async ({ request, locals, params }) => {
  if (!locals.user) return unauthorized();
  if (!isAdmin(locals.user)) return forbidden();

  const body = await request.json().catch(() => null);
  if (!body) return unprocessable('Invalid JSON body');

  const parsed = featureProjectSchema.safeParse(body);
  if (!parsed.success) return unprocessable(parsed.error.issues.map((i) => i.message).join(', '));

  const adminDb = createAdminClient();
  const adminService = new AdminService(adminDb);
  await adminService.featureProject(locals.user.id, params.projectId!, parsed.data.featured);

  return ok({ message: parsed.data.featured ? 'Project featured' : 'Project unfeatured' });
});
