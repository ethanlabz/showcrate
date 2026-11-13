import type { APIRoute } from 'astro';
import { asyncHandler } from '@/lib/api/async-handler';
import { ok, unauthorized, unprocessable } from '@/lib/api/response';
import { createServerClient } from '@/lib/supabase/server';
import { publishProjectSchema } from '@/lib/validators/project.schema';
import { ProjectService } from '@/lib/services/projectService';

export const POST: APIRoute = asyncHandler(async ({ request, cookies, locals, params }) => {
  if (!locals.user) return unauthorized();

  const body = await request.json().catch(() => null);
  if (!body) return unprocessable('Invalid JSON body');

  const parsed = publishProjectSchema.safeParse(body);
  if (!parsed.success) return unprocessable(parsed.error.issues.map((i) => i.message).join(', '));

  const db = createServerClient(cookies);
  const projectService = new ProjectService(db);
  await projectService.publishProject(params.projectId!, locals.user.id, parsed.data.published);

  return ok({ message: parsed.data.published ? 'Project published' : 'Project unpublished' });
});
