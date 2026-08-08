/**
 * services/analyticsService.ts — View tracking + stats
 *
 * Security:
 * - Raw IPs are NEVER stored. IP is hashed: SHA-256(ip + daily_salt)
 * - Deduplication: 60-second cooldown per IP+project
 * - Rate limiting is enforced at middleware level too
 */
import { createHash } from 'crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import { AnalyticsRepository } from '@/lib/repositories/AnalyticsRepository';
import type { ViewStats } from '@/lib/repositories/AnalyticsRepository';

// Daily salt changes at midnight UTC — prevents correlation across days
function getDailySalt(): string {
  const date = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  return `showcrate-${date}`;
}

export function hashIp(ip: string): string {
  return createHash('sha256')
    .update(ip + getDailySalt())
    .digest('hex')
    .slice(0, 32); // Truncate — no need for full 64 chars
}

export class AnalyticsService {
  private analyticsRepo: AnalyticsRepository;

  constructor(private readonly db: SupabaseClient<Database>) {
    this.analyticsRepo = new AnalyticsRepository(db);
  }

  async trackView(opts: {
    projectId: string;
    pageSlug?: string;
    viewerId?: string;
    ip: string;
    referrer?: string;
    country?: string;
  }): Promise<void> {
    const ipHash = hashIp(opts.ip);

    // Deduplicate: skip if same IP viewed this project in last 60s
    const recentlySeen = await this.analyticsRepo.wasRecentlyViewed(ipHash, opts.projectId, 60);
    if (recentlySeen) return;

    await this.analyticsRepo.trackView({
      projectId: opts.projectId,
      pageSlug: opts.pageSlug,
      viewerId: opts.viewerId,
      ipHash,
      referrer: opts.referrer ? new URL(opts.referrer).hostname : undefined, // Store hostname only
      country: opts.country,
    });
  }

  async getProjectStats(projectId: string, days = 30): Promise<ViewStats> {
    return this.analyticsRepo.getStats(projectId, days);
  }
}
