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

  // Email (Resend) — optional: missing key means emails won't send but the app still works
  email: z.object({
    resendApiKey: z.string().min(1).optional(),
    fromEmail: z.string().email().default('onboarding@resend.dev'),
  }),

  // Sentry
  sentry: z.object({
    dsn: z.string().optional(),
  }),
});

type Config = z.infer<typeof configSchema>;

function loadConfig(): Config {
  const isDev = import.meta.env.NODE_ENV !== 'production';

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
        (typeof process !== 'undefined' ? (process.env.SITE_URL || process.env.PUBLIC_SITE_URL || process.env.URL) : undefined) ??
        import.meta.env.SITE_URL ??
        import.meta.env.PUBLIC_SITE_URL ??
        'http://localhost:4321',
      nodeEnv:
        (typeof process !== 'undefined' ? (process.env.NODE_ENV as any) : undefined) ??
        import.meta.env.NODE_ENV ??
        'development',
    },
    email: {
      // Optional — app functions without it; only email sending breaks
      resendApiKey:
        (typeof process !== 'undefined' ? process.env.RESEND_API_KEY : undefined) ??
        import.meta.env.RESEND_API_KEY ??
        undefined,
      fromEmail:
        (typeof process !== 'undefined' ? process.env.RESEND_FROM_EMAIL : undefined) ??
        import.meta.env.RESEND_FROM_EMAIL ??
        'onboarding@resend.dev',
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
    // Only throw for Supabase vars — those are truly required. Everything else
    // degrades gracefully (email → no emails sent, Sentry → no error reporting).
    const criticalIssues = result.error.issues.filter((i) => i.path[0] === 'supabase');
    if (!isDev && criticalIssues.length > 0) {
      throw new Error(`[showcrate] Missing required configuration:\n${criticalIssues.map((i) => `  • ${i.path.join('.')}: ${i.message}`).join('\n')}`);
    }
    console.warn(`[showcrate] ⚠️  Missing env vars:\n${issues}`);
    // Return best-effort config
    return (result.data ?? raw) as unknown as Config;
  }

  return result.data;
}

// Singleton — validated once at module load
export const config = loadConfig();
