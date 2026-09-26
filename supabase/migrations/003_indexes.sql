-- ============================================================
-- 003_indexes.sql
-- Showcrate — Performance indexes
-- Run after 001_initial_schema.sql
-- ============================================================

-- ============================================================
-- users
-- ============================================================

-- Primary lookup: username → user (used on every profile page)
CREATE UNIQUE INDEX idx_users_username ON public.users (username);

-- Case-insensitive username search (signup dupe check)
CREATE UNIQUE INDEX idx_users_username_lower ON public.users (LOWER(username));

-- ============================================================
-- projects
-- ============================================================

-- Primary lookup: owner_id + slug (used on every project page)
CREATE UNIQUE INDEX idx_projects_owner_slug ON public.projects (owner_id, slug)
  WHERE deleted_at IS NULL;

-- Showcase gallery: published public projects, ordered by recency
CREATE INDEX idx_projects_showcase ON public.projects (created_at DESC)
  WHERE published = TRUE AND visibility = 'public' AND deleted_at IS NULL;

-- Featured projects (admin curated)
CREATE INDEX idx_projects_featured ON public.projects (created_at DESC)
  WHERE featured = TRUE AND published = TRUE AND deleted_at IS NULL;

-- View count leaderboard
CREATE INDEX idx_projects_view_count ON public.projects (view_count DESC)
  WHERE published = TRUE AND visibility = 'public' AND deleted_at IS NULL;

-- Soft-delete cleanup job (purge where deleted_at < NOW() - 30 days)
CREATE INDEX idx_projects_deleted_at ON public.projects (deleted_at)
  WHERE deleted_at IS NOT NULL;

-- ============================================================
-- project_redirects
-- ============================================================

-- Redirect lookup: owner_id + old_slug → new_slug
CREATE INDEX idx_redirects_owner_old_slug ON public.project_redirects (owner_id, old_slug);

-- ============================================================
-- doc_pages
-- ============================================================

-- Ordered pages within a project
CREATE INDEX idx_doc_pages_project_order ON public.doc_pages (project_id, order_index);

-- Single page lookup: project_id + slug
CREATE UNIQUE INDEX idx_doc_pages_project_slug ON public.doc_pages (project_id, slug);

-- Full-text search: GIN index on the generated tsvector column
CREATE INDEX idx_doc_pages_fts ON public.doc_pages USING GIN (content_tsv);

-- Index page lookup (the "home" page of a project)
CREATE INDEX idx_doc_pages_index ON public.doc_pages (project_id)
  WHERE is_index = TRUE;

-- ============================================================
-- page_versions
-- ============================================================

-- Version history for a page, newest first
CREATE INDEX idx_page_versions_page_created ON public.page_versions (page_id, created_at DESC);

-- ============================================================
-- project_collaborators
-- ============================================================

-- List of accepted collaborators for a project
CREATE INDEX idx_collaborators_project ON public.project_collaborators (project_id)
  WHERE accepted_at IS NOT NULL;

-- All projects a user is collaborating on
CREATE INDEX idx_collaborators_user ON public.project_collaborators (user_id)
  WHERE accepted_at IS NOT NULL;

-- Pending invites for a user
CREATE INDEX idx_collaborators_user_pending ON public.project_collaborators (user_id)
  WHERE accepted_at IS NULL;

-- ============================================================
-- project_views
-- ============================================================

-- Analytics: views per project over time
CREATE INDEX idx_views_project_time ON public.project_views (project_id, viewed_at DESC);

-- Deduplication: check if this IP+page was viewed recently
CREATE INDEX idx_views_ip_hash ON public.project_views (ip_hash, project_id, viewed_at DESC);

-- ============================================================
-- notifications
-- ============================================================

-- Unread notifications for a user (notification bell count)
CREATE INDEX idx_notifications_user_unread ON public.notifications (user_id, created_at DESC)
  WHERE read = FALSE;

-- ============================================================
-- reports
-- ============================================================

-- Admin report queue: pending reports, oldest first
CREATE INDEX idx_reports_pending ON public.reports (created_at ASC)
  WHERE status = 'pending';

-- Reports on a specific project
CREATE INDEX idx_reports_project ON public.reports (project_id);

-- ============================================================
-- admin_audit_log
-- ============================================================

-- Audit trail: most recent actions first
CREATE INDEX idx_audit_log_created ON public.admin_audit_log (created_at DESC);

-- Filter by actor
CREATE INDEX idx_audit_log_actor ON public.admin_audit_log (actor_id, created_at DESC);

-- Filter by target
CREATE INDEX idx_audit_log_target ON public.admin_audit_log (target_type, target_id, created_at DESC);
