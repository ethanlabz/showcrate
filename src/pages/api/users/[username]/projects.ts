import type { APIRoute } from 'astro';
import { asyncHandler } from '@/lib/api/async-handler';
import { ok, notFound } from '@/lib/api/response';
import { createServerClient } from '@/lib/supabase/server';
import { UserRepository } from '@/lib/repositories/UserRepository';
import { ProjectRepository } from '@/lib/repositories/ProjectRepository';

export const GET: APIRoute = asyncHandler(async ({ cookies, locals, params }) => {
  const username = params.username ?? '';
  const db = createServerClient(cookies);
  const userRepo = new UserRepository(db);
  const projectRepo = new ProjectRepository(db);

  const targetUser = await userRepo.findByUsername(username);
  if (!targetUser) return notFound('User not found');

  const isOwner = locals.user?.id === targetUser.id;

  if (isOwner) {
    const projects = await projectRepo.listByOwner(targetUser.id);
    return ok({ projects });
  }

  // If visitor is not the owner, return public & published projects only
  const { data: projects, error } = await db
    .from('projects')
    .select('*')
    .eq('owner_id', targetUser.id)
    .eq('published', true)
    .eq('visibility', 'public')
    .is('deleted_at', null)
    .order('updated_at', { ascending: false });

  if (error) throw error;
  return ok({ projects: projects ?? [] });
});
