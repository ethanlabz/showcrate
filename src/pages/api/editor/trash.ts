import type { APIRoute } from 'astro';
import { z } from 'zod';
import { asyncHandler } from '@/lib/api/async-handler';
import { ok, notFound, unauthorized } from '@/lib/api/response';
import { createServerClient } from '@/lib/supabase/server';

export const GET: APIRoute = asyncHandler(async ({ url, cookies, locals }) => {
  const viewer = locals.viewer ?? locals.user;
  if (!viewer) return unauthorized();

  const rawProjectId = url.searchParams.get('projectId');
  const parsed = z.string().uuid().safeParse(rawProjectId);
  if (!parsed.success) {
    return notFound('Project not found');
  }
  const projectId = parsed.data;

  const db = createServerClient(cookies);

  // Check project ownership
  const { data: project } = await db
    .from('projects')
    .select('id')
    .eq('id', projectId)
    .eq('owner_id', viewer.id)
    .is('deleted_at', null)
    .single();

  if (!project) {
    return notFound('Project not found');
  }

  // Fetch soft-deleted nodes
  const { data: trashNodes, error } = await db
    .from('doc_pages')
    .select('id, title, kind, deleted_at')
    .eq('project_id', projectId)
    .not('deleted_at', 'is', null)
    .order('deleted_at', { ascending: false });

  if (error) {
    throw error;
  }

  return ok({
    trash: trashNodes ?? [],
  });
});
