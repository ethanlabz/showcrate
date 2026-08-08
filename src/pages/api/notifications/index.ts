import type { APIRoute } from 'astro';
import { asyncHandler } from '@/lib/api/async-handler';
import { ok, unauthorized, unprocessable } from '@/lib/api/response';
import { createServerClient } from '@/lib/supabase/server';
import { NotificationService } from '@/lib/services/notificationService';
import { z } from 'zod';

export const GET: APIRoute = asyncHandler(async ({ cookies, locals, url }) => {
  if (!locals.user) return unauthorized();

  const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1', 10));
  const db = createServerClient(cookies);
  const service = new NotificationService(db);
  const result = await service.getUserNotifications(locals.user.id, page);

  return ok(result);
});

export const PATCH: APIRoute = asyncHandler(async ({ request, cookies, locals }) => {
  if (!locals.user) return unauthorized();

  const body = await request.json().catch(() => null);
  if (!body) return unprocessable('Invalid JSON body');

  const db = createServerClient(cookies);
  const service = new NotificationService(db);

  if (body.all === true) {
    await service.markAllAsRead(locals.user.id);
  } else {
    const schema = z.object({ ids: z.array(z.uuid()).min(1).max(100) });
    const parsed = schema.safeParse(body);
    if (!parsed.success) return unprocessable('Invalid notification IDs');
    await service.markAsRead(parsed.data.ids, locals.user.id);
  }

  return ok({ message: 'Marked as read' });
});
