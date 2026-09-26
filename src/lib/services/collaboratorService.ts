/**
 * services/collaboratorService.ts — Collaboration business logic
 *
 * Enforces:
 * - Only the project owner can invite / remove collaborators
 * - Owner can't invite themselves
 * - Invite via userId → create record + send email + notification
 * - Collaborators are attribution-only: zero write access, zero settings access
 * - Accepted collaborations are shown on the collaborator's profile page
 */
import { customAlphabet } from 'nanoid';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, ProjectCollaboratorRow, ProjectRow } from '@/types/database';
import { CollaboratorRepository } from '@/lib/repositories/CollaboratorRepository';
import { NotificationRepository } from '@/lib/repositories/NotificationRepository';
import { ProjectRepository } from '@/lib/repositories/ProjectRepository';
import { UserRepository } from '@/lib/repositories/UserRepository';
import { sendCollaboratorInviteEmail } from './emailService';
import type { InviteCollaboratorInput } from '@/lib/validators/collaborator.schema';

// Secure invite token: 32 character alphanumeric
const generateToken = customAlphabet('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789', 32);

export class CollaboratorService {
  private collabRepo: CollaboratorRepository;
  private notifRepo: NotificationRepository;
  private projectRepo: ProjectRepository;
  private userRepo: UserRepository;

  constructor(private readonly db: SupabaseClient<Database>) {
    this.collabRepo = new CollaboratorRepository(db);
    this.notifRepo = new NotificationRepository(db);
    this.projectRepo = new ProjectRepository(db);
    this.userRepo = new UserRepository(db);
  }

  /**
   * Full invite flow — called from API route with admin client available
   * so that email → userId lookup is possible.
   */
  async inviteByUserId(
    projectId: string,
    inviterId: string,
    inviteeUserId: string,
    inviteeEmail: string,
    inviterDisplayName: string,
    ownerUsername: string,
    input: InviteCollaboratorInput,
  ): Promise<ProjectCollaboratorRow> {
    const project = await this.projectRepo.findById(projectId);
    if (!project || project.owner_id !== inviterId) {
      throw Object.assign(new Error('Only the project owner can invite collaborators'), {
        code: 'FORBIDDEN',
      });
    }

    // Can't invite yourself
    if (inviteeUserId === inviterId) {
      throw Object.assign(new Error('You cannot invite yourself'), { code: 'SELF_INVITE' });
    }

    // Check if already invited/accepted
    const existing = await this.collabRepo.findByProjectAndUser(projectId, inviteeUserId);
    if (existing) {
      throw Object.assign(new Error('This user is already a collaborator or has a pending invite'), {
        code: 'ALREADY_INVITED',
      });
    }

    // Create the collaborator record (pending until accepted)
    const collaborator = await this.collabRepo.invite(
      projectId,
      inviteeUserId,
      input.displayRole,
    );

    // Generate invite token and store in notification payload
    const inviteToken = generateToken();

    // Notify invitee
    await this.notifRepo.create({
      user_id: inviteeUserId,
      type: 'collab_invite',
      payload: {
        project_id: projectId,
        project_name: project.name,
        project_slug: project.slug,
        owner_username: ownerUsername,
        inviter_name: inviterDisplayName,
        collaborator_id: collaborator.id,
        invite_token: inviteToken,
      },
    });

    // Send invite email (non-blocking — we don't care if it fails)
    sendCollaboratorInviteEmail({
      to: inviteeEmail,
      inviterName: inviterDisplayName,
      projectName: project.name,
      projectOwnerUsername: ownerUsername,
      projectSlug: project.slug,
      inviteToken,
    }).catch(() => {});

    return collaborator;
  }

  async acceptInvite(collaboratorId: string, userId: string): Promise<void> {
    const { data: collab } = await this.db
      .from('project_collaborators')
      .select('*')
      .eq('id', collaboratorId)
      .eq('user_id', userId)
      .single();

    if (!collab) {
      throw Object.assign(new Error('Invite not found'), { code: 'NOT_FOUND' });
    }

    if (collab.accepted_at) {
      throw Object.assign(new Error('Invite already accepted'), { code: 'ALREADY_ACCEPTED' });
    }

    await this.collabRepo.accept(collaboratorId);

    // Notify the project owner
    const project = await this.projectRepo.findById(collab.project_id);
    if (project) {
      const user = await this.userRepo.findById(userId);
      await this.notifRepo.create({
        user_id: project.owner_id,
        type: 'collab_accepted',
        payload: {
          project_id: collab.project_id,
          project_name: project.name,
          collaborator_id: userId,
          collaborator_username: user?.username ?? 'Unknown',
        },
      }).catch(() => {});
    }
  }

  async removeCollaborator(collaboratorId: string, removerId: string): Promise<void> {
    const { data: collab } = await this.db
      .from('project_collaborators')
      .select('*')
      .eq('id', collaboratorId)
      .single();

    if (!collab) {
      throw Object.assign(new Error('Collaborator not found'), { code: 'NOT_FOUND' });
    }

    // Only the project owner can remove collaborators
    const project = await this.projectRepo.findById(collab.project_id);
    if (!project || project.owner_id !== removerId) {
      throw Object.assign(new Error('Only the project owner can remove collaborators'), {
        code: 'FORBIDDEN',
      });
    }

    await this.collabRepo.remove(collaboratorId);

    // Notify the removed collaborator
    await this.notifRepo.create({
      user_id: collab.user_id,
      type: 'collab_removed',
      payload: {
        project_id: collab.project_id,
        project_name: project.name,
      },
    }).catch(() => {});
  }

  async listCollaborators(projectId: string): Promise<ProjectCollaboratorRow[]> {
    return this.collabRepo.findByProject(projectId);
  }

  /**
   * Returns all projects a user is credited on as an accepted collaborator.
   * Used to populate the "Shared Projects" section of a user's profile page.
   * Only returns visible=true collaborations on public, published projects.
   */
  async listSharedProjects(userId: string): Promise<ProjectRow[]> {
    const { data } = await this.db
      .from('project_collaborators')
      .select('project_id, projects!inner(id, owner_id, slug, name, tagline, cover_url, visibility, published, featured, view_count, deleted_at, created_at, updated_at)')
      .eq('user_id', userId)
      .not('accepted_at', 'is', null)
      .eq('visible', true)
      .eq('projects.published', true)
      .eq('projects.visibility', 'public')
      .is('projects.deleted_at', null);

    if (!data) return [];

    return data.map((row: any) => row.projects as ProjectRow);
  }
}
