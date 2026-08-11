/**
 * services/docService.ts — Documentation page business logic
 *
 * Handles: page save (with version snapshot), FTS search,
 * page reorder (validates ownership).
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, DocPageRow } from '@/types/database';
import { DocPageRepository } from '@/lib/repositories/DocPageRepository';
import { ProjectRepository } from '@/lib/repositories/ProjectRepository';
import { getPlanLimits } from '@/types/auth';
import type { PlatformRole } from '@/types/database';
import type {
  CreateDocPageInput,
  UpdateDocPageInput,
  ReorderPagesInput,
} from '@/lib/validators/doc-page.schema';

export class DocService {
  private docRepo: DocPageRepository;
  private projectRepo: ProjectRepository;

  constructor(private readonly db: SupabaseClient<Database>) {
    this.docRepo = new DocPageRepository(db);
    this.projectRepo = new ProjectRepository(db);
  }

  async getPages(projectId: string): Promise<DocPageRow[]> {
    return this.docRepo.findByProjectId(projectId);
  }

  async getPage(projectId: string, slug: string): Promise<DocPageRow | null> {
    return this.docRepo.findBySlug(projectId, slug);
  }

  async createPage(
    projectId: string,
    actorId: string,
    input: CreateDocPageInput,
  ): Promise<DocPageRow> {
    // Verify actor has access to this project (owner or collaborator)
    await this.assertWriteAccess(projectId, actorId);

    // Check slug uniqueness
    const existing = await this.docRepo.findBySlug(projectId, input.slug);
    if (existing) {
      throw Object.assign(new Error('A page with this slug already exists'), {
        code: 'SLUG_TAKEN',
      });
    }

    return this.docRepo.create({ ...input, projectId });
  }

  async savePage(
    pageId: string,
    actorId: string,
    ownerRole: PlatformRole,
    input: UpdateDocPageInput,
  ): Promise<DocPageRow> {
    const page = await this.docRepo.findById(pageId);
    if (!page) {
      throw Object.assign(new Error('Page not found'), { code: 'NOT_FOUND' });
    }

    await this.assertWriteAccess(page.project_id, actorId);

    // Save current content as a version snapshot before overwriting
    const limits = getPlanLimits(ownerRole);
    await this.createVersionSnapshot(pageId, page.content, actorId, limits.maxVersionSnapshots);

    return this.docRepo.update(pageId, input);
  }

  async deletePage(pageId: string, actorId: string): Promise<void> {
    const page = await this.docRepo.findById(pageId);
    if (!page) throw Object.assign(new Error('Page not found'), { code: 'NOT_FOUND' });

    // Only owner can delete pages
    const project = await this.projectRepo.findById(page.project_id);
    if (!project || project.owner_id !== actorId) {
      throw Object.assign(new Error('Only the project owner can delete pages'), { code: 'FORBIDDEN' });
    }

    if (page.is_index) {
      throw Object.assign(new Error('Cannot delete the index page'), { code: 'CANNOT_DELETE_INDEX' });
    }

    await this.docRepo.delete(pageId);
  }

  async reorderPages(projectId: string, actorId: string, input: ReorderPagesInput): Promise<void> {
    // Only owner can reorder
    const project = await this.projectRepo.findById(projectId);
    if (!project || project.owner_id !== actorId) {
      throw Object.assign(new Error('Only the project owner can reorder pages'), { code: 'FORBIDDEN' });
    }

    await this.docRepo.reorder(input.pages.map((p) => ({ id: p.id, orderIndex: p.orderIndex })));
  }

  async search(projectId: string, query: string): Promise<DocPageRow[]> {
    return this.docRepo.searchFullText(projectId, query);
  }

  async getVersions(pageId: string, actorId: string, limit = 10) {
    const page = await this.docRepo.findById(pageId);
    if (!page) throw Object.assign(new Error('Page not found'), { code: 'NOT_FOUND' });
    await this.assertWriteAccess(page.project_id, actorId);
    return this.docRepo.getVersions(pageId, limit);
  }

  // ── Private helpers ─────────────────────────────────────────────────────

  private async assertWriteAccess(projectId: string, userId: string): Promise<void> {
    // Check if owner
    const project = await this.projectRepo.findById(projectId);
    if (!project) throw Object.assign(new Error('Project not found'), { code: 'NOT_FOUND' });
    
    if (project.owner_id !== userId) {
      throw Object.assign(new Error('You do not have write access to this project'), {
        code: 'FORBIDDEN',
      });
    }
  }

  private async createVersionSnapshot(
    pageId: string,
    content: string,
    savedBy: string,
    maxSnapshots: number,
  ): Promise<void> {
    if (!content.trim()) return; // don't snapshot empty content

    await this.docRepo.saveVersion(pageId, content, savedBy);

    // Prune old versions beyond plan limit
    if (maxSnapshots !== Infinity) {
      const versions = await this.docRepo.getVersions(pageId, maxSnapshots + 10);
      const toDelete = versions.slice(maxSnapshots);
      if (toDelete.length > 0) {
        await this.db
          .from('page_versions')
          .delete()
          .in('id', toDelete.map((v) => v.id));
      }
    }
  }
}
