/**
 * validators/upload.schema.ts — File upload validation
 */
import { z } from 'zod';

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'] as const;
const ALLOWED_COVER_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
const ALLOWED_ASSET_TYPES = [...ALLOWED_IMAGE_TYPES, 'image/svg+xml'] as const;

export const avatarUploadSchema = z.object({
  contentType: z.enum(ALLOWED_IMAGE_TYPES, { message: 'Invalid image type. Allowed: JPEG, PNG, WebP, GIF' }),
  size: z.number().max(2 * 1024 * 1024, 'Avatar must be under 2MB'),
});

export const coverUploadSchema = z.object({
  contentType: z.enum(ALLOWED_COVER_TYPES, { message: 'Invalid image type. Allowed: JPEG, PNG, WebP' }),
  size: z.number().max(5 * 1024 * 1024, 'Cover must be under 5MB'),
});

export const assetUploadSchema = z.object({
  contentType: z.enum(ALLOWED_ASSET_TYPES, { message: 'Invalid asset type' }),
  size: z.number().max(10 * 1024 * 1024, 'Asset must be under 10MB'),
});

export type AvatarUploadInput = z.infer<typeof avatarUploadSchema>;
export type CoverUploadInput = z.infer<typeof coverUploadSchema>;
export type AssetUploadInput = z.infer<typeof assetUploadSchema>;
