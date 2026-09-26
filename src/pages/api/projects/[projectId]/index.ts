import type { APIRoute } from 'astro';
import { asyncHandler } from '@/lib/api/async-handler';
import { ok, unauthorized, unprocessable } from '@/lib/api/response';
import { createServerClient } from '@/lib/supabase/server';
import { updateProjectSchema } from '@/lib/validators/project.schema';
import { ProjectService } from '@/lib/services/projectService';

export const PATCH: APIRoute = asyncHandler(async ({ request, cookies, locals, params }) => {
  if (!locals.user) return unauthorized();

  const body = await request.json().catch(() => null);
  if (!body) return unprocessable('Invalid JSON body');

  const parsed = updateProjectSchema.safeParse(body);
  if (!parsed.success) return unprocessable(parsed.error.issues.map((i) => i.message).join(', '));

  const db = createServerClient(cookies);
  const projectService = new ProjectService(db);
  const project = await projectService.updateProject(params.projectId!, locals.user.id, parsed.data);

  return ok({ project });
});

export const DELETE: APIRoute = asyncHandler(async ({ cookies, locals, params }) => {
  if (!locals.user) return unauthorized();

  const db = createServerClient(cookies);
  const projectService = new ProjectService(db);
  await projectService.deleteProject(params.projectId!, locals.user.id);

  return ok({ message: 'Project deleted' });
});
