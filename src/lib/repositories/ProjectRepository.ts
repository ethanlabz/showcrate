/**
 * ProjectRepository.ts — Database access for projects table
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, ProjectRow, ProjectInsert } from '@/types/database';
import { customAlphabet } from 'nanoid';

const nanoid = customAlphabet('abcdefghijklmnopqrstuvwxyz0123456789', 8);

/** Generate a URL-safe slug from a project name */
export function nameToSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

export interface ShowcaseFilters {
  search?: string;
  page?: number;
  limit?: number;
}

export class ProjectRepository {
  constructor(private readonly db: SupabaseClient<Database>) {}

  async findById(id: string): Promise<ProjectRow | null> {
    const { data, error } = await this.db
      .from('projects')
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data;
  }

  async findByOwnerAndSlug(
    ownerId: string,
    slug: string,
  ): Promise<ProjectRow | null> {
    const { data, error } = await this.db
      .from('projects')
      .select('*')
      .eq('owner_id', ownerId)
      .eq('slug', slug)
      .is('deleted_at', null)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data;
  }

  async countByOwner(ownerId: string): Promise<number> {
    const { count, error } = await this.db
      .from('projects')
      .select('id', { count: 'exact', head: true })
      .eq('owner_id', ownerId)
      .is('deleted_at', null);

    if (error) throw error;
    return count ?? 0;
  }

  /** Resolve slug collision: append nanoid suffix if slug already taken */
  async resolveUniqueSlug(ownerId: string, baseSlug: string): Promise<string> {
    let slug = baseSlug;
    let attempt = 0;
    while (attempt < 5) {
      const existing = await this.findByOwnerAndSlug(ownerId, slug);
      if (!existing) return slug;
      slug = `${baseSlug}-${nanoid()}`;
      attempt++;
    }
    throw new Error('Could not generate a unique slug — please rename your project');
  }

  async create(data: ProjectInsert): Promise<ProjectRow> {
    const { data: row, error } = await this.db
      .from('projects')
      .insert(data)
      .select()
      .single();

    if (error) throw error;
    return row;
  }

  async update(id: string, data: Partial<ProjectInsert>): Promise<ProjectRow> {
    const { data: row, error } = await this.db
      .from('projects')
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('id', id)
      .is('deleted_at', null)
      .select()
      .single();

    if (error) throw error;
    return row;
  }

  async softDelete(id: string): Promise<void> {
    const { error } = await this.db
      .from('projects')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;
  }

  async listShowcase(filters: ShowcaseFilters): Promise<{ projects: ProjectRow[]; total: number }> {
    const { search, page = 1, limit = 24 } = filters;
    const offset = (page - 1) * limit;

    let query = this.db
      .from('projects')
      .select('*', { count: 'exact' })
      .eq('published', true)
      .eq('visibility', 'public')
      .is('deleted_at', null);

    if (search) {
      query = query.or(`name.ilike.%${search}%,tagline.ilike.%${search}%`);
    }

    const { data, count, error } = await query
      .order('featured', { ascending: false })
      .order('view_count', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;
    return { projects: data ?? [], total: count ?? 0 };
  }

  async findRedirect(ownerId: string, oldSlug: string): Promise<string | null> {
    const { data, error } = await this.db
      .from('project_redirects')
      .select('new_slug')
      .eq('owner_id', ownerId)
      .eq('old_slug', oldSlug)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error) return null;
    return data?.new_slug ?? null;
  }

  async createRedirect(ownerId: string, oldSlug: string, newSlug: string): Promise<void> {
    const { error } = await this.db
      .from('project_redirects')
      .insert({ owner_id: ownerId, old_slug: oldSlug, new_slug: newSlug });

    if (error) throw error;
  }

  async incrementViewCount(id: string): Promise<void> {
    const { error } = await this.db.rpc('increment_view_count', { project_id: id });
    // Fallback if RPC not available
    if (error) {
      await this.db
        .from('projects')
        .update({ view_count: 0 }) // handled by DB trigger ideally
        .eq('id', id);
    }
  }
}
