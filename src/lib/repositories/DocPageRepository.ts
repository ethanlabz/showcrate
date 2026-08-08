/**
 * DocPageRepository.ts — Database access for doc_pages and page_versions
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, DocPageRow, PageVersionRow } from '@/types/database';
import type { CreateDocPageInput, UpdateDocPageInput } from '@/lib/validators/doc-page.schema';

export class DocPageRepository {
  constructor(private readonly db: SupabaseClient<Database>) {}

  async findByProjectId(projectId: string): Promise<DocPageRow[]> {
    const { data, error } = await this.db
      .from('doc_pages')
      .select('id, project_id, slug, title, order_index, is_index, created_at, updated_at')
      .eq('project_id', projectId)
      .order('order_index');

    if (error) throw error;
    return (data ?? []) as DocPageRow[];
  }

  async findBySlug(projectId: string, slug: string): Promise<DocPageRow | null> {
    const { data, error } = await this.db
      .from('doc_pages')
      .select('*')
      .eq('project_id', projectId)
      .eq('slug', slug)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data;
  }

  async findById(id: string): Promise<DocPageRow | null> {
    const { data, error } = await this.db
      .from('doc_pages')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data;
  }

  /** Postgres full-text search using the content_tsv generated column */
  async searchFullText(projectId: string, query: string): Promise<DocPageRow[]> {
    const { data, error } = await this.db
      .from('doc_pages')
      .select('id, project_id, slug, title, order_index, is_index, created_at, updated_at')
      .eq('project_id', projectId)
      .textSearch('content_tsv', query, { type: 'websearch', config: 'english' });

    if (error) throw error;
    return (data ?? []) as DocPageRow[];
  }

  async create(data: CreateDocPageInput & { projectId: string }): Promise<DocPageRow> {
    const { data: row, error } = await this.db
      .from('doc_pages')
      .insert({
        project_id: data.projectId,
        slug: data.slug,
        title: data.title,
        content: data.content,
        order_index: data.orderIndex,
        is_index: data.isIndex,
      })
      .select()
      .single();

    if (error) throw error;
    return row;
  }

  async update(id: string, data: UpdateDocPageInput): Promise<DocPageRow> {
    const update: Partial<DocPageRow> = {};
    if (data.title !== undefined) update.title = data.title;
    if (data.content !== undefined) update.content = data.content;

    const { data: row, error } = await this.db
      .from('doc_pages')
      .update({ ...update, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return row;
  }

  async reorder(pages: Array<{ id: string; orderIndex: number }>): Promise<void> {
    // Batch update order_index for all pages
    const updates = pages.map(({ id, orderIndex }) =>
      this.db.from('doc_pages').update({ order_index: orderIndex }).eq('id', id),
    );
    await Promise.all(updates);
  }

  async delete(id: string): Promise<void> {
    const { error } = await this.db.from('doc_pages').delete().eq('id', id);
    if (error) throw error;
  }

  // ── Page versions ─────────────────────────────────────────────────────────

  async getVersions(pageId: string, limit = 10): Promise<PageVersionRow[]> {
    const { data, error } = await this.db
      .from('page_versions')
      .select('*')
      .eq('page_id', pageId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data ?? [];
  }

  async saveVersion(pageId: string, content: string, savedBy: string): Promise<PageVersionRow> {
    const { data, error } = await this.db
      .from('page_versions')
      .insert({ page_id: pageId, content, saved_by: savedBy })
      .select()
      .single();

    if (error) throw error;
    return data;
  }
}
