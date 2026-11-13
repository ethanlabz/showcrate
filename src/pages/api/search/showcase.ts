import type { APIRoute } from 'astro';
import { asyncHandler } from '@/lib/api/async-handler';
import { ok, unprocessable } from '@/lib/api/response';
import { createServerClient } from '@/lib/supabase/server';
import { ProjectRepository } from '@/lib/repositories/ProjectRepository';
import { z } from 'zod';

const querySchema = z.object({
  q: z.string().min(1).max(200),
  page: z.coerce.number().int().min(1).default(1),
});

export const GET: APIRoute = asyncHandler(async ({ url, cookies }) => {
  const params = querySchema.safeParse({
    q: url.searchParams.get('q'),
    page: url.searchParams.get('page'),
  });
  if (!params.success) return unprocessable('Invalid search parameters');

  const db = createServerClient(cookies);
  const projectRepo = new ProjectRepository(db);
  const result = await projectRepo.listShowcase({ search: params.data.q, page: params.data.page });

  return ok(result);
});
