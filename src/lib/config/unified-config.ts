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
      url: import.meta.env.SUPABASE_URL ?? (isDev ? 'http://localhost:54321' : undefined),
      anonKey: import.meta.env.PUBLIC_SUPABASE_ANON_KEY ?? (isDev ? 'dev-anon-key' : undefined),
      serviceRoleKey: import.meta.env.SUPABASE_SERVICE_ROLE_KEY ?? (isDev ? 'dev-service-key' : undefined),
    },
    site: {
      url: import.meta.env.SITE_URL ?? 'http://localhost:4321',
      nodeEnv: import.meta.env.NODE_ENV ?? 'development',
    },
    email: {
      resendApiKey: import.meta.env.RESEND_API_KEY ?? (isDev ? 'dev-resend-key' : undefined),
      fromEmail: import.meta.env.RESEND_FROM_EMAIL ?? 'noreply@showcrate.io',
    },
    sentry: {
      dsn: import.meta.env.SENTRY_DSN,
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
