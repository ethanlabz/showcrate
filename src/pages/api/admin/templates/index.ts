import type { APIRoute } from 'astro';
import { asyncHandler } from '@/lib/api/async-handler';
import { ok, unauthorized, forbidden, unprocessable } from '@/lib/api/response';
import { createAdminClient } from '@/lib/supabase/server';
import { createTemplateSchema } from '@/lib/validators/admin.schema';
import { AuditLogRepository } from '@/lib/repositories/AuditLogRepository';
import { isAdmin } from '@/types/auth';

export const GET: APIRoute = asyncHandler(async ({ locals }) => {
  if (!locals.user) return unauthorized();
  if (!isAdmin(locals.user)) return forbidden();

  const adminDb = createAdminClient();
  const { data, error } = await adminDb
    .from('templates')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return ok({ templates: data ?? [] });
});

export const POST: APIRoute = asyncHandler(async ({ request, locals }) => {
  if (!locals.user) return unauthorized();
  if (!isAdmin(locals.user)) return forbidden();

  const body = await request.json().catch(() => null);
  if (!body) return unprocessable('Invalid JSON body');

  const parsed = createTemplateSchema.safeParse(body);
  if (!parsed.success) return unprocessable(parsed.error.issues.map((i) => i.message).join(', '));

  const adminDb = createAdminClient();
  const { data, error } = await adminDb
    .from('templates')
    .insert({
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      category: parsed.data.category,
      structure: parsed.data.structure.map((p) => ({
        slug: p.slug,
        title: p.title,
        content: p.content,
        order_index: p.orderIndex,
        is_index: p.isIndex,
      })),
      featured: parsed.data.featured,
    })
    .select()
    .single();

  if (error) throw error;

  const auditRepo = new AuditLogRepository(adminDb);
  await auditRepo.log(locals.user.id, 'template_created', 'template', data.id, { name: parsed.data.name });

  return ok({ template: data }, 201);
});
