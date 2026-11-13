/**
 * AnalyticsRepository.ts — Database access for project_views
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, ProjectViewRow } from '@/types/database';

export interface ViewStats {
  totalViews: number;
  uniqueIpCount: number;
  byPage: Array<{ page_slug: string | null; views: number }>;
  byCountry: Array<{ country: string | null; views: number }>;
  byDay: Array<{ day: string; views: number }>;
}

export class AnalyticsRepository {
  constructor(private readonly db: SupabaseClient<Database>) {}

  async trackView(data: {
    projectId: string;
    pageSlug?: string;
    viewerId?: string;
    ipHash?: string;
    referrer?: string;
    country?: string;
  }): Promise<void> {
    const { error } = await this.db.from('project_views').insert({
      project_id: data.projectId,
      page_slug: data.pageSlug ?? null,
      viewer_id: data.viewerId ?? null,
      ip_hash: data.ipHash ?? null,
      referrer: data.referrer ?? null,
      country: data.country ?? null,
    });

    if (error) throw error;
  }

  async wasRecentlyViewed(ipHash: string, projectId: string, windowSeconds = 60): Promise<boolean> {
    const since = new Date(Date.now() - windowSeconds * 1000).toISOString();
    const { count, error } = await this.db
      .from('project_views')
      .select('id', { count: 'exact', head: true })
      .eq('ip_hash', ipHash)
      .eq('project_id', projectId)
      .gte('viewed_at', since);

    if (error) return false; // fail open — don't block views on error
    return (count ?? 0) > 0;
  }

  async getStats(projectId: string, days = 30): Promise<ViewStats> {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    const { data: views, error } = await this.db
      .from('project_views')
      .select('page_slug, ip_hash, country, viewed_at')
      .eq('project_id', projectId)
      .gte('viewed_at', since);

    if (error) throw error;
    const rows = views ?? [];

    // Aggregate in application layer (small data sets; avoids complex SQL via client)
    const totalViews = rows.length;
    const uniqueIpCount = new Set(rows.map((r) => r.ip_hash).filter(Boolean)).size;

    const pageMap = new Map<string | null, number>();
    const countryMap = new Map<string | null, number>();
    const dayMap = new Map<string, number>();

    for (const row of rows) {
      pageMap.set(row.page_slug, (pageMap.get(row.page_slug) ?? 0) + 1);
      countryMap.set(row.country, (countryMap.get(row.country) ?? 0) + 1);
      const day = row.viewed_at.slice(0, 10);
      dayMap.set(day, (dayMap.get(day) ?? 0) + 1);
    }

    return {
      totalViews,
      uniqueIpCount,
      byPage: [...pageMap.entries()].map(([page_slug, views]) => ({ page_slug, views })),
      byCountry: [...countryMap.entries()].map(([country, views]) => ({ country, views })),
      byDay: [...dayMap.entries()].map(([day, views]) => ({ day, views })).sort((a, b) => a.day.localeCompare(b.day)),
    };
  }
}
