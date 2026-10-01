import type { APIRoute } from 'astro';
import { z } from 'zod';
import { asyncHandler } from '@/lib/api/async-handler';
import { ok, notFound, unprocessable, unauthorized } from '@/lib/api/response';
import { createServerClient } from '@/lib/supabase/server';

const savePageSchema = z.object({
  title: z.string().min(1).max(120).optional(),
  content: z.string().max(1_000_000, 'Page content exceeds 1 MB limit'),
  base_revision: z.number().int().min(0),
});

export const GET: APIRoute = asyncHandler(async ({ params, cookies, locals }) => {
  const viewer = locals.viewer ?? locals.user;
  if (!viewer) return unauthorized();

  const idParsed = z.string().uuid().safeParse(params.id);
  if (!idParsed.success) {
    return notFound('Page not found');
  }
  const pageId = idParsed.data;

  const db = createServerClient(cookies);

  // Fetch page and verify it is a live page owned by viewer
  const { data: page, error } = await db
    .from('doc_pages')
    .select(`
      id,
      title,
      content,
      kind,
      is_index,
      deleted_at,
      updated_at,
      projects!inner (
        id,
        owner_id,
        deleted_at
      )
    `)
    .eq('id', pageId)
    .single();

  if (
    error ||
    !page ||
    page.deleted_at !== null ||
    page.kind !== 'page' ||
    (page.projects as any)?.owner_id !== viewer.id ||
    (page.projects as any)?.deleted_at !== null
  ) {
    return notFound('Page not found');
  }

  // Count version snapshots to determine revision
  const { count: versionCount } = await db
    .from('page_versions')
    .select('id', { count: 'exact', head: true })
    .eq('page_id', pageId);

  const revision = versionCount ?? 0;

  return ok({
    id: page.id,
    title: page.title,
    content: page.content ?? '[]',
    revision,
    schema_version: 1,
  });
});

export const PUT: APIRoute = asyncHandler(async ({ params, request, cookies, locals }) => {
  const viewer = locals.viewer ?? locals.user;
  if (!viewer) return unauthorized();

  const idParsed = z.string().uuid().safeParse(params.id);
  if (!idParsed.success) {
    return notFound('Page not found');
  }
  const pageId = idParsed.data;

  const body = await request.json().catch(() => null);
  if (!body) return unprocessable('Invalid JSON body');

  const parsed = savePageSchema.safeParse(body);
  if (!parsed.success) {
    return unprocessable(parsed.error.issues.map((i) => i.message).join(', '));
  }

  const db = createServerClient(cookies);

  // 1. Fetch current page and verify ownership
  const { data: page, error } = await db
    .from('doc_pages')
    .select(`
      id,
      title,
      content,
      kind,
      deleted_at,
      updated_at,
      projects!inner (
        id,
        owner_id,
        deleted_at
      )
    `)
    .eq('id', pageId)
    .single();

  if (
    error ||
    !page ||
    page.deleted_at !== null ||
    page.kind !== 'page' ||
    (page.projects as any)?.owner_id !== viewer.id ||
    (page.projects as any)?.deleted_at !== null
  ) {
    return notFound('Page not found');
  }

  // 2. Concurrency check: base_revision against existing versions
  const { count: currentVersions } = await db
    .from('page_versions')
    .select('id', { count: 'exact', head: true })
    .eq('page_id', pageId);

  const currentRev = currentVersions ?? 0;
  if (parsed.data.base_revision !== currentRev) {
    return new Response(
      JSON.stringify({
        error: 'Stale revision',
        current_revision: currentRev,
        current_content: page.content,
      }),
      {
        status: 409,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }

  // 3. Snapshot current content into page_versions
  if (page.content !== null && page.content !== undefined) {
    await db.from('page_versions').insert({
      page_id: pageId,
      content: page.content,
      saved_by: viewer.id,
      created_at: new Date().toISOString(),
    });
  }

  // 4. Update page
  const updateData: Record<string, any> = {
    content: parsed.data.content,
    updated_at: new Date().toISOString(),
  };
  if (parsed.data.title) {
    updateData.title = parsed.data.title;
  }

  const { data: updatedPage, error: updateError } = await db
    .from('doc_pages')
    .update(updateData)
    .eq('id', pageId)
    .select()
    .single();

  if (updateError) {
    throw updateError;
  }

  return ok({
    page: updatedPage,
    revision: currentRev + 1,
    schema_version: 1,
  });
});

export const PATCH = PUT;
