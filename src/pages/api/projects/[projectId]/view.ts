import type { APIRoute } from 'astro';
import { asyncHandler } from '@/lib/api/async-handler';
import { ok } from '@/lib/api/response';
import { createServerClient } from '@/lib/supabase/server';
import { AnalyticsService } from '@/lib/services/analyticsService';

export const POST: APIRoute = asyncHandler(async ({ request, cookies, locals, params }) => {
  const body = await request.json().catch(() => ({}));
  const db = createServerClient(cookies);
  const analyticsService = new AnalyticsService(db);

  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    'unknown';

  await analyticsService.trackView({
    projectId: params.projectId!,
    pageSlug: typeof body.pageSlug === 'string' ? body.pageSlug : undefined,
    viewerId: locals.user?.id,
    ip,
    referrer: request.headers.get('referer') ?? undefined,
    country: request.headers.get('x-country') ?? undefined, // Netlify geo header
  });

  return ok({ tracked: true });
});
