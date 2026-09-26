-- ============================================================
-- 002_rls_policies.sql
-- Showcrate — Row Level Security policies
--
-- Architecture:
-- • anon role   = unauthenticated visitor
-- • authenticated role = logged-in user (auth.uid() is set)
-- • service_role = server-side admin client (bypasses RLS)
--
-- RLS is the REAL security boundary. App-layer checks are defense-in-depth only.
-- Every policy here must be manually smoke-tested for:
--   1. Logged-out cross-tenant reads (should return nothing)
--   2. Logged-in cross-tenant writes (should be rejected)
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE public.users                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_redirects    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doc_pages            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.page_versions        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_collaborators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.templates            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_views        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_audit_log      ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- HELPER FUNCTIONS
-- ============================================================

-- Returns the platform_role of the currently authenticated user
CREATE OR REPLACE FUNCTION get_my_platform_role()
RETURNS platform_role AS $$
  SELECT platform_role FROM public.users WHERE id = auth.uid();
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- Returns true if the current user is a developer
CREATE OR REPLACE FUNCTION is_developer()
RETURNS BOOLEAN AS $$
  SELECT get_my_platform_role() = 'developer';
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- Returns true if the current user is a developer or moderator
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT get_my_platform_role() IN ('developer', 'moderator');
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- Returns true if current user owns the given project
CREATE OR REPLACE FUNCTION owns_project(project_uuid UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.projects
    WHERE id = project_uuid AND owner_id = auth.uid() AND deleted_at IS NULL
  );
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- Returns true if current user is an accepted collaborator on the project
CREATE OR REPLACE FUNCTION is_accepted_collaborator(project_uuid UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.project_collaborators
    WHERE project_id = project_uuid
      AND user_id = auth.uid()
      AND accepted_at IS NOT NULL
  );
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- ============================================================
-- users
-- ============================================================

-- Anyone can read basic public profile info
CREATE POLICY "users: public read"
  ON public.users FOR SELECT
  USING (TRUE);

-- Users can update only their own profile
CREATE POLICY "users: owner update"
  ON public.users FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Only the trigger (SECURITY DEFINER) inserts; block direct inserts
CREATE POLICY "users: no direct insert"
  ON public.users FOR INSERT
  WITH CHECK (FALSE);

-- ============================================================
-- projects
-- ============================================================

-- Public can read published + public projects (not soft-deleted)
CREATE POLICY "projects: public read"
  ON public.projects FOR SELECT
  USING (
    published = TRUE
    AND visibility = 'public'
    AND deleted_at IS NULL
  );

-- Authenticated user can see their own projects (any visibility, not deleted)
CREATE POLICY "projects: owner read own"
  ON public.projects FOR SELECT
  USING (owner_id = auth.uid() AND deleted_at IS NULL);

-- Collaborators can read projects they are accepted on
CREATE POLICY "projects: collaborator read"
  ON public.projects FOR SELECT
  USING (is_accepted_collaborator(id) AND deleted_at IS NULL);

-- Admins can read all projects
CREATE POLICY "projects: admin read"
  ON public.projects FOR SELECT
  USING (is_admin());

-- Owner can insert their own projects
CREATE POLICY "projects: owner insert"
  ON public.projects FOR INSERT
  WITH CHECK (owner_id = auth.uid());

-- Owner can update their own projects
CREATE POLICY "projects: owner update"
  ON public.projects FOR UPDATE
  USING (owner_id = auth.uid() AND deleted_at IS NULL)
  WITH CHECK (owner_id = auth.uid());

-- Owner can soft-delete (set deleted_at) their own projects
-- Hard deletes are handled by service role
CREATE POLICY "projects: owner soft delete"
  ON public.projects FOR UPDATE
  USING (owner_id = auth.uid());

-- Admin can update any project (feature/unfeature, force delete)
CREATE POLICY "projects: admin update"
  ON public.projects FOR UPDATE
  USING (is_admin());

-- ============================================================
-- project_redirects
-- ============================================================

-- Public can read redirects (needed for 301 handling)
CREATE POLICY "redirects: public read"
  ON public.project_redirects FOR SELECT
  USING (TRUE);

-- Only owner (via service layer) can insert redirects
CREATE POLICY "redirects: owner insert"
  ON public.project_redirects FOR INSERT
  WITH CHECK (owner_id = auth.uid());

-- ============================================================
-- doc_pages
-- ============================================================

-- Public can read pages of published + public projects
CREATE POLICY "doc_pages: public read"
  ON public.doc_pages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = doc_pages.project_id
        AND p.published = TRUE
        AND p.visibility = 'public'
        AND p.deleted_at IS NULL
    )
  );

-- Owner can read all pages of their projects
CREATE POLICY "doc_pages: owner read"
  ON public.doc_pages FOR SELECT
  USING (owns_project(project_id));

-- Accepted collaborators can read pages
CREATE POLICY "doc_pages: collaborator read"
  ON public.doc_pages FOR SELECT
  USING (is_accepted_collaborator(project_id));

-- Owner can insert, update, delete pages
CREATE POLICY "doc_pages: owner write"
  ON public.doc_pages FOR ALL
  USING (owns_project(project_id))
  WITH CHECK (owns_project(project_id));

-- ============================================================
-- page_versions
-- ============================================================

-- Owner can read version history of their projects' pages
CREATE POLICY "page_versions: owner read"
  ON public.page_versions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.doc_pages dp
      JOIN public.projects p ON p.id = dp.project_id
      WHERE dp.id = page_versions.page_id
        AND p.owner_id = auth.uid()
    )
  );

-- Collaborators can read versions for projects they collaborate on
CREATE POLICY "page_versions: collaborator read"
  ON public.page_versions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.doc_pages dp
      WHERE dp.id = page_versions.page_id
        AND is_accepted_collaborator(dp.project_id)
    )
  );

-- Owner and collaborators can insert versions (via service layer)
CREATE POLICY "page_versions: writer insert"
  ON public.page_versions FOR INSERT
  WITH CHECK (saved_by = auth.uid());

-- Admins can read any version
CREATE POLICY "page_versions: admin read"
  ON public.page_versions FOR SELECT
  USING (is_admin());

-- ============================================================
-- project_collaborators
-- ============================================================

-- Owner can manage collaborators on their projects
CREATE POLICY "collaborators: owner all"
  ON public.project_collaborators FOR ALL
  USING (owns_project(project_id))
  WITH CHECK (owns_project(project_id));

-- Collaborator can read and accept/update their own record
CREATE POLICY "collaborators: self read"
  ON public.project_collaborators FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "collaborators: self accept"
  ON public.project_collaborators FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Admins can read all
CREATE POLICY "collaborators: admin read"
  ON public.project_collaborators FOR SELECT
  USING (is_admin());

-- ============================================================
-- templates
-- ============================================================

-- Anyone can read templates
CREATE POLICY "templates: public read"
  ON public.templates FOR SELECT
  USING (TRUE);

-- Only developers can write templates
CREATE POLICY "templates: developer write"
  ON public.templates FOR ALL
  USING (is_developer())
  WITH CHECK (is_developer());

-- ============================================================
-- project_views
-- ============================================================

-- Anyone can insert a view event (rate limiting handled in app layer)
CREATE POLICY "views: public insert"
  ON public.project_views FOR INSERT
  WITH CHECK (TRUE);

-- Owner can read analytics for their projects
CREATE POLICY "views: owner read"
  ON public.project_views FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_views.project_id
        AND p.owner_id = auth.uid()
    )
  );

-- Admins can read all views
CREATE POLICY "views: admin read"
  ON public.project_views FOR SELECT
  USING (is_admin());

-- ============================================================
-- notifications
-- ============================================================

-- Users can only read and update their own notifications
CREATE POLICY "notifications: owner read"
  ON public.notifications FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "notifications: owner update (mark read)"
  ON public.notifications FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Inserts are done by service role only (no direct user insert)
CREATE POLICY "notifications: no direct insert"
  ON public.notifications FOR INSERT
  WITH CHECK (FALSE);

-- ============================================================
-- reports
-- ============================================================

-- Anyone authenticated can submit a report
CREATE POLICY "reports: authenticated insert"
  ON public.reports FOR INSERT
  WITH CHECK (reporter_id = auth.uid() AND auth.uid() IS NOT NULL);

-- Users can read their own reports
CREATE POLICY "reports: reporter read own"
  ON public.reports FOR SELECT
  USING (reporter_id = auth.uid());

-- Admins can read and update all reports
CREATE POLICY "reports: admin all"
  ON public.reports FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- ============================================================
-- admin_audit_log
-- ============================================================

-- Admins can read audit log
CREATE POLICY "audit_log: admin read"
  ON public.admin_audit_log FOR SELECT
  USING (is_admin());

-- Inserts are done by service role only (immutable log)
CREATE POLICY "audit_log: no direct insert"
  ON public.admin_audit_log FOR INSERT
  WITH CHECK (FALSE);

-- No updates or deletes on audit log (immutable)
CREATE POLICY "audit_log: no update"
  ON public.admin_audit_log FOR UPDATE
  USING (FALSE);

CREATE POLICY "audit_log: no delete"
  ON public.admin_audit_log FOR DELETE
  USING (FALSE);
