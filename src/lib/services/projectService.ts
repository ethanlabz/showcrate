/**
 * services/projectService.ts — Project business logic
 *
 * Enforces:
 * - Plan limits (7 projects for free users)
 * - Slug uniqueness per owner
 * - 301 redirect entry on rename
 * - Soft-delete with 30-day purge window
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, ProjectRow } from '@/types/database';
import { ProjectRepository, nameToSlug } from '@/lib/repositories/ProjectRepository';
import { DocPageRepository } from '@/lib/repositories/DocPageRepository';
import { getPlanLimits } from '@/types/auth';
import type { PlatformRole } from '@/types/database';
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
    ownerRole: PlatformRole,
    input: CreateProjectInput,
  ): Promise<ProjectRow> {
    // 1. Enforce plan project limit
    const limits = getPlanLimits(ownerRole);
    if (limits.maxProjects !== Infinity) {
      const count = await this.projectRepo.countByOwner(ownerId);
      if (count >= limits.maxProjects) {
        throw Object.assign(
          new Error(`You've reached the limit of ${limits.maxProjects} projects on your plan`),
          { code: 'PLAN_LIMIT_EXCEEDED' },
        );
      }
    }

    // 2. Generate unique slug from name
    const baseSlug = nameToSlug(input.name);
    const slug = await this.projectRepo.resolveUniqueSlug(ownerId, baseSlug);

    // 3. Create the project
    const project = await this.projectRepo.create({
      owner_id: ownerId,
      slug,
      name: input.name,
      tagline: input.tagline ?? null,
      cover_url: null,
      visibility: 'public',
      password_hash: null,
      published: false,
      featured: false,
    });

    // 4. Apply template if specified
    if (input.templateId) {
      await this.applyTemplate(project.id, input.templateId);
    } else {
      // Create a default index page
      await this.docPageRepo.create({
        projectId: project.id,
        slug: 'index',
        title: 'Getting Started',
        content: `# ${input.name}\n\n${input.tagline ?? 'Welcome to my project!'}\n\n## Overview\n\nAdd your documentation here.\n`,
        orderIndex: 0,
        isIndex: true,
      });
    }

    return project;
  }

  async renameProject(
    projectId: string,
    ownerId: string,
    newName: string,
  ): Promise<ProjectRow> {
    const project = await this.projectRepo.findById(projectId);
    if (!project || project.owner_id !== ownerId) {
      throw Object.assign(new Error('Project not found'), { code: 'NOT_FOUND' });
    }

    const oldSlug = project.slug;
    const baseSlug = nameToSlug(newName);
    const newSlug = await this.projectRepo.resolveUniqueSlug(ownerId, baseSlug);

    // Update project name and slug
    const updated = await this.projectRepo.update(projectId, { name: newName, slug: newSlug });

    // Create redirect: old URL → new URL (never break existing links)
    if (oldSlug !== newSlug) {
      await this.projectRepo.createRedirect(ownerId, oldSlug, newSlug);
    }

    return updated;
  }

  async updateProject(
    projectId: string,
    ownerId: string,
    input: UpdateProjectInput,
  ): Promise<ProjectRow> {
    const project = await this.projectRepo.findById(projectId);
    if (!project || project.owner_id !== ownerId) {
      throw Object.assign(new Error('Project not found'), { code: 'NOT_FOUND' });
    }

    return this.projectRepo.update(projectId, {
      ...(input.name !== undefined && { name: input.name, slug: nameToSlug(input.name) }),
      ...(input.tagline !== undefined && { tagline: input.tagline }),
      ...(input.coverUrl !== undefined && { cover_url: input.coverUrl }),
    });
  }

  async publishProject(projectId: string, ownerId: string, published: boolean): Promise<void> {
    const project = await this.projectRepo.findById(projectId);
    if (!project || project.owner_id !== ownerId) {
      throw Object.assign(new Error('Project not found'), { code: 'NOT_FOUND' });
    }
    await this.projectRepo.update(projectId, { published });
  }

  async deleteProject(projectId: string, ownerId: string): Promise<void> {
    const project = await this.projectRepo.findById(projectId);
    if (!project || project.owner_id !== ownerId) {
      throw Object.assign(new Error('Project not found'), { code: 'NOT_FOUND' });
    }
    // Soft delete — purged after 30 days by a scheduled job
    await this.projectRepo.softDelete(projectId);
  }

  private async applyTemplate(projectId: string, templateId: string): Promise<void> {
    const { data: template } = await this.db
      .from('templates')
      .select('structure')
      .eq('id', templateId)
      .single();

    if (!template) return;

    const pages = template.structure as Array<{
      slug: string;
      title: string;
      content: string;
      order_index: number;
      is_index?: boolean;
    }>;

    await Promise.all(
      pages.map((page) =>
        this.docPageRepo.create({
          projectId,
          slug: page.slug,
          title: page.title,
          content: page.content,
          orderIndex: page.order_index,
          isIndex: page.is_index ?? false,
        }),
      ),
    );
  }
}
