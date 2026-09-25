/**
 * unified-config.ts — Single source of truth for all environment variables.
 *
 * Rules:
 * 1. ALL process.env / import.meta.env access goes through this file ONLY.
 * 2. Validated with Zod at module load — throws at startup if required vars are missing.
 * 3. Never import this in client-side (browser) code — use PUBLIC_* vars directly there.
 */
import { z } from 'zod';

const configSchema = z.object({
  // Supabase
  supabase: z.object({
    url: z.url('SUPABASE_URL must be a valid URL'),
    anonKey: z.string().min(1, 'PUBLIC_SUPABASE_ANON_KEY is required'),
    serviceRoleKey: z.string().min(1, 'SUPABASE_SERVICE_ROLE_KEY is required'),
  }),

  // Site
  site: z.object({
    url: z.url('SITE_URL must be a valid URL').default('http://localhost:4321'),
    nodeEnv: z.enum(['development', 'production', 'test']).default('development'),
  }),

  // Email (Resend)
  email: z.object({
    resendApiKey: z.string().min(1, 'RESEND_API_KEY is required'),
    fromEmail: z.email('RESEND_FROM_EMAIL must be valid').default('noreply@showcrate.io'),
  }),

  // Sentry
  sentry: z.object({
    dsn: z.string().optional(),
  }),
});

type Config = z.infer<typeof configSchema>;

function loadConfig(): Config {
  const isDev = import.meta.env.NODE_ENV !== 'production';
  
  // In development with missing vars, use safe placeholder defaults so the
  // dev server starts without all env vars set. API calls will fail at runtime
  // but the server itself will not crash on import.
  const raw = {
    supabase: {
      url:
        (typeof process !== 'undefined' ? (process.env.PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL) : undefined) ??
        import.meta.env.PUBLIC_SUPABASE_URL ??
        import.meta.env.SUPABASE_URL ??
        (isDev ? 'http://localhost:54321' : undefined),
      anonKey:
        (typeof process !== 'undefined' ? (process.env.PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY) : undefined) ??
        import.meta.env.PUBLIC_SUPABASE_ANON_KEY ??
        import.meta.env.SUPABASE_ANON_KEY ??
        (isDev ? 'dev-anon-key' : undefined),
      serviceRoleKey:
        (typeof process !== 'undefined' ? process.env.SUPABASE_SERVICE_ROLE_KEY : undefined) ??
        import.meta.env.SUPABASE_SERVICE_ROLE_KEY ??
        (isDev ? 'dev-service-key' : undefined),
    },
    site: {
      url:
        (typeof process !== 'undefined' ? (process.env.SITE_URL || process.env.PUBLIC_SITE_URL) : undefined) ??
        import.meta.env.SITE_URL ??
        import.meta.env.PUBLIC_SITE_URL ??
        'http://localhost:4321',
      nodeEnv:
        (typeof process !== 'undefined' ? (process.env.NODE_ENV as any) : undefined) ??
        import.meta.env.NODE_ENV ??
        'development',
    },
    email: {
      resendApiKey:
        (typeof process !== 'undefined' ? process.env.RESEND_API_KEY : undefined) ??
        import.meta.env.RESEND_API_KEY ??
        (isDev ? 'dev-resend-key' : undefined),
      fromEmail:
        (typeof process !== 'undefined' ? process.env.RESEND_FROM_EMAIL : undefined) ??
        import.meta.env.RESEND_FROM_EMAIL ??
        'noreply@showcrate.tech',
    },
    sentry: {
      dsn:
        (typeof process !== 'undefined' ? process.env.SENTRY_DSN : undefined) ??
        import.meta.env.SENTRY_DSN,
    },
  };

  const result = configSchema.safeParse(raw);

  if (!result.success) {
    const issues = result.error.issues.map((i) => `  • ${i.path.join('.')}: ${i.message}`).join('\n');
    if (!isDev) {
      throw new Error(`[showcrate] Invalid configuration:\n${issues}`);
    }
    // In dev, warn but don't crash
    console.warn(`[showcrate] ⚠️  Missing env vars (dev mode — set real values in .env for full functionality):\n${issues}`);
    // Return a partial config for dev
    return {} as unknown as Config;
  }

  return result.data;
}

// Singleton — validated once at module load
export const config = loadConfig();
