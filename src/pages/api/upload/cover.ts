import type { APIRoute } from 'astro';
import { asyncHandler } from '@/lib/api/async-handler';
import { ok, unauthorized, forbidden, unprocessable } from '@/lib/api/response';
import { createServerClient } from '@/lib/supabase/server';
import { coverUploadSchema } from '@/lib/validators/upload.schema';
import { StorageService } from '@/lib/services/storageService';
import { ProjectRepository } from '@/lib/repositories/ProjectRepository';

export const POST: APIRoute = asyncHandler(async ({ request, cookies, locals, url }) => {
  if (!locals.user) return unauthorized();

  const projectId = url.searchParams.get('projectId');
  if (!projectId) return unprocessable('projectId is required');

  const db = createServerClient(cookies);
  const projectRepo = new ProjectRepository(db);
  const project = await projectRepo.findById(projectId);
  if (!project || project.owner_id !== locals.user.id) return forbidden();

  const formData = await request.formData().catch(() => null);
  const file = formData?.get('file');
  if (!(file instanceof File)) return unprocessable('No file provided');

  const validation = coverUploadSchema.safeParse({ contentType: file.type, size: file.size });
  if (!validation.success) return unprocessable(validation.error.issues.map((i) => i.message).join(', '));

  const storageService = new StorageService(db);
  const coverUrl = await storageService.uploadCover(projectId, file);

  await projectRepo.update(projectId, { cover_url: coverUrl });

  return ok({ url: coverUrl });
});
