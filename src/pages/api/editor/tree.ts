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

export const GET: APIRoute = asyncHandler(async ({ url, cookies, locals }) => {
  const viewer = locals.viewer ?? locals.user;
  if (!viewer) return unauthorized();

  const projectId = url.searchParams.get('projectId');
  if (!projectId) return unprocessable('Missing projectId');

  const db = createServerClient(cookies);

  // Check project ownership
  const { data: project } = await db
    .from('projects')
    .select('id, tree_revision')
    .eq('id', projectId)
    .eq('owner_id', viewer.id)
    .is('deleted_at', null)
    .single();

  if (!project) return notFound('Project not found');

  const { data: treeNodes } = await db
    .from('doc_pages')
    .select('id, parent_id, kind, title, slug, order_index, is_index')
    .eq('project_id', projectId)
    .is('deleted_at', null)
    .order('order_index', { ascending: true });

  return ok({
    tree: treeNodes ?? [],
    tree_revision: project.tree_revision ?? 0,
  });
});

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
        if (!error && rpcRes) {
          result = rpcRes;
        } else {
          // Direct fallback if RPC fails
          let candidateSlug: string | null = null;
          if (data.kind === 'page') {
            candidateSlug = data.title
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, '-')
              .replace(/^-+|-+$/g, '') || 'page';
          }
          const now = new Date().toISOString();
          const { data: newNode, error: insertErr } = await db
            .from('doc_pages')
            .insert({
              project_id: data.projectId,
              parent_id: data.parentId ?? null,
              kind: data.kind,
              title: data.title.trim(),
              slug: candidateSlug,
              content: data.kind === 'page' ? '[]' : null,
              order_index: 999,
              is_index: false,
              created_at: now,
              updated_at: now,
            })
            .select('id, parent_id, kind, title, slug, order_index, is_index')
            .single();

          if (insertErr) throw insertErr;

          const newRev = (project.tree_revision ?? 0) + 1;
          await db
            .from('projects')
            .update({ tree_revision: newRev, updated_at: now })
            .eq('id', data.projectId);

          result = {
            tree_revision: newRev,
            affected_nodes: [newNode],
          };
        }
        break;
      }
      case 'rename': {
        const { data: rpcRes, error } = await db.rpc('doc_tree_rename', {
          p_project_id: data.projectId,
          p_node_id: data.nodeId,
          p_new_title: data.title,
          p_base_tree_revision: data.base_tree_revision,
        });
        if (!error && rpcRes) {
          result = rpcRes;
        } else {
          // Direct fallback if RPC fails
          const now = new Date().toISOString();
          const { data: updatedNode, error: updateErr } = await db
            .from('doc_pages')
            .update({ title: data.title.trim(), updated_at: now })
            .eq('id', data.nodeId)
            .eq('project_id', data.projectId)
            .select('id, parent_id, kind, title, slug, order_index, is_index')
            .single();

          if (updateErr) throw updateErr;

          const newRev = (project.tree_revision ?? 0) + 1;
          await db
            .from('projects')
            .update({ tree_revision: newRev, updated_at: now })
            .eq('id', data.projectId);

          result = {
            tree_revision: newRev,
            affected_nodes: [updatedNode],
          };
        }
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
        if (!error && rpcRes) {
          result = rpcRes;
        } else {
          const now = new Date().toISOString();
          const { data: movedNode, error: moveErr } = await db
            .from('doc_pages')
            .update({
              parent_id: data.newParentId ?? null,
              order_index: data.newIndex,
              updated_at: now,
            })
            .eq('id', data.nodeId)
            .eq('project_id', data.projectId)
            .select('id, parent_id, kind, title, slug, order_index, is_index')
            .single();

          if (moveErr) throw moveErr;

          const newRev = (project.tree_revision ?? 0) + 1;
          await db
            .from('projects')
            .update({ tree_revision: newRev, updated_at: now })
            .eq('id', data.projectId);

          result = {
            tree_revision: newRev,
            affected_nodes: [movedNode],
          };
        }
        break;
      }
      case 'delete': {
        // Prevent deleting index page
        const { data: targetNode } = await db
          .from('doc_pages')
          .select('id, is_index')
          .eq('id', data.nodeId)
          .eq('project_id', data.projectId)
          .single();

        if (targetNode?.is_index) {
          return unprocessable('The root index page cannot be moved to trash.');
        }

        const { data: rpcRes, error } = await db.rpc('doc_tree_delete', {
          p_project_id: data.projectId,
          p_node_id: data.nodeId,
          p_base_tree_revision: data.base_tree_revision,
        });
        if (!error && rpcRes) {
          result = rpcRes;
        } else {
          const now = new Date().toISOString();
          const { error: delErr } = await db
            .from('doc_pages')
            .update({ deleted_at: now, updated_at: now })
            .or(`id.eq.${data.nodeId},parent_id.eq.${data.nodeId}`)
            .eq('project_id', data.projectId);

          if (delErr) throw delErr;

          const newRev = (project.tree_revision ?? 0) + 1;
          await db
            .from('projects')
            .update({ tree_revision: newRev, updated_at: now })
            .eq('id', data.projectId);

          result = {
            tree_revision: newRev,
            deleted_at: now,
          };
        }
        break;
      }
      case 'restore': {
        const { data: rpcRes, error } = await db.rpc('doc_tree_restore', {
          p_project_id: data.projectId,
          p_node_id: data.nodeId,
          p_base_tree_revision: data.base_tree_revision,
        });
        if (!error && rpcRes) {
          result = rpcRes;
        } else {
          const now = new Date().toISOString();
          const { error: restoreErr } = await db
            .from('doc_pages')
            .update({ deleted_at: null, updated_at: now })
            .eq('id', data.nodeId)
            .eq('project_id', data.projectId);

          if (restoreErr) throw restoreErr;

          const newRev = (project.tree_revision ?? 0) + 1;
          await db
            .from('projects')
            .update({ tree_revision: newRev, updated_at: now })
            .eq('id', data.projectId);

          result = {
            tree_revision: newRev,
          };
        }
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
