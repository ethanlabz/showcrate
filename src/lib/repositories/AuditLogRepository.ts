/**
 * AuditLogRepository.ts — Database access for admin_audit_log (insert-only)
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, AdminAuditLogRow, AuditLogInsert, AdminAction } from '@/types/database';

export class AuditLogRepository {
  constructor(private readonly db: SupabaseClient<Database>) {}

  /**
   * Record an admin action. Uses the admin client (service role) since
   * the RLS policy blocks direct inserts.
   */
  async log(
    actorId: string,
    action: AdminAction,
    targetType: string,
    targetId: string | null,
    metadata: Record<string, unknown> = {},
  ): Promise<void> {
    const { error } = await this.db.from('admin_audit_log').insert({
      actor_id: actorId,
      action,
      target_type: targetType,
      target_id: targetId,
      metadata,
    } satisfies AuditLogInsert);

    if (error) throw error;
  }

  async list(
    page = 1,
    limit = 50,
    filters?: { actorId?: string; targetType?: string },
  ): Promise<{ logs: AdminAuditLogRow[]; total: number }> {
    const offset = (page - 1) * limit;
    let query = this.db
      .from('admin_audit_log')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (filters?.actorId) query = query.eq('actor_id', filters.actorId);
    if (filters?.targetType) query = query.eq('target_type', filters.targetType);

    const { data, count, error } = await query;
    if (error) throw error;
    return { logs: data ?? [], total: count ?? 0 };
  }
}
