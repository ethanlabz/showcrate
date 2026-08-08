/**
 * validators/admin.schema.ts — Admin action schemas
 */
import { z } from 'zod';
import type { PlatformRole } from '@/types/database';

export const changeRoleSchema = z.object({
  role: z.enum(['developer', 'moderator', 'pro', 'user', 'restricted', 'banned'] as const),
  reason: z.string().min(1).max(500).optional(),
});

export const featureProjectSchema = z.object({
  featured: z.boolean(),
});

export const resolveReportSchema = z.object({
  status: z.enum(['resolved', 'dismissed']),
  note: z.string().max(500).optional(),
});

export const createTemplateSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  category: z.string().min(1).max(50),
  structure: z
    .array(
      z.object({
        slug: z.string().min(1).max(100),
        title: z.string().min(1).max(200),
        content: z.string().max(100_000),
        orderIndex: z.number().int().min(0),
        isIndex: z.boolean().default(false),
      })
    )
    .min(1)
    .max(50),
  featured: z.boolean().default(false),
});

export type ChangeRoleInput = z.infer<typeof changeRoleSchema>;
export type FeatureProjectInput = z.infer<typeof featureProjectSchema>;
export type ResolveReportInput = z.infer<typeof resolveReportSchema>;
export type CreateTemplateInput = z.infer<typeof createTemplateSchema>;
