/**
 * types/database.ts — Supabase database types
 *
 * This file is hand-maintained and mirrors the schema in 001_initial_schema.sql.
 * After deploying migrations, regenerate with:
 *   npx supabase gen types typescript --project-id YOUR_PROJECT_REF > src/types/database.ts
 * Then merge any manual augmentations back in.
 */

export type PlatformRole = 'developer' | 'admin' | 'pro' | 'user' | 'restricted' | 'banned';
export type ProjectVisibility = 'public' | 'private' | 'unlisted';
export type NotificationType =
  | 'collab_invite'
  | 'collab_accepted'
  | 'collab_removed'
  | 'project_featured'
  | 'report_resolved'
  | 'account_restricted'
  | 'account_banned';
export type ReportStatus = 'pending' | 'reviewed' | 'resolved' | 'dismissed';
export type AdminAction =
  | 'user_banned'
  | 'user_restricted'
  | 'user_role_changed'
  | 'project_featured'
  | 'project_unfeatured'
  | 'project_deleted'
  | 'report_resolved'
  | 'report_dismissed'
  | 'template_created'
  | 'template_deleted';

// ── Row types (what comes back from SELECT) ─────────────────────────────────

export interface UserRow {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  platform_role: PlatformRole;
  created_at: string;
  updated_at: string;
}

export interface ProjectRow {
  id: string;
  owner_id: string;
  slug: string;
  name: string;
  tagline: string | null;
  cover_url: string | null;
  visibility: ProjectVisibility;
  password_hash: string | null;
  published: boolean;
  featured: boolean;
  view_count: number;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectRedirectRow {
  id: string;
  owner_id: string;
  old_slug: string;
  new_slug: string;
  created_at: string;
}

export interface DocPageRow {
  id: string;
  project_id: string;
  slug: string;
  title: string;
  content: string;
  order_index: number;
  is_index: boolean;
  // content_tsv is generated — never write to it
  created_at: string;
  updated_at: string;
}

export interface PageVersionRow {
  id: string;
  page_id: string;
  content: string;
  saved_by: string;
  created_at: string;
}

export interface ProjectCollaboratorRow {
  id: string;
  project_id: string;
  user_id: string;
  display_role: string | null;
  visible: boolean;
  invited_at: string;
  accepted_at: string | null;
}

export interface TemplateRow {
  id: string;
  name: string;
  description: string | null;
  category: string;
  structure: TemplatePageStructure[];
  featured: boolean;
  created_at: string;
  updated_at: string;
}

export interface TemplatePageStructure {
  slug: string;
  title: string;
  content: string;
  order_index: number;
  is_index?: boolean;
}

export interface ProjectViewRow {
  id: string;
  project_id: string;
  page_slug: string | null;
  viewer_id: string | null;
  ip_hash: string | null;
  referrer: string | null;
  country: string | null;
  viewed_at: string;
}

export interface NotificationRow {
  id: string;
  user_id: string;
  type: NotificationType;
  payload: Record<string, unknown>;
  read: boolean;
  created_at: string;
}

export interface ReportRow {
  id: string;
  reporter_id: string;
  project_id: string;
  reason: string;
  status: ReportStatus;
  created_at: string;
  updated_at: string;
}

export interface AdminAuditLogRow {
  id: string;
  actor_id: string;
  action: AdminAction;
  target_type: string;
  target_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

// ── Insert types (what you send on INSERT) ──────────────────────────────────

export type UserInsert = Pick<UserRow, 'id' | 'username'> &
  Partial<Pick<UserRow, 'display_name' | 'avatar_url' | 'bio' | 'platform_role'>>;

export type ProjectInsert = Omit<ProjectRow, 'id' | 'view_count' | 'created_at' | 'updated_at' | 'deleted_at'>;

export type DocPageInsert = Omit<DocPageRow, 'id' | 'created_at' | 'updated_at'>;

export type PageVersionInsert = Omit<PageVersionRow, 'id' | 'created_at'>;

export type CollaboratorInsert = Omit<ProjectCollaboratorRow, 'id' | 'invited_at' | 'accepted_at'>;

export type NotificationInsert = Omit<NotificationRow, 'id' | 'read' | 'created_at'>;

export type ReportInsert = Omit<ReportRow, 'id' | 'status' | 'created_at' | 'updated_at'>;

export type AuditLogInsert = Omit<AdminAuditLogRow, 'id' | 'created_at'>;

export type Database = any;

