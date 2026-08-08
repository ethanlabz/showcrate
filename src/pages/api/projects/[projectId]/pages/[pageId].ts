import type { APIRoute } from 'astro';
import { asyncHandler } from '@/lib/api/async-handler';
import { ok, unauthorized, unprocessable } from '@/lib/api/response';
import { createServerClient } from '@/lib/supabase/server';
import { updateDocPageSchema } from '@/lib/validators/doc-page.schema';
import { DocService } from '@/lib/services/docService';

export const PATCH: APIRoute = asyncHandler(async ({ request, cookies, locals, params }) => {
  if (!locals.user) return unauthorized();

  const body = await request.json().catch(() => null);
  if (!body) return unprocessable('Invalid JSON body');

  const parsed = updateDocPageSchema.safeParse(body);
  if (!parsed.success) return unprocessable(parsed.error.issues.map((i) => i.message).join(', '));

  const db = createServerClient(cookies);
  const docService = new DocService(db);
  const page = await docService.savePage(params.pageId!, locals.user.id, locals.user.platformRole, parsed.data);

  return ok({ page });
});

export const DELETE: APIRoute = asyncHandler(async ({ cookies, locals, params }) => {
  if (!locals.user) return unauthorized();

  const db = createServerClient(cookies);
  const docService = new DocService(db);
  await docService.deletePage(params.pageId!, locals.user.id);

  return ok({ message: 'Page deleted' });
});
