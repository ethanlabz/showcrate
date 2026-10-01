import type { APIRoute } from 'astro';
import { z } from 'zod';
import { asyncHandler } from '@/lib/api/async-handler';
import { ok, notFound, unprocessable, unauthorized } from '@/lib/api/response';
import { createServerClient } from '@/lib/supabase/server';

const createNodeSchema = z.object({
  action: z.literal('create'),
  projectId: z.string().uuid(),
  parentId: z.string().uuid().nullable().optional(),
  kind: z.enum(['page', 'folder']),
  title: z.string().min(1).max(120),
  base_tree_revision: z.number().int().min(0),
});

const renameNodeSchema = z.object({
  action: z.literal('rename'),
  projectId: z.string().uuid(),
  nodeId: z.string().uuid(),
  title: z.string().min(1).max(120),
  base_tree_revision: z.number().int().min(0),
});

const moveNodeSchema = z.object({
  action: z.literal('move'),
  projectId: z.string().uuid(),
  nodeId: z.string().uuid(),
  newParentId: z.string().uuid().nullable().optional(),
  newIndex: z.number().int().min(0),
  base_tree_revision: z.number().int().min(0),
});

const deleteNodeSchema = z.object({
  action: z.literal('delete'),
  projectId: z.string().uuid(),
  nodeId: z.string().uuid(),
  base_tree_revision: z.number().int().min(0),
});

const restoreNodeSchema = z.object({
  action: z.literal('restore'),
  projectId: z.string().uuid(),
  nodeId: z.string().uuid(),
  base_tree_revision: z.number().int().min(0),
});

const treePayloadSchema = z.discriminatedUnion('action', [
  createNodeSchema,
  renameNodeSchema,
  moveNodeSchema,
  deleteNodeSchema,
  restoreNodeSchema,
]);

export const POST: APIRoute = asyncHandler(async ({ request, cookies, locals }) => {
  const viewer = locals.viewer ?? locals.user;
  if (!viewer) return unauthorized();

  const body = await request.json().catch(() => null);
  if (!body) return unprocessable('Invalid JSON body');

  const parsed = treePayloadSchema.safeParse(body);
  if (!parsed.success) {
    return unprocessable(parsed.error.issues.map((i) => i.message).join(', '));
  }

  const data = parsed.data;
  const db = createServerClient(cookies);

  // Check project ownership
  const { data: project } = await db
    .from('projects')
    .select('id, tree_revision')
    .eq('id', data.projectId)
    .eq('owner_id', viewer.id)
    .is('deleted_at', null)
    .single();

  if (!project) {
    return notFound('Project not found');
  }

  try {
    let result: any;
    switch (data.action) {
      case 'create': {
        const { data: rpcRes, error } = await db.rpc('doc_tree_create', {
          p_project_id: data.projectId,
          p_parent_id: data.parentId ?? null,
          p_kind: data.kind,
          p_title: data.title,
          p_base_tree_revision: data.base_tree_revision,
        });
        if (error) throw error;
        result = rpcRes;
        break;
      }
      case 'rename': {
        const { data: rpcRes, error } = await db.rpc('doc_tree_rename', {
          p_project_id: data.projectId,
          p_node_id: data.nodeId,
          p_new_title: data.title,
          p_base_tree_revision: data.base_tree_revision,
        });
        if (error) throw error;
        result = rpcRes;
        break;
      }
      case 'move': {
        const { data: rpcRes, error } = await db.rpc('doc_tree_move', {
          p_project_id: data.projectId,
          p_node_id: data.nodeId,
          p_new_parent_id: data.newParentId ?? null,
          p_new_index: data.newIndex,
          p_base_tree_revision: data.base_tree_revision,
        });
        if (error) throw error;
        result = rpcRes;
        break;
      }
      case 'delete': {
        const { data: rpcRes, error } = await db.rpc('doc_tree_delete', {
          p_project_id: data.projectId,
          p_node_id: data.nodeId,
          p_base_tree_revision: data.base_tree_revision,
        });
        if (error) throw error;
        result = rpcRes;
        break;
      }
      case 'restore': {
        const { data: rpcRes, error } = await db.rpc('doc_tree_restore', {
          p_project_id: data.projectId,
          p_node_id: data.nodeId,
          p_base_tree_revision: data.base_tree_revision,
        });
        if (error) throw error;
        result = rpcRes;
        break;
      }
    }

    return ok(result ?? {});
  } catch (err: any) {
    const msg = err.message || '';
    if (msg.includes('Stale tree revision') || err.code === 'P0009') {
      // Query current tree and return 409
      const { data: currentNodes } = await db
        .from('doc_pages')
        .select('id, parent_id, kind, title, slug, order_index, is_index')
        .eq('project_id', data.projectId)
        .is('deleted_at', null)
        .order('order_index');

      const { data: currentProject } = await db
        .from('projects')
        .select('tree_revision')
        .eq('id', data.projectId)
        .single();

      return new Response(
        JSON.stringify({
          error: 'Stale tree revision',
          tree: currentNodes ?? [],
          tree_revision: currentProject?.tree_revision ?? 0,
        }),
        {
          status: 409,
          headers: { 'Content-Type': 'application/json' },
        },
      );
    }

    if (
      msg.includes('not found') ||
      err.code === 'P0002' ||
      err.code === '42501'
    ) {
      return notFound(msg || 'Node or project not found');
    }

    return unprocessable(msg || 'Tree operation failed');
  }
});
