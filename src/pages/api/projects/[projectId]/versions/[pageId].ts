import type { APIRoute } from 'astro';
import { asyncHandler } from '@/lib/api/async-handler';
import { ok, unauthorized } from '@/lib/api/response';
import { createServerClient } from '@/lib/supabase/server';
import { DocService } from '@/lib/services/docService';

export const GET: APIRoute = asyncHandler(async ({ cookies, locals, params, url }) => {
  if (!locals.user) return unauthorized();

  const limit = Math.min(60, parseInt(url.searchParams.get('limit') ?? '10', 10));

  const db = createServerClient(cookies);
  const docService = new DocService(db);
  const versions = await docService.getVersions(params.pageId!, locals.user.id, limit);

  return ok({ versions });
});
