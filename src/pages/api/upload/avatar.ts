import type { APIRoute } from 'astro';
import { asyncHandler } from '@/lib/api/async-handler';
import { ok, unauthorized, unprocessable } from '@/lib/api/response';
import { createServerClient } from '@/lib/supabase/server';
import { avatarUploadSchema } from '@/lib/validators/upload.schema';
import { StorageService } from '@/lib/services/storageService';
import { UserRepository } from '@/lib/repositories/UserRepository';

export const POST: APIRoute = asyncHandler(async ({ request, cookies, locals }) => {
  if (!locals.user) return unauthorized();

  const formData = await request.formData().catch(() => null);
  const file = formData?.get('file');
  if (!(file instanceof File)) return unprocessable('No file provided');

  const validation = avatarUploadSchema.safeParse({
    contentType: file.type,
    size: file.size,
  });
  if (!validation.success) return unprocessable(validation.error.issues.map((i) => i.message).join(', '));

  const db = createServerClient(cookies);
  const storageService = new StorageService(db);
  const url = await storageService.uploadAvatar(locals.user.id, file);

  // Update user profile with new avatar URL
  const userRepo = new UserRepository(db);
  await userRepo.updateProfile(locals.user.id, { avatarUrl: url });

  return ok({ url });
});
