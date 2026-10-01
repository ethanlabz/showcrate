/**
 * services/projectService.ts — Project business logic
 *
 * Enforces:
 * - Slug uniqueness per owner
 * - 301 redirect entry on rename
 * - Soft-delete with 30-day purge window
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, ProjectRow } from '@/types/database';
import { ProjectRepository, nameToSlug } from '@/lib/repositories/ProjectRepository';
import { DocPageRepository } from '@/lib/repositories/DocPageRepository';
import type { CreateProjectInput, UpdateProjectInput } from '@/lib/validators/project.schema';

export class ProjectService {
  private projectRepo: ProjectRepository;
  private docPageRepo: DocPageRepository;

  constructor(private readonly db: SupabaseClient<Database>) {
    this.projectRepo = new ProjectRepository(db);
    this.docPageRepo = new DocPageRepository(db);
  }

  async createProject(
    ownerId: string,
    input: CreateProjectInput,
  ): Promise<ProjectRow> {
    // 1. Generate unique slug from name
    const baseSlug = nameToSlug(input.name);
    const slug = await this.projectRepo.resolveUniqueSlug(ownerId, baseSlug);

    // 2. Create the project
    const project = await this.projectRepo.create({
      owner_id: ownerId,
      slug,
      name: input.name,
      tagline: input.tagline ?? null,
      cover_url: null,
      visibility: 'public',
      published: false,
      featured: false,
    });

    // 3. Apply template if specified
    if (input.templateId) {
      await this.applyTemplate(project.id, input.templateId);
    } else {
      // Create default index page
      await this.docPageRepo.create({
        projectId: project.id,
        slug: 'index',
        title: 'Getting Started',
        content: '# Getting Started\n\nWelcome to your new project!\n',
        orderIndex: 0,
        isIndex: true,
      });
    }

    return project;
  }

  async updateProject(
    projectId: string,
    actorId: string,
    input: UpdateProjectInput,
  ): Promise<ProjectRow> {
    const project = await this.projectRepo.findById(projectId);
    if (!project) throw Object.assign(new Error('Project not found'), { code: 'NOT_FOUND' });
    if (project.owner_id !== actorId) {
      throw Object.assign(new Error('Only the project owner can update this project'), {
        code: 'FORBIDDEN',
      });
    }

    // Handle rename → new slug + 301 redirect
    if (input.name && input.name !== project.name) {
      const baseSlug = nameToSlug(input.name);
      const newSlug = await this.projectRepo.resolveUniqueSlug(actorId, baseSlug);

      if (newSlug !== project.slug) {
        await this.db.from('project_redirects').insert({
          owner_id: actorId,
          old_slug: project.slug,
          new_slug: newSlug,
        });
        return this.projectRepo.update(projectId, { ...input, slug: newSlug });
      }
    }

    return this.projectRepo.update(projectId, input);
  }

  async setVisibility(
    projectId: string,
    actorId: string,
    visibility: 'public' | 'private' | 'unlisted',
  ): Promise<void> {
    const project = await this.projectRepo.findById(projectId);
    if (!project) throw Object.assign(new Error('Project not found'), { code: 'NOT_FOUND' });
    if (project.owner_id !== actorId) {
      throw Object.assign(new Error('Only the project owner can change visibility'), {
        code: 'FORBIDDEN',
      });
    }

    await this.projectRepo.update(projectId, { visibility });
  }

  async publishProject(projectId: string, actorId: string, published: boolean): Promise<void> {
    const project = await this.projectRepo.findById(projectId);
    if (!project) throw Object.assign(new Error('Project not found'), { code: 'NOT_FOUND' });
    if (project.owner_id !== actorId) {
      throw Object.assign(new Error('Only the project owner can publish this project'), {
        code: 'FORBIDDEN',
      });
    }
    await this.projectRepo.update(projectId, { published });
  }

  async deleteProject(projectId: string, actorId: string): Promise<void> {
    const project = await this.projectRepo.findById(projectId);
    if (!project) throw Object.assign(new Error('Project not found'), { code: 'NOT_FOUND' });
    if (project.owner_id !== actorId) {
      throw Object.assign(new Error('Only the project owner can delete this project'), {
        code: 'FORBIDDEN',
      });
    }
    await this.projectRepo.softDelete(projectId);
  }

  // ── Private helpers ─────────────────────────────────────────────────────

  private async applyTemplate(projectId: string, templateId: string): Promise<void> {
    const { data: template } = await this.db
      .from('templates')
      .select('structure')
      .eq('id', templateId)
      .single();

    if (!template?.structure || !Array.isArray(template.structure) || template.structure.length === 0) {
      // Fallback to default index page if template has no structure
      await this.db.from('doc_pages').insert({
        id: crypto.randomUUID(),
        project_id: projectId,
        parent_id: null,
        kind: 'page',
        title: 'Getting Started',
        slug: 'index',
        content: '# Getting Started\n\nWelcome to your new project!\n',
        order_index: 0,
        is_index: true,
      });
      return;
    }

    const existingSlugs = new Set<string>();
    let isFirstPage = true;

    const insertNodes = async (nodes: any[], parentId: string | null): Promise<void> => {
      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        const nodeId = crypto.randomUUID();
        const kind = node.kind === 'folder' ? 'folder' : 'page';
        let slug: string | null = null;
        let isIndex = false;

        if (kind === 'page') {
          if (isFirstPage && parentId === null) {
            slug = 'index';
            isIndex = true;
            isFirstPage = false;
            existingSlugs.add('index');
          } else {
            const rawTitle = node.title || 'Untitled';
            let candidate = rawTitle
              .trim()
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, '-')
              .replace(/^-+|-+$/g, '') || 'page';
            let suffix = 2;
            let finalSlug = candidate;
            while (existingSlugs.has(finalSlug)) {
              finalSlug = `${candidate}-${suffix}`;
              suffix++;
            }
            slug = finalSlug;
            existingSlugs.add(slug);
          }
        }

        await this.db.from('doc_pages').insert({
          id: nodeId,
          project_id: projectId,
          parent_id: parentId,
          kind,
          title: node.title || (kind === 'folder' ? 'New Folder' : 'Untitled'),
          slug,
          content: kind === 'page' ? (node.content ?? '[]') : null,
          order_index: i,
          is_index: isIndex,
        });

        if (node.children && Array.isArray(node.children) && node.children.length > 0) {
          await insertNodes(node.children, nodeId);
        }
      }
    };

    await insertNodes(template.structure, null);
  }
}
