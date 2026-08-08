/**
 * services/collaboratorService.ts — Collaboration business logic
 *
 * Enforces:
 * - Collaborator limit per plan (5 for free)
 * - Owner can't invite themselves
 * - Invite via email → look up user → create record + send email + notification
 */
import { customAlphabet } from 'nanoid';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, ProjectCollaboratorRow } from '@/types/database';
import { CollaboratorRepository } from '@/lib/repositories/CollaboratorRepository';
import { NotificationRepository } from '@/lib/repositories/NotificationRepository';
import { ProjectRepository } from '@/lib/repositories/ProjectRepository';
import { UserRepository } from '@/lib/repositories/UserRepository';
import { sendCollaboratorInviteEmail } from './emailService';
import { getPlanLimits } from '@/types/auth';
import type { PlatformRole } from '@/types/database';
import type { InviteCollaboratorInput, UpdateCollaboratorInput } from '@/lib/validators/collaborator.schema';

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

  async invite(
    projectId: string,
    inviterId: string,
    inviterRole: PlatformRole,
    ownerUsername: string,
    input: InviteCollaboratorInput,
  ): Promise<ProjectCollaboratorRow> {
    const project = await this.projectRepo.findById(projectId);
    if (!project || project.owner_id !== inviterId) {
      throw Object.assign(new Error('Only the project owner can invite collaborators'), {
        code: 'FORBIDDEN',
      });
    }

    // Enforce collaborator plan limit
    const limits = getPlanLimits(inviterRole);
    if (limits.maxCollaborators !== Infinity) {
      const count = await this.collabRepo.countAcceptedByProject(projectId);
      if (count >= limits.maxCollaborators) {
        throw Object.assign(
          new Error(`You've reached the collaborator limit of ${limits.maxCollaborators} on your plan`),
          { code: 'PLAN_LIMIT_EXCEEDED' },
        );
      }
    }

    // Find the invitee by email
    const { data: authUser } = await (this.db as any).auth.admin.listUsers();
    // Note: In production, use admin client for this lookup
    // For now, query public.users is not possible by email directly (it stores no email)
    // The invite flow uses email → Supabase Auth lookup → user_id
    // This is handled by the admin client in the API route layer
    throw new Error('Use the API route invite endpoint which has access to the admin client');
  }

  /**
   * Full invite flow — called from API route with admin client available
   */
  async inviteByUserId(
    projectId: string,
    inviterId: string,
    inviterRole: PlatformRole,
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

    // Check if already invited
    const existing = await this.collabRepo.findByProjectAndUser(projectId, inviteeUserId);
    if (existing) {
      throw Object.assign(new Error('This user is already a collaborator or has a pending invite'), {
        code: 'ALREADY_INVITED',
      });
    }

    // Enforce plan limit
    const limits = getPlanLimits(inviterRole);
    if (limits.maxCollaborators !== Infinity) {
      const count = await this.collabRepo.countAcceptedByProject(projectId);
      if (count >= limits.maxCollaborators) {
        throw Object.assign(
          new Error(`Collaborator limit of ${limits.maxCollaborators} reached`),
          { code: 'PLAN_LIMIT_EXCEEDED' },
        );
      }
    }

    // Create the collaborator record
    const collaborator = await this.collabRepo.invite(
      projectId,
      inviteeUserId,
      input.displayRole,
    );

    // Generate invite token and store in notification payload
    const inviteToken = generateToken();

    // Create notification for invitee
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

    // Send invite email (non-blocking)
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

    // Notify project owner
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

  async removeCollaborator(
    collaboratorId: string,
    removerId: string,
  ): Promise<void> {
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

    // Notify removed collaborator
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
}
