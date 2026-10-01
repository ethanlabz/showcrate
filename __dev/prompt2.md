# Task (amendment): `/editor` workspace, nested docs tree, changeable usernames

This amends the previous routing prompt. Apply it after that prompt's phase 3 (middleware, route moves, dashboard shell). Where they conflict, THIS prompt wins. The attached Project Overview remains the source of truth except where overridden here or in the previous prompt. The editor is BlockNote, with all `@blocknote/*` packages pinned to one exact version. Do not change block schema or editor internals beyond what is specified.

## 0. Overrides to the previous prompt

- The editor route is `/editor/[projectId]/[...page]` (optional single segment `pageId`), not `/dashboard/projects/[id]/editor`. Delete `dashboard/projects/[id]/editor.astro`.
- Guarded prefixes are `/dashboard/**` AND `/editor/**`. Every rule from the previous prompt's middleware, headers (`Cache-Control: private, no-store`, `X-Robots-Tag: noindex`), robots.txt, sitemap exclusion and `404`-not-`403` behavior applies to `/editor/**`.
- `EditorLayout` is a sibling of `AppLayout` under `BaseLayout`: full viewport, no dashboard sidebar, no `MobileDock`, no animated cursor, no Lenis (native scroll only).
- Dashboard sidebar "Editor" item, the project card "Edit" action, and the public-page owner "Edit" button all link to `/editor/{projectId}`.
- Public docs route changes from `docs/*` to `docs/[slug]` (flat slug, see section 3).
- Username is **editable** (section 6). This replaces the previous "read-only username" instruction.

## 1. Database migration (one migration file, plus tests)

Adapt constraint and index names to the existing schema. Pre-launch: backfill existing rows as `kind='page'`, `parent_id=null`.

```sql
alter table doc_pages
  add column kind text not null default 'page' check (kind in ('page','folder')),
  add column parent_id uuid references doc_pages(id),
  add column deleted_at timestamptz;
alter table doc_pages alter column content drop not null;
alter table doc_pages alter column slug drop not null;
alter table doc_pages add constraint folder_no_content
  check (kind = 'page' or content is null);
alter table doc_pages add constraint page_has_slug
  check (kind = 'folder' or slug is not null);
-- replace any existing unique(project_id, slug) with:
create unique index doc_pages_slug_uq on doc_pages(project_id, slug)
  where kind = 'page' and deleted_at is null;
create unique index doc_pages_one_index_uq on doc_pages(project_id)
  where is_index and deleted_at is null;
create index doc_pages_tree_ix on doc_pages(project_id, parent_id, order_index)
  where deleted_at is null;

alter table projects add column tree_revision integer not null default 0;

alter table users add column username_changed_at timestamptz;
create unique index users_username_lower_uq on users (lower(username));
create table username_redirects (
  old_username text primary key check (old_username = lower(old_username)),
  user_id uuid not null references users(id) on delete cascade,
  created_at timestamptz not null default now()
);
```

**Rules enforced in the database/functions (not only in the UI):**
- Folders hold no content and have no URL. Pages are leaves (a page can never be a `parent_id`).
- Exactly one live index page per project, root-level; it cannot be moved into a folder or deleted.
- Max depth 5 (root children are depth 1). Max 500 live nodes per project. Title max 120 chars.
- Soft delete: `deleted_at` set on the node and all descendants with the same timestamp. A scheduled job (extend the existing pruning job) hard-deletes rows with `deleted_at` older than 30 days; `page_versions` follow via cascade.

**Functions** (`SECURITY INVOKER`, so RLS applies): `doc_tree_create`, `doc_tree_rename`, `doc_tree_move`, `doc_tree_delete`, `doc_tree_restore`. Each one:
1. Locks the project row (`select ... for update`) and verifies the caller owns it.
2. Requires `base_tree_revision = projects.tree_revision`, otherwise raises a stale-revision error (mapped to `409`).
3. Applies the change, then increments `tree_revision` and returns `{tree_revision, affected_nodes}`.

`doc_tree_move(project, node, new_parent|null, new_index, base_tree_revision)` additionally: rejects the index page; requires the target to be null or a live folder in the same project; rejects the node itself or any descendant as target (recursive CTE cycle check); rejects if the resulting subtree depth exceeds 5; compacts old-parent sibling `order_index`, inserts at `new_index` (clamped), renumbers the new-parent siblings only.

`doc_tree_create`: slug generated server-side from the title (kebab-case, `-2`, `-3` suffix on collision among live pages, never empty); new pages get empty block content and the current `schema_version`. Slugs are immutable in v1; renaming changes `title` only.

`doc_tree_restore`: restores the node and descendants sharing its `deleted_at`; parent missing or deleted means restore to root; slug collision means apply a suffix.

**RLS:** public read policy for `doc_pages` must require `deleted_at is null` and the existing published+public project condition. Owner policies unchanged. Collaborators: no access. **Search trigger:** `coalesce` null content for folders; the docs search query filters `kind='page' and deleted_at is null`.

**SQL tests** (pgTAP or the repo's existing harness) for each role (anon, other user, Collaborator, Owner, Admin): soft-deleted rows are invisible publicly; non-owners cannot call any tree function; cycle move rejected; depth 6 rejected; index page move/delete rejected; stale `base_tree_revision` rejected; slug collision gets a suffix; restore handles missing parent.

## 2. API routes (Astro, owner-only via `locals`)

Locate the existing page-save endpoint and keep its contract (`base_revision`, Zod validation against `schema.ts`, 1 MB cap, `409` on stale). Add:
- `GET /api/editor/pages/[id]`: returns `{id, title, content, revision, schema_version}` for a live page the viewer owns.
- `POST /api/editor/tree`: body is a Zod discriminated union of `create | rename | move | delete | restore`, each with `base_tree_revision`. Calls the matching function. Returns the new `tree_revision` and affected nodes. A stale revision returns `409` with the current tree.
- `GET /api/editor/trash?projectId=`: list of soft-deleted nodes (title, kind, deleted_at).

All validate ids with Zod and return identical `404` for missing and not-yours.

## 3. Public docs route

- `src/pages/[username]/[project]/docs/[slug].astro` resolves `(project_id, slug, kind='page', deleted_at is null)`. `/docs` serves the index page. Delete the old catch-all; old nested paths `404` (pre-launch).
- The docs sidebar is built from the tree query (title, slug, kind, parent_id, order_index; **never select `content` for the tree**). Folders render as collapsible groups without links; pages link to `/docs/{slug}`. Soft-deleted nodes excluded. Prev/next follow depth-first tree order.
- Moves and folder renames never change any URL; that is why URLs are flat.

## 4. Templates

Template `structure` becomes a nested tree (`children` arrays) of nodes `{kind, title, content?}`. Update the Zod schema (shared by Admin save) to enforce kind rules, depth 5, node cap 500 and block-JSON validity per page. Project creation expands the template into rows with fresh ids and server-generated slugs, inside a transaction.

## 5. Editor workspace (`/editor/[projectId]/[...page]`)

Server (frontmatter): resolve the owned project (middleware), validate the optional page segment (at most one segment; absent means the index page; invalid, deleted or folder id means `404`), then pass props to a client-only island (`client:only="react"`): `project {id, name, slug, username, published}`, `tree` (nodes, no content), `treeRevision`, `initialPage {id, title, content, revision, schema_version}`.

Layout:
- **Top bar:** back to `/dashboard`, project name, save state (saving / saved / failed), links: Versions (`/dashboard/projects/{id}/versions`), Settings (`/dashboard/projects/{id}/settings/general`), and "View public page" (`/{username}/{slug}/docs/{pageSlug}`, shown when published).
- **Left explorer** (resizable ~240–360px, collapsible): file/folder tree with `role="tree"`, `aria-expanded`, arrow-key navigation, F2 rename, Delete key. Context menu: New page, New folder, Rename, Move to…, Delete. Footer: Trash list with Restore.
- **Center:** BlockNote with the shared typography stylesheet. No right panel in v1.
- **Mobile:** the explorer opens as an offcanvas sheet via a header toggle.

Behavior:
- Drag-and-drop: `@dnd-kit/core` + `@dnd-kit/sortable`, pinned versions; custom tree projection (drag offset determines depth). Touch sensor with activation delay and tolerance. Do not use `@dnd-kit/dom`.
- **"Move to…" dialog** (folders excluding self and descendants, plus "Root") is mandatory. It is the keyboard and touch path.
- Selecting another page first flushes the pending autosave. If the save fails or returns `409`, block navigation and show the conflict flow. Never discard unsaved changes silently.
- Tree operations: on `409`, refetch the tree, tell the user the structure changed elsewhere, and roll back any optimistic update.
- Update the URL with `history.replaceState` to `/editor/{projectId}/{pageId}` when the selected page changes.

## 6. Changeable usernames

**RPC `change_username(p_user uuid, p_new text)`** (`SECURITY DEFINER`, fixed `search_path`; `REVOKE EXECUTE` from `anon` and `authenticated`, grant to `service_role` only). It runs in one transaction:
1. Lock the user row. Take `pg_advisory_xact_lock(hashtext(lower(p_new)))`.
2. Reject if `p_new` equals the current username.
3. Cooldown: allowed only if `username_changed_at is null` or at least 30 days have passed. Otherwise raise a cooldown error carrying the next allowed date.
4. Reject if `p_new` exists in `users` (case-insensitive) or in `username_redirects` owned by a different user.
5. Delete a `username_redirects` row where `old_username = p_new` and `user_id = p_user` (reclaiming an old name).
6. Insert `(old_username = current, user_id = p_user)` into `username_redirects` (`on conflict do nothing`).
7. Update `users.username = p_new`, `username_changed_at = now()`.

**API:** `POST /api/account/username` (authenticated). It validates format (3–39 chars, lowercase letters/digits/hyphens, no leading/trailing/consecutive hyphen), the reserved list and the protected-names list from the single shared module (the one source of truth, also used at signup), then calls the RPC through the server-only service client with the verified `viewer.id`. Map errors: invalid or reserved `422`, taken `409`, cooldown `429` with the date. Rate-limit it. `GET /api/account/username/available?name=` returns only `available | unavailable | invalid` (never reveal whether a name is held by a redirect), rate-limited.

**Signup and every availability check** must also reject names present in `username_redirects`.

**Resolution (single pure function with unit tests): `resolveCanonical(username, projectSlug?)` → `ok | redirect(location) | notfound`:**
1. Reserved name: `notfound`, no DB query.
2. Username found in `users`: continue.
3. Else found in `username_redirects`: the owner is that `user_id`; canonical username = current `users.username`.
4. For a project segment: if the slug is not live for that owner, check `project_redirects` (keyed by `owner_id`) for `new_slug`.
5. If anything changed, return **one** `301` to the final canonical URL (preserve the remaining path and query). Never chain redirects. Redirects store `user_id`, so repeated renames cannot create chains.
6. Redirect responses carry `Cache-Control: public, max-age=3600`, so a user who renames back does not hit permanently cached browser redirects (loop hazard). Apply the same header to project-slug redirects.

**Side effects:** call the existing public-cache invalidation helper for the old and new paths. If none exists, add a no-op `purgePublicPaths(paths)` seam, call it, and flag it in your report. Update canonical and OG tags to use the current username. Old usernames are personal data; account deletion cascades `username_redirects`.

**UI** (`/dashboard/settings/profile`): Username becomes editable with live availability (debounced) and a confirm dialog: "Your old profile and project links will keep redirecting. You can change your username again after {date}." Show the cooldown date when blocked. After success, refresh the viewer props so the sidebar "Public profile" link uses the new username.

## 7. Docs to update (same PR)

Project Overview:
- Sitemap: add `/editor/{projectId}/{pageId?}` under Authenticated; replace `docs/*` with `docs/{slug}`; remove `/{username}/{project}/docs/` editor references.
- Schema: new `doc_pages` columns, `projects.tree_revision`, `users.username_changed_at`, `username_redirects`.
- New "Docs Tree" section: folders contain pages, flat public URLs, depth and node caps, soft delete with a 30-day purge, trash and restore, index-page rules.
- Saving & Concurrency: add `tree_revision` for structural operations.
- URL & Username Rules: usernames are changeable (30-day cooldown, old names permanently held for their owner, single `301` hop, `max-age=3600`).
- Critical Rules: rule 3 gains the `/editor/**` guard; add a rule that all tree mutations go through the `doc_tree_*` functions; extend rule 12 to username redirects.
- Deferred to v2: page slug renaming, a right-hand configuration panel.

Legal.md, if present: item 3 (add `/editor/**`), item 8 (deletion cascades `username_redirects` and soft-deleted nodes), item 7 (Privacy Policy lists retained old usernames), item 15 (protected names apply on username change; note an Admin reclaim runbook is needed).

## 8. Execution order (commit per phase)

1. Migration, functions, RLS changes, SQL tests. No UI work until these pass.
2. `resolveCanonical`, middleware updates for `/editor/**`, reserved/held-name checks at signup, unit tests.
3. API routes (tree, page read, trash, username).
4. Public `docs/[slug]` route and tree-driven sidebar; template expansion.
5. `EditorLayout`, `/editor` route, explorer, drag-and-drop, Move to…, trash.
6. Username settings UI.
7. Docs updates.

## 9. Acceptance checks (run and report each)

- Non-owner and nonexistent `/editor/{id}` return identical `404`. Anonymous `/editor/{id}` redirects to login with a validated `next`.
- `/editor/**` responses carry `private, no-store` and `noindex`.
- Move into own descendant, depth 6, index-page move and stale `base_tree_revision` are all rejected by the database, not only the UI.
- Moving or renaming a folder does not change any page's public URL.
- Soft-deleted pages `404` publicly and drop out of search; restore brings them back.
- `alice → bob → alice`: `/alice/p` and `/bob/p` each resolve with at most one `301`, with no loop; a second change within 30 days returns `429`.
- Another user cannot claim a held old username, at signup or via change.
- The RPC is not callable with the anon or authenticated key.
- Autosave flush on page switch works; a forced `409` shows the conflict flow and loses no edits.
- `astro check`, lint and production build pass.

## Out of scope

Page slug renaming, a right-hand configuration panel, block-level touch reordering, version diff view, real-time editing, Admin username-reclaim UI, custom domains.

## Report back

List files changed, deviations with reasons, and anything unverified. Do not claim a check passed without running it.