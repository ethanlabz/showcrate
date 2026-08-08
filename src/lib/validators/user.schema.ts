/**
 * validators/user.schema.ts — User profile update schemas
 */
import { z } from 'zod';

export const updateProfileSchema = z.object({
  displayName: z.string().min(1).max(60, 'Display name too long').optional(),
  bio: z.string().max(300, 'Bio too long').optional(),
  avatarUrl: z.url('Invalid URL').optional().nullable(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
