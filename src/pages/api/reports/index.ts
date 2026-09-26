import type { APIRoute } from 'astro';
import { asyncHandler } from '@/lib/api/async-handler';
import { ok, unauthorized, unprocessable } from '@/lib/api/response';
import { createServerClient } from '@/lib/supabase/server';
import { createReportSchema } from '@/lib/validators/report.schema';
import { ReportRepository } from '@/lib/repositories/ReportRepository';

export const POST: APIRoute = asyncHandler(async ({ request, cookies, locals }) => {
  if (!locals.user) return unauthorized();

  const body = await request.json().catch(() => null);
  if (!body) return unprocessable('Invalid JSON body');

  const parsed = createReportSchema.safeParse(body);
  if (!parsed.success) return unprocessable(parsed.error.issues.map((i) => i.message).join(', '));

  const db = createServerClient(cookies);
  const reportRepo = new ReportRepository(db);
  const report = await reportRepo.create(locals.user.id, parsed.data.projectId, parsed.data.reason);

  return ok({ report }, 201);
});
