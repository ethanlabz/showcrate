/**
 * supabase/client.ts — Browser-safe Supabase client
 *
 * Uses the PUBLIC anon key only. Safe to use in React islands and
 * client-side code. Authenticated via the user's session cookie.
 *
 * ⚠️ NEVER import or use SUPABASE_SERVICE_ROLE_KEY here.
 */
import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/types/database';

export function createClient() {
  return createBrowserClient<Database>(
    import.meta.env.PUBLIC_SUPABASE_URL,
    import.meta.env.PUBLIC_SUPABASE_ANON_KEY,
  );
}
