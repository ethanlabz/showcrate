-- ============================================================
-- 006_editor_tree_and_username_redirects.sql
-- Migration: doc_pages tree structure, projects.tree_revision,
-- users.username_changed_at, username_redirects, and RPC functions.
-- ============================================================

-- 1. Alter doc_pages
ALTER TABLE public.doc_pages
  ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'page' CHECK (kind IN ('page', 'folder')),
  ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES public.doc_pages(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Drop NOT NULL on content and slug to support folders
ALTER TABLE public.doc_pages ALTER COLUMN content DROP NOT NULL;
ALTER TABLE public.doc_pages ALTER COLUMN slug DROP NOT NULL;

-- Invariant: folders hold no content and have no slug; pages have slug
ALTER TABLE public.doc_pages DROP CONSTRAINT IF EXISTS folder_no_content;
ALTER TABLE public.doc_pages ADD CONSTRAINT folder_no_content
  CHECK (kind = 'page' OR content IS NULL);

ALTER TABLE public.doc_pages DROP CONSTRAINT IF EXISTS page_has_slug;
ALTER TABLE public.doc_pages ADD CONSTRAINT page_has_slug
  CHECK (kind = 'folder' OR slug IS NOT NULL);

-- Enforce title length: max 120 chars
ALTER TABLE public.doc_pages DROP CONSTRAINT IF EXISTS doc_page_title_length;
ALTER TABLE public.doc_pages ADD CONSTRAINT doc_page_title_length
  CHECK (char_length(title) BETWEEN 1 AND 120);

-- Backfill pre-launch existing rows as kind='page', parent_id=null
UPDATE public.doc_pages
  SET kind = 'page', parent_id = NULL
  WHERE kind IS NULL;

-- Replace existing unique(project_id, slug)
ALTER TABLE public.doc_pages DROP CONSTRAINT IF EXISTS doc_page_slug_per_project;
DROP INDEX IF EXISTS public.idx_doc_pages_project_slug;
DROP INDEX IF EXISTS public.doc_pages_slug_uq;
CREATE UNIQUE INDEX doc_pages_slug_uq ON public.doc_pages(project_id, slug)
  WHERE kind = 'page' AND deleted_at IS NULL;

-- Exactly one live index page per project, root-level
DROP INDEX IF EXISTS public.idx_doc_pages_index;
DROP INDEX IF EXISTS public.doc_pages_one_index_uq;
CREATE UNIQUE INDEX doc_pages_one_index_uq ON public.doc_pages(project_id)
  WHERE is_index = TRUE AND deleted_at IS NULL;

-- Hierarchical tree index
DROP INDEX IF EXISTS public.idx_doc_pages_project_order;
DROP INDEX IF EXISTS public.doc_pages_tree_ix;
CREATE INDEX doc_pages_tree_ix ON public.doc_pages(project_id, parent_id, order_index)
  WHERE deleted_at IS NULL;

-- 2. Projects: add tree_revision
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS tree_revision INTEGER NOT NULL DEFAULT 0;

-- 3. Users: username_changed_at and lower username uniqueness
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS username_changed_at TIMESTAMPTZ;

DROP INDEX IF EXISTS public.users_username_lower_uq;
CREATE UNIQUE INDEX users_username_lower_uq ON public.users (lower(username));

-- 4. Username redirects table
CREATE TABLE IF NOT EXISTS public.username_redirects (
  old_username TEXT PRIMARY KEY CHECK (old_username = lower(old_username)),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.username_redirects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "username_redirects: public read" ON public.username_redirects;
CREATE POLICY "username_redirects: public read"
  ON public.username_redirects FOR SELECT
  USING (TRUE);

-- 5. RLS Updates on doc_pages
-- Public can only read live pages of published+public projects
DROP POLICY IF EXISTS "doc_pages: public read" ON public.doc_pages;
CREATE POLICY "doc_pages: public read"
  ON public.doc_pages FOR SELECT
  USING (
    kind = 'page'
    AND deleted_at IS NULL
    AND EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = doc_pages.project_id
        AND p.published = TRUE
        AND p.visibility = 'public'
        AND p.deleted_at IS NULL
    )
  );

-- Owner can read all doc_pages for their projects (including soft-deleted for trash view)
DROP POLICY IF EXISTS "doc_pages: owner read" ON public.doc_pages;
CREATE POLICY "doc_pages: owner read"
  ON public.doc_pages FOR SELECT
  USING (owns_project(project_id));

-- Collaborators: NO ACCESS per prompt 2 specification
DROP POLICY IF EXISTS "doc_pages: collaborator read" ON public.doc_pages;

-- Owner write policy remains
DROP POLICY IF EXISTS "doc_pages: owner write" ON public.doc_pages;
CREATE POLICY "doc_pages: owner write"
  ON public.doc_pages FOR ALL
  USING (owns_project(project_id))
  WITH CHECK (owns_project(project_id));

-- ============================================================
-- 6. Helper: Compute node depth
-- ============================================================
CREATE OR REPLACE FUNCTION public.doc_tree_node_depth(p_node_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_depth INTEGER := 0;
  v_current_id UUID := p_node_id;
  v_parent_id UUID;
BEGIN
  WHILE v_current_id IS NOT NULL LOOP
    SELECT parent_id INTO v_parent_id
    FROM public.doc_pages
    WHERE id = v_current_id;

    v_depth := v_depth + 1;
    v_current_id := v_parent_id;

    IF v_depth > 10 THEN -- cycle guard
      EXIT;
    END IF;
  END LOOP;
  RETURN v_depth;
END;
$$;

-- ============================================================
-- 7. Tree Functions (SECURITY INVOKER)
-- ============================================================

-- Function 1: doc_tree_create
CREATE OR REPLACE FUNCTION public.doc_tree_create(
  p_project_id UUID,
  p_parent_id UUID,
  p_kind TEXT,
  p_title TEXT,
  p_base_tree_revision INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_current_revision INTEGER;
  v_clean_title TEXT;
  v_base_slug TEXT;
  v_candidate_slug TEXT;
  v_suffix INTEGER := 2;
  v_parent_depth INTEGER := 0;
  v_target_parent RECORD;
  v_new_order INTEGER;
  v_live_count INTEGER;
  v_new_node RECORD;
  v_new_revision INTEGER;
BEGIN
  v_clean_title := trim(p_title);
  IF char_length(v_clean_title) < 1 OR char_length(v_clean_title) > 120 THEN
    RAISE EXCEPTION 'Title must be between 1 and 120 characters' USING ERRCODE = 'P0001';
  END IF;

  IF p_kind NOT IN ('page', 'folder') THEN
    RAISE EXCEPTION 'Kind must be page or folder' USING ERRCODE = 'P0001';
  END IF;

  -- 1. Lock project row and verify ownership
  SELECT tree_revision INTO v_current_revision
  FROM public.projects
  WHERE id = p_project_id
    AND owner_id = auth.uid()
    AND deleted_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Project not found or not owned' USING ERRCODE = '42501';
  END IF;

  -- 2. Verify base revision
  IF v_current_revision <> p_base_tree_revision THEN
    RAISE EXCEPTION 'Stale tree revision: expected %, got %', v_current_revision, p_base_tree_revision USING ERRCODE = 'P0009';
  END IF;

  -- Live node cap check (max 500)
  SELECT count(*) INTO v_live_count
  FROM public.doc_pages
  WHERE project_id = p_project_id AND deleted_at IS NULL;

  IF v_live_count >= 500 THEN
    RAISE EXCEPTION 'Live node limit of 500 reached for project' USING ERRCODE = 'P0002';
  END IF;

  -- Parent validation & depth check
  IF p_parent_id IS NOT NULL THEN
    SELECT * INTO v_target_parent
    FROM public.doc_pages
    WHERE id = p_parent_id AND project_id = p_project_id AND deleted_at IS NULL;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Parent folder not found' USING ERRCODE = 'P0002';
    END IF;

    IF v_target_parent.kind <> 'folder' THEN
      RAISE EXCEPTION 'Parent must be a folder' USING ERRCODE = 'P0003';
    END IF;

    v_parent_depth := public.doc_tree_node_depth(p_parent_id);
    IF v_parent_depth >= 5 THEN
      RAISE EXCEPTION 'Maximum tree depth of 5 exceeded' USING ERRCODE = 'P0004';
    END IF;
  END IF;

  -- Slug generation for pages
  IF p_kind = 'page' THEN
    v_base_slug := lower(regexp_replace(v_clean_title, '[^a-zA-Z0-9]+', '-', 'g'));
    v_base_slug := trim(both '-' from v_base_slug);
    IF v_base_slug = '' THEN
      v_base_slug := 'page';
    END IF;
    v_candidate_slug := v_base_slug;

    WHILE EXISTS (
      SELECT 1 FROM public.doc_pages
      WHERE project_id = p_project_id
        AND kind = 'page'
        AND deleted_at IS NULL
        AND slug = v_candidate_slug
    ) LOOP
      v_candidate_slug := v_base_slug || '-' || v_suffix;
      v_suffix := v_suffix + 1;
    END LOOP;
  ELSE
    v_candidate_slug := NULL;
  END IF;

  -- Compute next order_index in parent
  SELECT coalesce(max(order_index) + 1, 0) INTO v_new_order
  FROM public.doc_pages
  WHERE project_id = p_project_id
    AND parent_id IS NOT DISTINCT FROM p_parent_id
    AND deleted_at IS NULL;

  -- Insert node
  INSERT INTO public.doc_pages (
    project_id,
    parent_id,
    kind,
    title,
    slug,
    content,
    order_index,
    is_index,
    created_at,
    updated_at
  ) VALUES (
    p_project_id,
    p_parent_id,
    p_kind,
    v_clean_title,
    v_candidate_slug,
    CASE WHEN p_kind = 'page' THEN '[]' ELSE NULL END,
    v_new_order,
    FALSE,
    now(),
    now()
  )
  RETURNING * INTO v_new_node;

  -- Increment tree revision
  v_new_revision := v_current_revision + 1;
  UPDATE public.projects
  SET tree_revision = v_new_revision,
      updated_at = now()
  WHERE id = p_project_id;

  RETURN jsonb_build_object(
    'tree_revision', v_new_revision,
    'affected_nodes', jsonb_build_array(to_jsonb(v_new_node))
  );
END;
$$;

-- Function 2: doc_tree_rename
CREATE OR REPLACE FUNCTION public.doc_tree_rename(
  p_project_id UUID,
  p_node_id UUID,
  p_new_title TEXT,
  p_base_tree_revision INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_current_revision INTEGER;
  v_clean_title TEXT;
  v_updated_node RECORD;
  v_new_revision INTEGER;
BEGIN
  v_clean_title := trim(p_new_title);
  IF char_length(v_clean_title) < 1 OR char_length(v_clean_title) > 120 THEN
    RAISE EXCEPTION 'Title must be between 1 and 120 characters' USING ERRCODE = 'P0001';
  END IF;

  -- 1. Lock project row and verify ownership
  SELECT tree_revision INTO v_current_revision
  FROM public.projects
  WHERE id = p_project_id
    AND owner_id = auth.uid()
    AND deleted_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Project not found or not owned' USING ERRCODE = '42501';
  END IF;

  -- 2. Verify base revision
  IF v_current_revision <> p_base_tree_revision THEN
    RAISE EXCEPTION 'Stale tree revision: expected %, got %', v_current_revision, p_base_tree_revision USING ERRCODE = 'P0009';
  END IF;

  -- 3. Check node exists
  SELECT * FROM public.doc_pages
  WHERE id = p_node_id AND project_id = p_project_id AND deleted_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Node not found' USING ERRCODE = 'P0002';
  END IF;

  -- Renaming changes title ONLY; slug is immutable in v1
  UPDATE public.doc_pages
  SET title = v_clean_title,
      updated_at = now()
  WHERE id = p_node_id
  RETURNING * INTO v_updated_node;

  -- Increment tree revision
  v_new_revision := v_current_revision + 1;
  UPDATE public.projects
  SET tree_revision = v_new_revision,
      updated_at = now()
  WHERE id = p_project_id;

  RETURN jsonb_build_object(
    'tree_revision', v_new_revision,
    'affected_nodes', jsonb_build_array(to_jsonb(v_updated_node))
  );
END;
$$;

-- Function 3: doc_tree_move
CREATE OR REPLACE FUNCTION public.doc_tree_move(
  p_project_id UUID,
  p_node_id UUID,
  p_new_parent_id UUID,
  p_new_index INTEGER,
  p_base_tree_revision INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_current_revision INTEGER;
  v_node RECORD;
  v_target_parent RECORD;
  v_is_cycle BOOLEAN;
  v_parent_depth INTEGER := 0;
  v_subtree_depth INTEGER := 1;
  v_sibling_count INTEGER;
  v_clamped_index INTEGER;
  v_new_revision INTEGER;
BEGIN
  -- 1. Lock project row and verify ownership
  SELECT tree_revision INTO v_current_revision
  FROM public.projects
  WHERE id = p_project_id
    AND owner_id = auth.uid()
    AND deleted_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Project not found or not owned' USING ERRCODE = '42501';
  END IF;

  -- 2. Verify base revision
  IF v_current_revision <> p_base_tree_revision THEN
    RAISE EXCEPTION 'Stale tree revision: expected %, got %', v_current_revision, p_base_tree_revision USING ERRCODE = 'P0009';
  END IF;

  -- 3. Check moving node
  SELECT * INTO v_node
  FROM public.doc_pages
  WHERE id = p_node_id AND project_id = p_project_id AND deleted_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Node not found' USING ERRCODE = 'P0002';
  END IF;

  -- Index page cannot be moved into a folder
  IF v_node.is_index AND p_new_parent_id IS NOT NULL THEN
    RAISE EXCEPTION 'Index page must remain at root and cannot be moved into a folder' USING ERRCODE = 'P0003';
  END IF;

  -- 4. Check target parent
  IF p_new_parent_id IS NOT NULL THEN
    SELECT * INTO v_target_parent
    FROM public.doc_pages
    WHERE id = p_new_parent_id AND project_id = p_project_id AND deleted_at IS NULL;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Target parent folder not found' USING ERRCODE = 'P0002';
    END IF;

    IF v_target_parent.kind <> 'folder' THEN
      RAISE EXCEPTION 'Target parent must be a folder' USING ERRCODE = 'P0003';
    END IF;

    -- Cycle check
    IF p_new_parent_id = p_node_id THEN
      RAISE EXCEPTION 'Cannot move node into itself' USING ERRCODE = 'P0005';
    END IF;

    WITH RECURSIVE descendants AS (
      SELECT id FROM public.doc_pages WHERE parent_id = p_node_id AND deleted_at IS NULL
      UNION ALL
      SELECT dp.id FROM public.doc_pages dp
      JOIN descendants d ON dp.parent_id = d.id
      WHERE dp.deleted_at IS NULL
    )
    SELECT EXISTS (SELECT 1 FROM descendants WHERE id = p_new_parent_id) INTO v_is_cycle;

    IF v_is_cycle THEN
      RAISE EXCEPTION 'Cannot move node into its own descendant' USING ERRCODE = 'P0005';
    END IF;

    -- Target parent depth
    v_parent_depth := public.doc_tree_node_depth(p_new_parent_id);

    -- Subtree depth calculation
    WITH RECURSIVE subtree AS (
      SELECT id, 1 AS rel_depth
      FROM public.doc_pages
      WHERE id = p_node_id
      UNION ALL
      SELECT dp.id, s.rel_depth + 1
      FROM public.doc_pages dp
      JOIN subtree s ON dp.parent_id = s.id
      WHERE dp.deleted_at IS NULL
    )
    SELECT coalesce(max(rel_depth), 1) INTO v_subtree_depth FROM subtree;

    IF (v_parent_depth + v_subtree_depth) > 5 THEN
      RAISE EXCEPTION 'Move would exceed maximum tree depth of 5' USING ERRCODE = 'P0006';
    END IF;
  END IF;

  -- 5. Compact old parent siblings
  UPDATE public.doc_pages
  SET order_index = sub.new_order
  FROM (
    SELECT id, row_number() OVER (ORDER BY order_index, created_at) - 1 AS new_order
    FROM public.doc_pages
    WHERE project_id = p_project_id
      AND parent_id IS NOT DISTINCT FROM v_node.parent_id
      AND id <> p_node_id
      AND deleted_at IS NULL
  ) sub
  WHERE public.doc_pages.id = sub.id;

  -- Count new parent siblings (excluding moving node)
  SELECT count(*) INTO v_sibling_count
  FROM public.doc_pages
  WHERE project_id = p_project_id
    AND parent_id IS NOT DISTINCT FROM p_new_parent_id
    AND id <> p_node_id
    AND deleted_at IS NULL;

  v_clamped_index := greatest(0, least(p_new_index, v_sibling_count));

  -- Shift new parent siblings at >= v_clamped_index
  UPDATE public.doc_pages
  SET order_index = order_index + 1
  WHERE project_id = p_project_id
    AND parent_id IS NOT DISTINCT FROM p_new_parent_id
    AND id <> p_node_id
    AND order_index >= v_clamped_index
    AND deleted_at IS NULL;

  -- Update moving node
  UPDATE public.doc_pages
  SET parent_id = p_new_parent_id,
      order_index = v_clamped_index,
      updated_at = now()
  WHERE id = p_node_id;

  -- Increment tree revision
  v_new_revision := v_current_revision + 1;
  UPDATE public.projects
  SET tree_revision = v_new_revision,
      updated_at = now()
  WHERE id = p_project_id;

  RETURN jsonb_build_object(
    'tree_revision', v_new_revision,
    'affected_nodes', (
      SELECT jsonb_agg(to_jsonb(dp))
      FROM public.doc_pages dp
      WHERE dp.project_id = p_project_id
        AND dp.deleted_at IS NULL
        AND (dp.parent_id IS NOT DISTINCT FROM p_new_parent_id OR dp.parent_id IS NOT DISTINCT FROM v_node.parent_id)
    )
  );
END;
$$;

-- Function 4: doc_tree_delete
CREATE OR REPLACE FUNCTION public.doc_tree_delete(
  p_project_id UUID,
  p_node_id UUID,
  p_base_tree_revision INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_current_revision INTEGER;
  v_node RECORD;
  v_now TIMESTAMPTZ := now();
  v_new_revision INTEGER;
  v_affected JSONB;
BEGIN
  -- 1. Lock project row and verify ownership
  SELECT tree_revision INTO v_current_revision
  FROM public.projects
  WHERE id = p_project_id
    AND owner_id = auth.uid()
    AND deleted_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Project not found or not owned' USING ERRCODE = '42501';
  END IF;

  -- 2. Verify base revision
  IF v_current_revision <> p_base_tree_revision THEN
    RAISE EXCEPTION 'Stale tree revision: expected %, got %', v_current_revision, p_base_tree_revision USING ERRCODE = 'P0009';
  END IF;

  -- 3. Check node
  SELECT * INTO v_node
  FROM public.doc_pages
  WHERE id = p_node_id AND project_id = p_project_id AND deleted_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Node not found' USING ERRCODE = 'P0002';
  END IF;

  -- Index page cannot be deleted
  IF v_node.is_index THEN
    RAISE EXCEPTION 'Index page cannot be deleted' USING ERRCODE = 'P0003';
  END IF;

  -- Soft delete node and all descendants with the exact same timestamp
  WITH RECURSIVE tree_to_delete AS (
    SELECT id FROM public.doc_pages WHERE id = p_node_id
    UNION ALL
    SELECT dp.id FROM public.doc_pages dp
    JOIN tree_to_delete t ON dp.parent_id = t.id
    WHERE dp.deleted_at IS NULL
  )
  UPDATE public.doc_pages
  SET deleted_at = v_now,
      updated_at = v_now
  WHERE id IN (SELECT id FROM tree_to_delete);

  -- Compact siblings of old parent
  UPDATE public.doc_pages
  SET order_index = sub.new_order
  FROM (
    SELECT id, row_number() OVER (ORDER BY order_index, created_at) - 1 AS new_order
    FROM public.doc_pages
    WHERE project_id = p_project_id
      AND parent_id IS NOT DISTINCT FROM v_node.parent_id
      AND deleted_at IS NULL
  ) sub
  WHERE public.doc_pages.id = sub.id;

  -- Increment tree revision
  v_new_revision := v_current_revision + 1;
  UPDATE public.projects
  SET tree_revision = v_new_revision,
      updated_at = now()
  WHERE id = p_project_id;

  RETURN jsonb_build_object(
    'tree_revision', v_new_revision,
    'deleted_at', v_now
  );
END;
$$;

-- Function 5: doc_tree_restore
CREATE OR REPLACE FUNCTION public.doc_tree_restore(
  p_project_id UUID,
  p_node_id UUID,
  p_base_tree_revision INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_current_revision INTEGER;
  v_node RECORD;
  v_restore_timestamp TIMESTAMPTZ;
  v_restore_parent_id UUID;
  v_parent_check RECORD;
  v_base_slug TEXT;
  v_candidate_slug TEXT;
  v_suffix INTEGER;
  v_new_order INTEGER;
  v_new_revision INTEGER;
  v_rec RECORD;
BEGIN
  -- 1. Lock project row and verify ownership
  SELECT tree_revision INTO v_current_revision
  FROM public.projects
  WHERE id = p_project_id
    AND owner_id = auth.uid()
    AND deleted_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Project not found or not owned' USING ERRCODE = '42501';
  END IF;

  -- 2. Verify base revision
  IF v_current_revision <> p_base_tree_revision THEN
    RAISE EXCEPTION 'Stale tree revision: expected %, got %', v_current_revision, p_base_tree_revision USING ERRCODE = 'P0009';
  END IF;

  -- 3. Check deleted node
  SELECT * INTO v_node
  FROM public.doc_pages
  WHERE id = p_node_id AND project_id = p_project_id AND deleted_at IS NOT NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Deleted node not found' USING ERRCODE = 'P0002';
  END IF;

  v_restore_timestamp := v_node.deleted_at;

  -- Check if parent is missing or deleted -> restore to root
  v_restore_parent_id := v_node.parent_id;
  IF v_restore_parent_id IS NOT NULL THEN
    SELECT * INTO v_parent_check
    FROM public.doc_pages
    WHERE id = v_restore_parent_id AND project_id = p_project_id AND deleted_at IS NULL AND kind = 'folder';

    IF NOT FOUND THEN
      v_restore_parent_id := NULL; -- Restore to root
    END IF;
  END IF;

  -- Append order index at target parent
  SELECT coalesce(max(order_index) + 1, 0) INTO v_new_order
  FROM public.doc_pages
  WHERE project_id = p_project_id
    AND parent_id IS NOT DISTINCT FROM v_restore_parent_id
    AND deleted_at IS NULL;

  -- Check slug collision on main restored node if page
  IF v_node.kind = 'page' THEN
    v_base_slug := v_node.slug;
    v_candidate_slug := v_base_slug;
    v_suffix := 2;
    WHILE EXISTS (
      SELECT 1 FROM public.doc_pages
      WHERE project_id = p_project_id
        AND kind = 'page'
        AND deleted_at IS NULL
        AND slug = v_candidate_slug
    ) LOOP
      v_candidate_slug := v_base_slug || '-' || v_suffix;
      v_suffix := v_suffix + 1;
    END LOOP;
  ELSE
    v_candidate_slug := NULL;
  END IF;

  -- Restore root node of deleted subtree
  UPDATE public.doc_pages
  SET parent_id = v_restore_parent_id,
      order_index = v_new_order,
      slug = v_candidate_slug,
      deleted_at = NULL,
      updated_at = now()
  WHERE id = p_node_id;

  -- Restore descendants that shared this deletion timestamp
  FOR v_rec IN (
    SELECT id, slug, kind
    FROM public.doc_pages
    WHERE project_id = p_project_id
      AND deleted_at = v_restore_timestamp
      AND id <> p_node_id
  ) LOOP
    IF v_rec.kind = 'page' THEN
      v_base_slug := v_rec.slug;
      v_candidate_slug := v_base_slug;
      v_suffix := 2;
      WHILE EXISTS (
        SELECT 1 FROM public.doc_pages
        WHERE project_id = p_project_id
          AND kind = 'page'
          AND deleted_at IS NULL
          AND slug = v_candidate_slug
      ) LOOP
        v_candidate_slug := v_base_slug || '-' || v_suffix;
        v_suffix := v_suffix + 1;
      END LOOP;
    ELSE
      v_candidate_slug := NULL;
    END IF;

    UPDATE public.doc_pages
    SET slug = v_candidate_slug,
        deleted_at = NULL,
        updated_at = now()
    WHERE id = v_rec.id;
  END LOOP;

  -- Increment tree revision
  v_new_revision := v_current_revision + 1;
  UPDATE public.projects
  SET tree_revision = v_new_revision,
      updated_at = now()
  WHERE id = p_project_id;

  RETURN jsonb_build_object(
    'tree_revision', v_new_revision,
    'restored_node_id', p_node_id
  );
END;
$$;

-- ============================================================
-- 8. Change Username RPC (SECURITY DEFINER, service_role only)
-- ============================================================
CREATE OR REPLACE FUNCTION public.change_username(
  p_user UUID,
  p_new TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_current_user RECORD;
  v_lower_new TEXT;
  v_next_allowed TIMESTAMPTZ;
BEGIN
  v_lower_new := lower(trim(p_new));

  -- 1. Lock user row
  SELECT * INTO v_current_user
  FROM public.users
  WHERE id = p_user
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found' USING ERRCODE = 'P0002';
  END IF;

  -- 2. Take advisory transaction lock on new username
  PERFORM pg_advisory_xact_lock(hashtext(v_lower_new));

  -- 3. Reject if new username equals current username
  IF lower(v_current_user.username) = v_lower_new THEN
    RAISE EXCEPTION 'New username is the same as current username' USING ERRCODE = 'P0007';
  END IF;

  -- 4. Cooldown check: allowed if username_changed_at is null or >= 30 days
  IF v_current_user.username_changed_at IS NOT NULL AND
     v_current_user.username_changed_at > (now() - INTERVAL '30 days') THEN
    v_next_allowed := v_current_user.username_changed_at + INTERVAL '30 days';
    RAISE EXCEPTION 'Username change cooldown active until %', v_next_allowed USING ERRCODE = 'P0008';
  END IF;

  -- 5. Reject if new username exists in users (case-insensitive)
  IF EXISTS (SELECT 1 FROM public.users WHERE lower(username) = v_lower_new AND id <> p_user) THEN
    RAISE EXCEPTION 'Username already taken' USING ERRCODE = 'P0009';
  END IF;

  -- 6. Reject if new username exists in username_redirects owned by a different user
  IF EXISTS (SELECT 1 FROM public.username_redirects WHERE old_username = v_lower_new AND user_id <> p_user) THEN
    RAISE EXCEPTION 'Username is held by another user redirect' USING ERRCODE = 'P0009';
  END IF;

  -- 7. Delete redirect row if user is reclaiming their old username
  DELETE FROM public.username_redirects
  WHERE old_username = v_lower_new AND user_id = p_user;

  -- 8. Insert current username into username_redirects
  INSERT INTO public.username_redirects (old_username, user_id, created_at)
  VALUES (lower(v_current_user.username), p_user, now())
  ON CONFLICT (old_username) DO NOTHING;

  -- 9. Update user record
  UPDATE public.users
  SET username = p_new,
      username_changed_at = now(),
      updated_at = now()
  WHERE id = p_user;
END;
$$;

-- Revoke from public, anon, and authenticated; grant only to service_role
REVOKE EXECUTE ON FUNCTION public.change_username(UUID, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.change_username(UUID, TEXT) TO service_role;
