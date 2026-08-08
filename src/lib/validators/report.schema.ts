/**
 * validators/report.schema.ts — Content report schema
 */
import { z } from 'zod';

export const createReportSchema = z.object({
  projectId: z.uuid('Invalid project ID'),
  reason: z
    .string()
    .min(10, 'Please provide more detail (minimum 10 characters)')
    .max(1000, 'Reason too long'),
});

export type CreateReportInput = z.infer<typeof createReportSchema>;
