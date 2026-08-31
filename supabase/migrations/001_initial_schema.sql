-- ============================================================
-- 001_initial_schema.sql
-- Showcrate — Core database schema
-- Run this first. Requires Supabase Auth (auth.users) to exist.
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- for ILIKE trigram indexes

-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE platform_role AS ENUM (
  'developer',
  'moderator',
  'user',
  'restricted',
  'banned'
);

CREATE TYPE project_visibility AS ENUM (
  'public',
  'private',
  'unlisted'
);

CREATE TYPE notification_type AS ENUM (
  'collab_invite',
  'collab_accepted',
  'collab_removed',
  'project_featured',
  'report_resolved',
  'account_restricted',
  'account_banned'
);

CREATE TYPE report_status AS ENUM (
  'pending',
  'reviewed',
  'resolved',
  'dismissed'
);

CREATE TYPE admin_action AS ENUM (
  'user_banned',
  'user_restricted',
  'user_role_changed',
  'project_featured',
  'project_unfeatured',
  'project_deleted',
  'report_resolved',
  'report_dismissed',
  'template_created',
  'template_deleted'
);

-- ============================================================
-- TABLES
-- ============================================================

-- users: extends auth.users with public profile data
CREATE TABLE public.users (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username      TEXT NOT NULL UNIQUE,
  display_name  TEXT,
  avatar_url    TEXT,
  bio           TEXT,
  platform_role platform_role NOT NULL DEFAULT 'user',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT username_length    CHECK (char_length(username) BETWEEN 3 AND 39),
  CONSTRAINT username_format    CHECK (username ~ '^[a-z0-9][a-z0-9-]*[a-z0-9]$'),
  CONSTRAINT username_no_double_hyphen CHECK (username NOT LIKE '%---%'),
  CONSTRAINT display_name_length CHECK (display_name IS NULL OR char_length(display_name) <= 60),
  CONSTRAINT bio_length         CHECK (bio IS NULL OR char_length(bio) <= 300)
);

-- projects
CREATE TABLE public.projects (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  slug         TEXT NOT NULL,
  name         TEXT NOT NULL,
  tagline      TEXT,
  cover_url    TEXT,
  visibility   project_visibility NOT NULL DEFAULT 'public',
  published    BOOLEAN NOT NULL DEFAULT FALSE,
  featured     BOOLEAN NOT NULL DEFAULT FALSE,
  view_count   BIGINT NOT NULL DEFAULT 0,
  deleted_at   TIMESTAMPTZ,  -- soft delete; purged 30 days after
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Slug is unique per owner (not globally)
  CONSTRAINT project_slug_per_owner UNIQUE (owner_id, slug),
  CONSTRAINT project_slug_format CHECK (slug ~ '^[a-z0-9][a-z0-9-]*[a-z0-9]$'),
  CONSTRAINT project_slug_length CHECK (char_length(slug) BETWEEN 1 AND 100),
  CONSTRAINT project_name_length CHECK (char_length(name) BETWEEN 1 AND 100),
  CONSTRAINT project_tagline_length CHECK (tagline IS NULL OR char_length(tagline) <= 200)
);

-- project_redirects: generated on rename to preserve URLs (301 redirect)
CREATE TABLE public.project_redirects (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id   UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  old_slug   TEXT NOT NULL,
  new_slug   TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT redirect_slugs_differ CHECK (old_slug <> new_slug)
);

-- doc_pages: individual documentation pages within a project
CREATE TABLE public.doc_pages (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id    UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  slug          TEXT NOT NULL,
  title         TEXT NOT NULL,
  content       TEXT NOT NULL DEFAULT '',
  order_index   INTEGER NOT NULL DEFAULT 0,
  is_index      BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Generated column for full-text search (replaces Pagefind)
  content_tsv   TSVECTOR GENERATED ALWAYS AS (
    to_tsvector('english',
      coalesce(title, '') || ' ' || coalesce(content, '')
    )
  ) STORED,

  CONSTRAINT doc_page_slug_per_project UNIQUE (project_id, slug),
  CONSTRAINT doc_page_slug_format CHECK (slug ~ '^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$'),
  CONSTRAINT doc_page_title_length CHECK (char_length(title) BETWEEN 1 AND 200)
);

-- page_versions: snapshot history for doc pages
CREATE TABLE public.page_versions (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id    UUID NOT NULL REFERENCES public.doc_pages(id) ON DELETE CASCADE,
  content    TEXT NOT NULL,
  saved_by   UUID NOT NULL REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- project_collaborators
CREATE TABLE public.project_collaborators (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id   UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  -- display_role: a label shown on the project page (e.g. "Lead Writer")
  display_role TEXT,
  visible      BOOLEAN NOT NULL DEFAULT TRUE,
  invited_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  accepted_at  TIMESTAMPTZ,

  CONSTRAINT collab_unique UNIQUE (project_id, user_id),
  CONSTRAINT display_role_length CHECK (display_role IS NULL OR char_length(display_role) <= 60)
);

-- templates: pre-built project structures
CREATE TABLE public.templates (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  description TEXT,
  category    TEXT NOT NULL DEFAULT 'general',
  -- structure: JSONB array of { slug, title, content, order_index }
  structure   JSONB NOT NULL DEFAULT '[]',
  featured    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT template_name_length CHECK (char_length(name) BETWEEN 1 AND 100)
);

-- project_views: analytics tracking (one row per view event)
CREATE TABLE public.project_views (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  page_slug  TEXT,
  -- viewer_id: NULL for anonymous visitors
  viewer_id  UUID REFERENCES public.users(id) ON DELETE SET NULL,
  -- ip_hash: SHA-256 of (ip + daily_salt) — never store raw IPs
  ip_hash    TEXT,
  referrer   TEXT,
  country    TEXT,  -- 2-letter ISO code from Netlify geo headers
  viewed_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- notifications
CREATE TABLE public.notifications (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type       notification_type NOT NULL,
  -- payload: type-specific data (e.g. { project_id, inviter_name, invite_token })
  payload    JSONB NOT NULL DEFAULT '{}',
  read       BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- reports: user-submitted content reports
CREATE TABLE public.reports (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  project_id  UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  reason      TEXT NOT NULL,
  status      report_status NOT NULL DEFAULT 'pending',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT reason_length CHECK (char_length(reason) BETWEEN 10 AND 1000)
);

-- admin_audit_log: immutable record of all admin actions
CREATE TABLE public.admin_audit_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id    UUID NOT NULL REFERENCES public.users(id) ON DELETE SET NULL,
  action      admin_action NOT NULL,
  target_type TEXT NOT NULL,  -- 'user' | 'project' | 'report' | 'template'
  target_id   UUID,
  -- metadata: additional context (e.g. previous role, reason)
  metadata    JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- AUTO-UPDATE updated_at TRIGGER
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER doc_pages_updated_at
  BEFORE UPDATE ON public.doc_pages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER templates_updated_at
  BEFORE UPDATE ON public.templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER reports_updated_at
  BEFORE UPDATE ON public.reports
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- NEW USER TRIGGER: creates public.users row on auth.users insert
-- ============================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, username, display_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'username',
    NEW.raw_user_meta_data->>'display_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
