/**
 * validators/collaborator.schema.ts — Collaborator invite/management schemas
 */
import { z } from 'zod';

export const inviteCollaboratorSchema = z.object({
  email: z.email('Invalid email address'),
  displayRole: z.string().max(60, 'Display role too long').optional(),
});

export const updateCollaboratorSchema = z.object({
  displayRole: z.string().max(60).optional().nullable(),
  visible: z.boolean().optional(),
});

export const acceptInviteSchema = z.object({
  token: z.string().min(1, 'Token is required'),
});

export type InviteCollaboratorInput = z.infer<typeof inviteCollaboratorSchema>;
export type UpdateCollaboratorInput = z.infer<typeof updateCollaboratorSchema>;
export type AcceptInviteInput = z.infer<typeof acceptInviteSchema>;
