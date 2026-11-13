/**
 * validators/project.schema.ts — Project Zod schemas
 */
import { z } from 'zod';

export const createProjectSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  tagline: z.string().max(200, 'Tagline too long').optional(),
  templateId: z.uuid('Invalid template ID').optional(),
});

export const updateProjectSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  tagline: z.string().max(200).optional().nullable(),
  coverUrl: z.url().optional().nullable(),
});

export const projectVisibilitySchema = z.object({
  visibility: z.enum(['public', 'private', 'unlisted']),
});

export const publishProjectSchema = z.object({
  published: z.boolean(),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
export type ProjectVisibilityInput = z.infer<typeof projectVisibilitySchema>;
export type PublishProjectInput = z.infer<typeof publishProjectSchema>;
