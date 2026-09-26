/**
 * ReportRepository.ts — Database access for reports
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, ReportRow, ReportStatus } from '@/types/database';

export class ReportRepository {
  constructor(private readonly db: SupabaseClient<Database>) {}

  async create(reporterId: string, projectId: string, reason: string): Promise<ReportRow> {
    const { data, error } = await this.db
      .from('reports')
      .insert({ reporter_id: reporterId, project_id: projectId, reason })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async listPending(page = 1, limit = 20): Promise<{ reports: ReportRow[]; total: number }> {
    const offset = (page - 1) * limit;
    const { data, count, error } = await this.db
      .from('reports')
      .select('*', { count: 'exact' })
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .range(offset, offset + limit - 1);

    if (error) throw error;
    return { reports: data ?? [], total: count ?? 0 };
  }

  async updateStatus(id: string, status: ReportStatus): Promise<void> {
    const { error } = await this.db
      .from('reports')
      .update({ status })
      .eq('id', id);

    if (error) throw error;
  }
}
