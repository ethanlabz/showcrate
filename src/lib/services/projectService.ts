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

    if (!template?.structure) {
      // Fallback to default page if template not found
      await this.docPageRepo.create({
        projectId,
        slug: 'index',
        title: 'Getting Started',
        content: '# Getting Started\n\nWelcome to your new project!\n',
        orderIndex: 0,
        isIndex: true,
      });
      return;
    }

    const pages = (template.structure as any[]).sort((a, b) => a.order_index - b.order_index);
    for (const page of pages) {
      await this.docPageRepo.create({
        projectId,
        slug: page.slug,
        title: page.title,
        content: page.content ?? '',
        orderIndex: page.order_index,
        isIndex: page.is_index ?? false,
      });
    }
  }
}
