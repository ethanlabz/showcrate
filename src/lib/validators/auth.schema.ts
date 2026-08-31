/**
 * validators/auth.schema.ts — Auth Zod schemas
 */
import { z } from 'zod';

// Reserved usernames — sourced from overview.new.md
const RESERVED_USERNAMES = new Set([
  'admin', 'showcase', 'templates', 'new', 'settings', 'help', 'notifications',
  'auth', 'login', 'logout', 'signup', 'register', 'forgot-password', 'reset-password',
  'about', 'blog', 'docs', 'terms', 'privacy', 'api', 'status', 'explore', 'contact',
  'editor', 'code', 'export', 'versions', 'users', 'projects', 'reports', 'logs',
  'billing', 'account', 'profile', 'appearance', 'danger', 'domain', 'seo',
  'analytics', 'collaborators', 'general', 'visibility', 'following',
  // Reserved developer / brand usernames
  'dorukaysor', 'avision', 'batteringram', 'showcrate',
]);

export const usernameSchema = z
  .string()
  .min(3, 'Username must be at least 3 characters')
  .max(39, 'Username must be at most 39 characters')
  .regex(/^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/, 'Username must be lowercase letters, numbers, and hyphens only')
  .refine((v) => !v.includes('--'), 'Username cannot contain consecutive hyphens')
  .refine((v) => !RESERVED_USERNAMES.has(v), 'This username is reserved');

export const signupSchema = z.object({
  email: z.email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(72, 'Password is too long')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  username: usernameSchema,
  displayName: z.string().max(60, 'Display name too long').optional(),
});

export const loginSchema = z.object({
  identifier: z.string().min(1, 'Username or email is required'),
  password: z.string().min(1, 'Password is required'),
});

export const forgotPasswordSchema = z.object({
  email: z.email('Invalid email address'),
});

export const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .max(72, 'Password is too long')
      .regex(/[A-Z]/, 'Must contain uppercase')
      .regex(/[0-9]/, 'Must contain number'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
