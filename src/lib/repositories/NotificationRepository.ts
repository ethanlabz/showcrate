/**
 * NotificationRepository.ts — Database access for notifications
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, NotificationRow, NotificationInsert } from '@/types/database';

export class NotificationRepository {
  constructor(private readonly db: SupabaseClient<Database>) {}

  async findByUser(userId: string, page = 1, limit = 20): Promise<NotificationRow[]> {
    const offset = (page - 1) * limit;
    const { data, error } = await this.db
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;
    return data ?? [];
  }

  async countUnread(userId: string): Promise<number> {
    const { count, error } = await this.db
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('read', false);

    if (error) throw error;
    return count ?? 0;
  }

  async create(data: NotificationInsert): Promise<NotificationRow> {
    const { data: row, error } = await this.db
      .from('notifications')
      .insert(data)
      .select()
      .single();

    if (error) throw error;
    return row;
  }

  async markAsRead(ids: string[], userId: string): Promise<void> {
    const { error } = await this.db
      .from('notifications')
      .update({ read: true })
      .in('id', ids)
      .eq('user_id', userId); // safety: only update own notifications

    if (error) throw error;
  }

  async markAllAsRead(userId: string): Promise<void> {
    const { error } = await this.db
      .from('notifications')
      .update({ read: true })
      .eq('user_id', userId)
      .eq('read', false);

    if (error) throw error;
  }
}
