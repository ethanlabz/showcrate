import type { APIRoute } from 'astro';
import { asyncHandler } from '@/lib/api/async-handler';
import { ok, unauthorized } from '@/lib/api/response';
import { createServerClient } from '@/lib/supabase/server';
import { CollaboratorService } from '@/lib/services/collaboratorService';

export const DELETE: APIRoute = asyncHandler(async ({ cookies, locals, params }) => {
  if (!locals.user) return unauthorized();

  const db = createServerClient(cookies);
  const service = new CollaboratorService(db);
  await service.removeCollaborator(params.colId!, locals.user.id);

  return ok({ message: 'Collaborator removed' });
});
