import type { APIRoute } from 'astro';
import { z } from 'zod';
import { asyncHandler } from '@/lib/api/async-handler';
import { ok, notFound, unauthorized, unprocessable } from '@/lib/api/response';
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

const trashActionSchema = z.object({
  projectId: z.string().uuid(),
  nodeId: z.string().uuid(),
  action: z.enum(['restore', 'delete_permanent']),
});

export const POST: APIRoute = asyncHandler(async ({ request, cookies, locals }) => {
  const viewer = locals.viewer ?? locals.user;
  if (!viewer) return unauthorized();

  const body = await request.json().catch(() => null);
  if (!body) return unprocessable('Invalid JSON body');

  const parsed = trashActionSchema.safeParse(body);
  if (!parsed.success) {
    return unprocessable(parsed.error.issues.map((i) => i.message).join(', '));
  }

  const { projectId, nodeId, action } = parsed.data;
  const db = createServerClient(cookies);

  // Check project ownership
  const { data: project } = await db
    .from('projects')
    .select('id, tree_revision')
    .eq('id', projectId)
    .eq('owner_id', viewer.id)
    .is('deleted_at', null)
    .single();

  if (!project) {
    return notFound('Project not found');
  }

  if (action === 'restore') {
    // Try RPC first
    const { error: rpcErr } = await db.rpc('doc_tree_restore', {
      p_project_id: projectId,
      p_node_id: nodeId,
      p_base_tree_revision: project.tree_revision ?? 0,
    });

    if (rpcErr) {
      // Direct update fallback
      const now = new Date().toISOString();
      const { error: updateErr } = await db
        .from('doc_pages')
        .update({ deleted_at: null, updated_at: now })
        .eq('id', nodeId)
        .eq('project_id', projectId);

      if (updateErr) throw updateErr;

      const newRev = (project.tree_revision ?? 0) + 1;
      await db
        .from('projects')
        .update({ tree_revision: newRev, updated_at: now })
        .eq('id', projectId);
    }

    return ok({ restored: true });
  }

  if (action === 'delete_permanent') {
    const { error: deleteErr } = await db
      .from('doc_pages')
      .delete()
      .eq('id', nodeId)
      .eq('project_id', projectId);

    if (deleteErr) throw deleteErr;

    return ok({ deleted: true });
  }

  return unprocessable('Unsupported trash action');
});
