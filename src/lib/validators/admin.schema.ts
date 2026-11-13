/**
 * validators/admin.schema.ts — Admin action schemas
 */
import { z } from 'zod';
import type { PlatformRole } from '@/types/database';

export const changeRoleSchema = z.object({
  role: z.enum(['developer', 'moderator', 'user', 'restricted', 'banned'] as const),
  reason: z.string().min(1).max(500).optional(),
});

export const featureProjectSchema = z.object({
  featured: z.boolean(),
});

export const resolveReportSchema = z.object({
  status: z.enum(['resolved', 'dismissed']),
  note: z.string().max(500).optional(),
});

export type TemplateNodeInput = {
  kind: 'page' | 'folder';
  title: string;
  content?: string | null;
  children?: TemplateNodeInput[];
};

export const templateNodeSchema: z.ZodType<TemplateNodeInput> = z.lazy(() =>
  z
    .object({
      kind: z.enum(['page', 'folder']),
      title: z.string().min(1).max(120),
      content: z.string().max(500_000).nullable().optional(),
      children: z.array(templateNodeSchema).optional(),
    })
    .refine(
      (node) => {
        if (node.kind === 'folder' && node.content) return false;
        if (node.kind === 'page' && node.children && node.children.length > 0) return false;
        return true;
      },
      { message: 'Folders cannot hold content; pages cannot have children.' },
    ),
);

function validateTemplateTree(nodes: TemplateNodeInput[]): { valid: boolean; error?: string } {
  let total = 0;
  function walk(list: TemplateNodeInput[], depth: number): boolean {
    if (depth > 5) return false;
    for (const item of list) {
      total++;
      if (total > 500) return false;
      if (item.children && item.children.length > 0) {
        if (!walk(item.children, depth + 1)) return false;
      }
    }
    return true;
  }
  const ok = walk(nodes, 1);
  if (!ok) {
    if (total > 500) return { valid: false, error: 'Template exceeds node cap of 500' };
    return { valid: false, error: 'Template exceeds maximum tree depth of 5' };
  }
  return { valid: true };
}

export const createTemplateSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  category: z.string().min(1).max(50),
  structure: z
    .array(templateNodeSchema)
    .min(1, 'Template must contain at least one node')
    .refine((nodes) => validateTemplateTree(nodes).valid, {
      message: 'Template violates depth (max 5) or node cap (max 500)',
    }),
  featured: z.boolean().default(false),
});

export type ChangeRoleInput = z.infer<typeof changeRoleSchema>;
export type FeatureProjectInput = z.infer<typeof featureProjectSchema>;
export type ResolveReportInput = z.infer<typeof resolveReportSchema>;
export type CreateTemplateInput = z.infer<typeof createTemplateSchema>;
