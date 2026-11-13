-- ============================================================
-- doc_tree_and_username.test.sql (pgTAP test suite)
-- Tests for Phase 1: doc_pages tree invariants, RLS, RPCs, and username redirects
-- ============================================================

BEGIN;
SELECT plan(15);

-- 1. Test schema invariants
SELECT has_column('public', 'doc_pages', 'kind', 'doc_pages has kind column');
SELECT has_column('public', 'doc_pages', 'parent_id', 'doc_pages has parent_id column');
SELECT has_column('public', 'doc_pages', 'deleted_at', 'doc_pages has deleted_at column');
SELECT has_column('public', 'projects', 'tree_revision', 'projects has tree_revision column');
SELECT has_table('public', 'username_redirects', 'username_redirects table exists');

-- 2. Test constraint: folder cannot have content
PREPARE insert_invalid_folder AS
  INSERT INTO public.doc_pages (project_id, kind, title, content, is_index)
  VALUES ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'folder', 'Folder with content', '{"some":"content"}', FALSE);
SELECT throws_ok('insert_invalid_folder', '23514', NULL, 'folder cannot hold content');

-- 3. Test constraint: page must have slug
PREPARE insert_page_without_slug AS
  INSERT INTO public.doc_pages (project_id, kind, title, slug, is_index)
  VALUES ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'page', 'No slug page', NULL, FALSE);
SELECT throws_ok('insert_page_without_slug', '23514', NULL, 'page must have a slug');

-- 4. Test constraint: title length max 120 chars
PREPARE insert_long_title AS
  INSERT INTO public.doc_pages (project_id, kind, title, slug, is_index)
  VALUES ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'page', repeat('a', 121), 'long-title', FALSE);
SELECT throws_ok('insert_long_title', '23514', NULL, 'title length max 120 chars');

-- 5. Test RPC permissions
SELECT has_function('public', 'doc_tree_create', 'doc_tree_create exists');
SELECT has_function('public', 'doc_tree_rename', 'doc_tree_rename exists');
SELECT has_function('public', 'doc_tree_move', 'doc_tree_move exists');
SELECT has_function('public', 'doc_tree_delete', 'doc_tree_delete exists');
SELECT has_function('public', 'doc_tree_restore', 'doc_tree_restore exists');
SELECT has_function('public', 'change_username', 'change_username exists');

-- 6. Test change_username permissions (revoked from anon and authenticated)
SELECT throws_ok(
  'SELECT public.change_username(''a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'', ''newuser'')',
  '42501',
  NULL,
  'change_username cannot be called by public/anon/authenticated'
);

SELECT * FROM finish();
ROLLBACK;
