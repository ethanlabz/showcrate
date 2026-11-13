import type { APIRoute } from 'astro';
import { asyncHandler } from '@/lib/api/async-handler';
import { ok, unauthorized, forbidden, unprocessable } from '@/lib/api/response';
import { createServerClient } from '@/lib/supabase/server';
import { createProjectSchema } from '@/lib/validators/project.schema';
import { ProjectService } from '@/lib/services/projectService';
import { canCreateProjects } from '@/types/auth';

export const POST: APIRoute = asyncHandler(async ({ request, cookies, locals }) => {
  if (!locals.user) return unauthorized();
  if (!canCreateProjects(locals.user)) return forbidden('Your account cannot create projects');

  const body = await request.json().catch(() => null);
  if (!body) return unprocessable('Invalid JSON body');

  const parsed = createProjectSchema.safeParse(body);
  if (!parsed.success) return unprocessable(parsed.error.issues.map((i) => i.message).join(', '));

  const db = createServerClient(cookies);
  const projectService = new ProjectService(db);
  const project = await projectService.createProject(locals.user.id, parsed.data);

  return ok({ project }, 201);
});

// GET /api/projects?search=&page= — public showcase
export const GET: APIRoute = asyncHandler(async ({ url, cookies }) => {
  const search = url.searchParams.get('search') ?? undefined;
  const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1', 10));

  const db = createServerClient(cookies);
  const { ProjectRepository } = await import('@/lib/repositories/ProjectRepository');
  const projectRepo = new ProjectRepository(db);
  const result = await projectRepo.listShowcase({ search, page, limit: 24 });

  return ok(result);
});
