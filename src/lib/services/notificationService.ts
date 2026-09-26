/**
 * services/notificationService.ts — Notification management
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, NotificationRow } from '@/types/database';
import { NotificationRepository } from '@/lib/repositories/NotificationRepository';

export class NotificationService {
  private notifRepo: NotificationRepository;

  constructor(private readonly db: SupabaseClient<Database>) {
    this.notifRepo = new NotificationRepository(db);
  }

  async getUserNotifications(userId: string, page = 1): Promise<{
    notifications: NotificationRow[];
    unreadCount: number;
  }> {
    const [notifications, unreadCount] = await Promise.all([
      this.notifRepo.findByUser(userId, page, 20),
      this.notifRepo.countUnread(userId),
    ]);
    return { notifications, unreadCount };
  }

  async markAsRead(ids: string[], userId: string): Promise<void> {
    await this.notifRepo.markAsRead(ids, userId);
  }

  async markAllAsRead(userId: string): Promise<void> {
    await this.notifRepo.markAllAsRead(userId);
  }
}
