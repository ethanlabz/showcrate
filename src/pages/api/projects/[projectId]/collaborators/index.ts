import type { APIRoute } from 'astro';
import { asyncHandler } from '@/lib/api/async-handler';
import { ok, unauthorized, unprocessable } from '@/lib/api/response';
import { createServerClient, createAdminClient } from '@/lib/supabase/server';
import { inviteCollaboratorSchema } from '@/lib/validators/collaborator.schema';
import { CollaboratorService } from '@/lib/services/collaboratorService';
import { UserRepository } from '@/lib/repositories/UserRepository';

export const GET: APIRoute = asyncHandler(async ({ cookies, locals, params }) => {
  if (!locals.user) return unauthorized();

  const db = createServerClient(cookies);
  const service = new CollaboratorService(db);
  const collaborators = await service.listCollaborators(params.projectId!);

  return ok({ collaborators });
});

export const POST: APIRoute = asyncHandler(async ({ request, cookies, locals, params }) => {
  if (!locals.user) return unauthorized();

  const body = await request.json().catch(() => null);
  if (!body) return unprocessable('Invalid JSON body');

  const parsed = inviteCollaboratorSchema.safeParse(body);
  if (!parsed.success) return unprocessable(parsed.error.issues.map((i) => i.message).join(', '));

  const db = createServerClient(cookies);
  const adminDb = createAdminClient();

  // Look up invitee by email using admin client
  const { data: { users } } = await (adminDb as any).auth.admin.listUsers();
  const invitee = users?.find((u: any) => u.email === parsed.data.email);
  if (!invitee) return unprocessable('No Showcrate account found for this email address');

  const userRepo = new UserRepository(db);
  const inviterProfile = await userRepo.findById(locals.user.id);

  const service = new CollaboratorService(db);
  const collaborator = await service.inviteByUserId(
    params.projectId!,
    locals.user.id,
    locals.user.platformRole,
    invitee.id,
    parsed.data.email,
    inviterProfile?.display_name ?? locals.user.username,
    locals.user.username,
    parsed.data,
  );

  return ok({ collaborator }, 201);
});
