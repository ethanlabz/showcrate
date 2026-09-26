import type { APIRoute } from 'astro';
import { createAdminClient } from '../../../lib/supabase/server';
import type { AdminAuditLogRow } from '../../../types/database';

function generateTimeSeries(count: number, min: number, max: number, volatility: number) {
  let current = min + (max - min) / 2;
  return Array.from({ length: count }, () => {
    current += (Math.random() - 0.5) * volatility;
    current = Math.max(min, Math.min(max, current));
    return Math.round(current);
  });
}

export const GET: APIRoute = async () => {
  const supabase = createAdminClient();
  const startTime = performance.now();
  let dbError = null;
  let logs: AdminAuditLogRow[] = [];
  let dbLatency = 0;

  try {
    // Test DB connection with a short timeout to prevent hanging on bad URLs
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000); // 2 second timeout
    
    const { error } = await supabase.from('users').select('id').limit(1).abortSignal(controller.signal);
    clearTimeout(timeout);
    
    dbError = error ? error.message : null;
    dbLatency = Math.round(performance.now() - startTime);

    if (!dbError) {
      const { data } = await supabase
        .from('admin_audit_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);
      logs = data || [];
    }
  } catch (err: any) {
    dbError = err.name === 'AbortError' ? 'Connection timed out (2000ms)' : err.message;
    dbLatency = Math.round(performance.now() - startTime);
  }

  const cpuHistory = generateTimeSeries(24, 10, 85, 15);
  const ramHistory = generateTimeSeries(24, 40, 60, 5);
  
  // If the .env URL is dummy (e.g. your-project-ref), it will fail.
  // We'll mark it degraded but prevent it from taking 7 seconds.
  const isHealthy = !dbError && dbLatency < 500 && cpuHistory[cpuHistory.length - 1] < 90;

  return new Response(
    JSON.stringify({
      isHealthy,
      dbLatency,
      dbError,
      cpuHistory,
      ramHistory,
      logs,
    }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );
};
