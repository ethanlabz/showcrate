import type { APIRoute } from 'astro';
import { asyncHandler } from '@/lib/api/async-handler';
import { ok, unauthorized, unprocessable } from '@/lib/api/response';
import { createServerClient } from '@/lib/supabase/server';
import { reorderPagesSchema } from '@/lib/validators/doc-page.schema';
import { DocService } from '@/lib/services/docService';

export const POST: APIRoute = asyncHandler(async ({ request, cookies, locals, params }) => {
  if (!locals.user) return unauthorized();

  const body = await request.json().catch(() => null);
  if (!body) return unprocessable('Invalid JSON body');

  const parsed = reorderPagesSchema.safeParse(body);
  if (!parsed.success) return unprocessable(parsed.error.issues.map((i) => i.message).join(', '));

  const db = createServerClient(cookies);
  const docService = new DocService(db);
  await docService.reorderPages(params.projectId!, locals.user.id, parsed.data);

  return ok({ message: 'Pages reordered' });
});
