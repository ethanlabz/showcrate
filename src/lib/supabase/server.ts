/**
 * supabase/server.ts — SSR/server-only Supabase client factory
 *
 * Creates a cookie-based Supabase client for use in:
 * - Astro frontmatter (server context)
 * - Astro API routes
 * - Middleware
 *
 * Two client types:
 * 1. createServerClient()      — Uses anon key + session cookie (respects RLS)
 * 2. createAdminClient()       — Uses service role key (bypasses RLS — admin ops only)
 *
 * ⚠️ SERVER-SIDE ONLY. Never import in React islands or client bundles.
 * ⚠️ Admin client bypasses RLS — use only for trusted server-side admin operations.
 */
import { createServerClient as createSSRClient, type CookieOptions } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import type { AstroCookies } from 'astro';
import type { Database } from '@/types/database';
import { config } from '@/lib/config/unified-config';

/**
 * Creates a cookie-based Supabase client that reads/writes the user session
 * from Astro's cookies. Respects RLS policies.
 *
 * Usage in Astro frontmatter or API route:
 *   const supabase = createServerClient(Astro.cookies);
 */
export function createServerClient(cookies: AstroCookies): any {
  return createSSRClient<any>(
    config.supabase.url,
    config.supabase.anonKey,
    {
      cookies: {
        get(name: string) {
          return cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          cookies.set(name, value, options);
        },
        remove(name: string, options: CookieOptions) {
          cookies.delete(name, options);
        },
      },
    },
  ) as any;
}

/**
 * Creates a Supabase admin client using the service role key.
 * Bypasses RLS — use ONLY for trusted server-side operations such as:
 * - Admin user management
 * - Scheduled cleanup jobs
 * - Webhook handlers
 *
 * ⚠️  Never use this client for user-initiated requests without explicit
 *     permission checks in application logic.
 */
export function createAdminClient(): any {
  return createClient<any>(
    config.supabase.url,
    config.supabase.serviceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  ) as any;
}
