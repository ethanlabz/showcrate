import type { APIRoute } from 'astro';
import { asyncHandler } from '@/lib/api/async-handler';
import { ok, unprocessable } from '@/lib/api/response';
import { createServerClient } from '@/lib/supabase/server';
import { DocService } from '@/lib/services/docService';
import { z } from 'zod';

const querySchema = z.object({
  projectId: z.uuid(),
  q: z.string().min(1).max(200),
});

export const GET: APIRoute = asyncHandler(async ({ url, cookies }) => {
  const params = querySchema.safeParse({
    projectId: url.searchParams.get('projectId'),
    q: url.searchParams.get('q'),
  });
  if (!params.success) return unprocessable('Invalid search parameters');

  const db = createServerClient(cookies);
  const docService = new DocService(db);
  const results = await docService.search(params.data.projectId, params.data.q);

  return ok({ results });
});
