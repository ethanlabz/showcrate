import type { APIRoute } from 'astro';
import { asyncHandler } from '@/lib/api/async-handler';
import { ok, unauthorized, forbidden } from '@/lib/api/response';
import { createServerClient } from '@/lib/supabase/server';
import { AnalyticsService } from '@/lib/services/analyticsService';
import { ProjectRepository } from '@/lib/repositories/ProjectRepository';

export const GET: APIRoute = asyncHandler(async ({ cookies, locals, params, url }) => {
  if (!locals.user) return unauthorized();

  const db = createServerClient(cookies);
  const projectRepo = new ProjectRepository(db);
  const project = await projectRepo.findById(params.projectId!);

  if (!project || project.owner_id !== locals.user.id) return forbidden();

  const days = Math.min(90, parseInt(url.searchParams.get('days') ?? '30', 10));
  const analyticsService = new AnalyticsService(db);
  const stats = await analyticsService.getProjectStats(params.projectId!, days);

  return ok({ stats });
});
