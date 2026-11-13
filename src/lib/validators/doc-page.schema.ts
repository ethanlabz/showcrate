/**
 * validators/doc-page.schema.ts — Doc page Zod schemas
 */
import { z } from 'zod';

const pageSlugRegex = /^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/;

export const createDocPageSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
  slug: z
    .string()
    .min(1)
    .max(100)
    .regex(pageSlugRegex, 'Slug must be lowercase letters, numbers, hyphens'),
  content: z.string().max(500_000, 'Content too large').default(''),
  isIndex: z.boolean().default(false),
  orderIndex: z.number().int().min(0).default(0),
});

export const updateDocPageSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  content: z.string().max(500_000).optional(),
});

export const reorderPagesSchema = z.object({
  pages: z
    .array(
      z.object({
        id: z.uuid(),
        orderIndex: z.number().int().min(0),
      })
    )
    .min(1, 'At least one page required')
    .max(200, 'Too many pages'),
});

export const docSearchSchema = z.object({
  q: z.string().min(1).max(200),
});

export type CreateDocPageInput = z.infer<typeof createDocPageSchema>;
export type UpdateDocPageInput = z.infer<typeof updateDocPageSchema>;
export type ReorderPagesInput = z.infer<typeof reorderPagesSchema>;
export type DocSearchInput = z.infer<typeof docSearchSchema>;
