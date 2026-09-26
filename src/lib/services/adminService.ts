/**
 * services/adminService.ts — Admin action business logic
 *
 * ALL admin actions:
 * 1. Perform the action
 * 2. Write to admin_audit_log (immutable record)
 * 3. Create user notification where appropriate
 *
 * Uses the admin client (service role) — bypasses RLS.
 * Only callable from admin API routes which are gated by auth-guard.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import { UserRepository } from '@/lib/repositories/UserRepository';
import { ProjectRepository } from '@/lib/repositories/ProjectRepository';
import { ReportRepository } from '@/lib/repositories/ReportRepository';
import { AuditLogRepository } from '@/lib/repositories/AuditLogRepository';
import { NotificationRepository } from '@/lib/repositories/NotificationRepository';
import type { PlatformRole } from '@/types/database';

export class AdminService {
  private userRepo: UserRepository;
  private projectRepo: ProjectRepository;
  private reportRepo: ReportRepository;
  private auditRepo: AuditLogRepository;
  private notifRepo: NotificationRepository;

  constructor(
    // adminDb must be the service-role client (bypasses RLS)
    private readonly adminDb: SupabaseClient<Database>,
  ) {
    this.userRepo = new UserRepository(adminDb);
    this.projectRepo = new ProjectRepository(adminDb);
    this.reportRepo = new ReportRepository(adminDb);
    this.auditRepo = new AuditLogRepository(adminDb);
    this.notifRepo = new NotificationRepository(adminDb);
  }

  async changeUserRole(
    actorId: string,
    targetUserId: string,
    newRole: PlatformRole,
    reason?: string,
  ): Promise<void> {
    const user = await this.userRepo.findById(targetUserId);
    if (!user) throw Object.assign(new Error('User not found'), { code: 'NOT_FOUND' });

    const previousRole = user.platform_role;
    await this.userRepo.updateRole(targetUserId, newRole);

    await this.auditRepo.log(actorId, 'user_role_changed', 'user', targetUserId, {
      previous_role: previousRole,
      new_role: newRole,
      reason,
    });

    // Notify user of role change
    if (newRole === 'banned') {
      await this.notifRepo.create({
        user_id: targetUserId,
        type: 'account_banned',
        payload: { reason },
      });
    } else if (newRole === 'restricted') {
      await this.notifRepo.create({
        user_id: targetUserId,
        type: 'account_restricted',
        payload: { reason },
      });
    }
  }

  async banUser(actorId: string, targetUserId: string, reason?: string): Promise<void> {
    await this.changeUserRole(actorId, targetUserId, 'banned', reason);
    await this.auditRepo.log(actorId, 'user_banned', 'user', targetUserId, { reason });
  }

  async restrictUser(actorId: string, targetUserId: string, reason?: string): Promise<void> {
    await this.changeUserRole(actorId, targetUserId, 'restricted', reason);
    await this.auditRepo.log(actorId, 'user_restricted', 'user', targetUserId, { reason });
  }

  async featureProject(
    actorId: string,
    projectId: string,
    featured: boolean,
  ): Promise<void> {
    const project = await this.projectRepo.findById(projectId);
    if (!project) throw Object.assign(new Error('Project not found'), { code: 'NOT_FOUND' });

    await this.projectRepo.update(projectId, { featured });

    await this.auditRepo.log(
      actorId,
      featured ? 'project_featured' : 'project_unfeatured',
      'project',
      projectId,
      { project_name: project.name },
    );

    if (featured) {
      await this.notifRepo.create({
        user_id: project.owner_id,
        type: 'project_featured',
        payload: { project_id: projectId, project_name: project.name },
      });
    }
  }

  async resolveReport(
    actorId: string,
    reportId: string,
    status: 'resolved' | 'dismissed',
    note?: string,
  ): Promise<void> {
    const { data: report } = await this.adminDb
      .from('reports')
      .select('*')
      .eq('id', reportId)
      .single();

    if (!report) throw Object.assign(new Error('Report not found'), { code: 'NOT_FOUND' });

    await this.reportRepo.updateStatus(reportId, status);

    await this.auditRepo.log(
      actorId,
      status === 'resolved' ? 'report_resolved' : 'report_dismissed',
      'report',
      reportId,
      { note, project_id: report.project_id },
    );
  }

  async adminForceDeleteProject(actorId: string, projectId: string, reason?: string): Promise<void> {
    const project = await this.projectRepo.findById(projectId);
    if (!project) throw Object.assign(new Error('Project not found'), { code: 'NOT_FOUND' });

    await this.projectRepo.softDelete(projectId);
    await this.auditRepo.log(actorId, 'project_deleted', 'project', projectId, {
      project_name: project.name,
      owner_id: project.owner_id,
      reason,
    });
  }

  async listUsers(page: number, limit: number) {
    return this.userRepo.listAll(page, limit);
  }

  async listReports(page: number, limit: number) {
    return this.reportRepo.listPending(page, limit);
  }

  async getAuditLog(page: number, limit: number, filters?: { actorId?: string; targetType?: string }) {
    return this.auditRepo.list(page, limit, filters);
  }
}
