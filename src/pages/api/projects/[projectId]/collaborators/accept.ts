import type { APIRoute } from 'astro';
import { asyncHandler } from '@/lib/api/async-handler';
import { ok, unauthorized, unprocessable } from '@/lib/api/response';
import { createServerClient } from '@/lib/supabase/server';
import { CollaboratorService } from '@/lib/services/collaboratorService';
import { z } from 'zod';

const schema = z.object({ collaboratorId: z.uuid() });

export const POST: APIRoute = asyncHandler(async ({ request, cookies, locals }) => {
  if (!locals.user) return unauthorized();

  const body = await request.json().catch(() => null);
  if (!body) return unprocessable('Invalid JSON body');

  const parsed = schema.safeParse(body);
  if (!parsed.success) return unprocessable('Invalid collaborator ID');

  const db = createServerClient(cookies);
  const service = new CollaboratorService(db);
  await service.acceptInvite(parsed.data.collaboratorId, locals.user.id);

  return ok({ message: 'Invitation accepted' });
});
