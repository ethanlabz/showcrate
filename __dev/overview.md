## Product Overview
 
**Showcrate** lets anyone sign up, create a project, write documentation in a Notion-style block editor, credit collaborators, and publish to a public showcase. Authors edit and rearrange blocks directly; there is no markup to write. Visitors can browse, search, and read — no account needed. Every save is live — there is no build step between writing and publishing.
 
**Tagline:** Every project deserves a stage.
**Domain:** showcrate.io
**URL pattern:** showcrate.example.com/{username}/{project}/{page}
 
---
 
## Tech Stack
 
| Layer | Tool |
|---|---|
| Framework | Astro 4+ (SSR mode) |
| UI | React islands + TypeScript |
| Styling | Tailwind CSS |
| UI Components | shadcn/ui + Base UI + Headless UI |
| Animations | Framer Motion + Lenis SmoothScroll |
| Animated Components | Animate-UI + ReactBits |
| Icons | Lucide + SimpleIcons |
| Editor | BlockNote (`@blocknote/core`, `@blocknote/react`, `@blocknote/shadcn`) — block-based editor, hydrated client-only, all packages pinned to one exact version |
| Document Format | BlockNote block JSON, stored as `JSONB` in `doc_pages.content` |
| Block Renderer | First-party Astro components over stored block JSON — rendered at request time, no build step |
| Code Highlighting | Shiki — server-side at render |
| Content Safety | Zod validates block JSON against the shared block schema at save; the renderer escapes all text, allowlists URLs, and maps styling props to fixed classes at render |
| Search (Showcase) | Fuse.js — client-side fuzzy search over showcase cards |
| Search (Docs) | Postgres full-text search — `tsvector` column + GIN index on `doc_pages`, fed by text extracted from block JSON |
| Auth | Supabase Auth (Email + GitHub + Google OAuth) |
| Database | Supabase Postgres + RLS |
| Storage | Supabase Storage (avatars, covers, page images) |
| Email | Resend (welcome, invites, password reset) |
| Validation | Zod |
| ID Generation | nanoid |
| OG Images | astro-og-canvas |
| Sitemap | @astrojs/sitemap |
| Hosting | Netlify (SSR + serverless functions) — single deployment target |
| DnD | @dnd-kit/core + @dnd-kit/sortable, pinned — page tree reorder only; `@dnd-kit/dom` is not used. Block reordering uses BlockNote's built-in drag handle |
 
---
 
## Platform Roles (3)
 
| Role | Description |
|---|---|
| Developer | Full system control, including infrastructure and deployment. 2 people. |
| Admin | Full `/admin/**` access — user management, project moderation, reports, template curation, showcase curation, audit log. ~4–5 trusted people. |
| User | Standard registered account. Default role for all sign-ups. Can create and own projects. |
 
## Project Roles (2)
 
| Role | Description |
|---|---|
| Owner | Full control over the project — content, settings, visibility, collaborators, version restore, deletion. One owner per project. Only the Owner can perform any action on a project. |
| Collaborator | Attribution-only. Zero permissions — cannot edit content, change settings, or take any action. Name is credited on the project. |
 
---
 
## Full Sitemap
 
### Public 🟢
```
/                          Landing page (storytelling, Lenis scroll)
/showcase                  Public discovery gallery
/templates                 Template browser
/about                     About page
/help                      Help center (placeholder v1)
/terms                     Terms of service
/privacy                   Privacy policy
/auth/login                Login
/auth/logout               Logout (POST)
/auth/signup               Registration
/auth/forgot-password      Password reset request
/auth/reset-password       Password reset form
/{username}                Public user profile
/{username}/{project}      Public project overview page
/{username}/{project}/docs/{slug} Documentation pages (flat URL)
```

### Authenticated 🔵
```
/dashboard                                    Dashboard homepage (Your projects + Credited on)
/dashboard/new                                Project creation wizard
/dashboard/notifications                      Notification center
/dashboard/settings/profile                   Profile settings (Name, editable Username with 30-day cooldown, read-only Email)
/dashboard/settings/account                   Password, authentication & session info
/dashboard/settings/notifications             Notification preferences
/dashboard/settings/appearance                Theme & appearance
/dashboard/settings/danger                    Account deletion & danger zone
/editor/[projectId]/[pageId?]                 Block editor workspace (standalone layout, dnd explorer, native scroll)
/dashboard/projects/[id]/versions             Page version history & snapshots
/dashboard/projects/[id]/settings/general     Project details & metadata
/dashboard/projects/[id]/settings/visibility  Publication & audience access
/dashboard/projects/[id]/settings/collaborators Invite & manage collaborators
/dashboard/projects/[id]/settings/seo         Meta title & social preview card
/dashboard/projects/[id]/settings/danger      Delete project
```

### Admin 🟣
```
/admin                     Overview stats
/admin/users               User management
/admin/projects            All projects across platform
/admin/templates           Template management
/admin/showcase            Featured project curation
/admin/reports             Reported content queue
/admin/settings            Platform-wide config
/admin/logs                Audit trail
```

---

## Routing Model

Showcrate enforces a deterministic, dual-state routing model:

1. **Unauthenticated user flow:**
   - Lands on `/` (landing page).
   - Clicks the primary CTA "Open dashboard" (plain anchor, `href="/dashboard"`).
   - Middleware responds `302` to `/auth/login?next=%2Fdashboard` (sanitized and capped at 200 characters).
   - After authentication or OAuth callback, the user is redirected to the validated `next` destination (defaulting to `/dashboard`).
2. **Authenticated user flow:**
   - Lands on `/`. Never redirected automatically.
   - Clicks the exact same CTA, which goes to `/dashboard` and renders directly.
3. **Public vs Dashboard boundary:**
   - `index.astro` contains only the static landing page.
   - `/{username}/{project}/**` are public, shareable, read-only pages.
   - All owner management and editing surfaces live strictly under `/dashboard/**`. Dashboard project routes use the immutable project `id` (UUID), NOT the slug. Slug renames do not break dashboard URLs. Legacy route files are removed without redirects.

 
---
 
## Editor
 
The editor is a Notion-style block editor. A page is an ordered, nestable list of blocks.
 
- **Authoring:** slash menu for inserting blocks, a side menu on each block with an add button and a drag handle, a formatting toolbar on selection, and Tab / Shift+Tab for nesting.
- **Rearranging:** blocks are reordered by dragging the handle. Pages are reordered in the page tree with `@dnd-kit`.
- **v1 block set:** paragraph, headings (levels 1–3), bulleted / numbered / check lists, quote, code block, table, image, divider, and callout (note / tip / warning).
- **Not enabled:** file, video, and audio blocks; column layouts; real-time multi-user editing. One person writes at a time.
- **Images:** uploaded to Supabase Storage through the editor's upload handler. Allowed types: PNG, JPEG, WebP, GIF. SVG is rejected. Size limits are enforced server-side by the storage policy.
- **Autosave:** edits are debounced and saved to the live page. The editor shows a saving / saved / failed state and holds unsaved changes in memory until a save succeeds.
- **Typography parity:** the editor and the public renderer share one typography stylesheet, so a published page reads as it does in the editor.
## Block Schema & Rendering
 
A single module, `schema.ts`, defines every block type, its props, and its inline content. It drives three consumers:
 
1. the BlockNote editor configuration,
2. the Zod validator that runs on every save,
3. the Astro block renderer.
The renderer has one Astro component per block type and ships no client JavaScript for document content. Rules it enforces:
 
- All text is escaped. No user-supplied string is passed to `set:html` or `dangerouslySetInnerHTML`. Shiki output is the only injected HTML.
- Styling props (alignment, text color, background color) map to a fixed class allowlist. Stored values never become inline styles.
- Link URLs are limited to `http`, `https`, and `mailto`. External links render with `rel="nofollow ugc noopener noreferrer"`.
- Image sources must point at Showcrate storage. External image URLs are rejected at save.
---
 
## Database Schema (core tables)

```sql
users (id, username, display_name, avatar_url, bio, platform_role, username_changed_at, created_at, updated_at)
projects (id, owner_id, slug, name, tagline, cover_url, visibility, published, featured, view_count, tree_revision, deleted_at, created_at, updated_at)
project_redirects (id, owner_id, old_slug, new_slug, created_at)
username_redirects (id, user_id, old_username, created_at)
doc_pages (id, project_id, parent_id, kind, slug, title, content JSONB, schema_version, revision, content_text, content_tsv, order_index, is_index, deleted_at, created_at, updated_at)
page_versions (id, page_id, title, content JSONB, schema_version, saved_by, created_at)
project_collaborators (id, project_id, user_id, display_role, visible, accepted_at)
templates (id, name, description, category, structure JSONB, featured)
project_views (id, project_id, page_slug, viewer_id, ip_hash, referrer, country, viewed_at)
notifications (id, user_id, type, payload JSONB, read)
reports (id, reporter_id, project_id, reason, status)
admin_audit_log (id, actor_id, action, target_type, target_id, metadata)
```

**`doc_pages.content`** holds the BlockNote block array. `kind` is either `'page'` or `'folder'`. `parent_id` points to the containing folder node (or `null` at root). `schema_version` records the shape of the stored JSON. `revision` is an integer incremented on every page save. `deleted_at` tracks soft deletion.

**`projects.tree_revision`** is an integer incremented atomically on every structural tree mutation (create, rename, move, delete, restore) to guarantee tree concurrency across sessions.

**`username_redirects`** holds historical usernames owned by users (`old_username`, `user_id`), allowing permanent link preservation without chains.

**Docs search.** `content_text` is plain text extracted from the block JSON (inline text nodes across all blocks, including nested blocks, list items, and table cells). `content_tsv` is a weighted `tsvector` built from `title` + `content_text`, backed by a GIN index. Both are maintained by a `BEFORE INSERT OR UPDATE` trigger on `doc_pages`; the application never writes them. Extraction walks text nodes only, so block types, prop values, and IDs are not indexed. Soft-deleted pages (`deleted_at IS NOT NULL`) are omitted from search results.

**Templates.** `templates.structure` is a page tree with recursive nodes (max depth 5, max 500 nodes) whose pages carry block JSON conforming to the shared block schema. Fresh UUIDs and unique slugs are generated when applied.

RLS is enabled on all tables and on Storage. Public can only read published + public projects and their active doc pages. Owners have full access to their own data. Collaborators have attribution-only visibility into projects they're credited on and zero access to doc pages or tree RPCs. The service role key is server-only — never in client-side code.

---

## Docs Tree

Showcrate organizes project documentation into a hierarchical tree with flat public URLs:

- **Folders and Pages:** Nodes have `kind = 'page' | 'folder'`. Folders serve as organizational parents and hold no content in v1.
- **Flat Public URLs:** Every page is addressed at `/{username}/{project}/docs/{slug}` regardless of folder hierarchy or folder renaming. Page slugs are unique per project among live pages.
- **Hierarchy Limits:** Maximum folder depth is 5 levels. A single project may contain at most 500 nodes.
- **Soft Deletion & 30-Day Purge:** Deleting a page or folder sets `deleted_at = now()`. Soft-deleted nodes return 404 publicly and are excluded from search. Descendants of a soft-deleted folder are cascades in queries. A scheduled job permanently purges nodes soft-deleted for over 30 days.
- **Trash & Restore:** Deleted items appear in the editor Trash drawer. Restoring a node moves it back into its original parent if still alive, or falls back to project root if the parent was deleted.
- **Index Page Invariant:** Exactly one page per project has `is_index = true`. The index page lives at root (`parent_id IS NULL`), cannot be soft-deleted, cannot be moved inside a folder, and serves `/{username}/{project}/docs`.

---

## Saving & Concurrency

- **Page Content Concurrency:** Every save request carries the `base_revision` it was made against. The API applies the save only if `base_revision` equals stored `revision`, then increments `revision` atomically. A stale save is rejected with `409 Conflict`.
- **Tree Structural Concurrency:** Structural tree operations (create, rename, move, delete, restore) pass `base_tree_revision`. The database compares this against `projects.tree_revision` in an atomic transaction. Stale requests raise error `P0009` (HTTP `409`), returning the fresh tree and current revision so the editor can roll back optimistic changes.
- **Payload Validation:** Every save is validated against the shared block schema and capped at 1 MB before writing.

---

## URL & Username Rules

**Usernames:**
- 3–39 chars, lowercase letters/numbers/hyphens only. Cannot start or end with hyphen, no consecutive hyphens.
- **Changeable with 30-day cooldown:** Users can change their username via the `change_username` RPC (`POST /api/account/username`). Allowed once every 30 days (`users.username_changed_at`).
- **Permanent reservation & Single 301 hop:** Previous usernames are inserted into `username_redirects` and permanently held for that user. They cannot be claimed by others at signup or rename. `resolveCanonical` resolves old usernames and old project slugs in a single 301 redirect hop (no chains) with `Cache-Control: public, max-age=3600`.
- **Live availability:** `GET /api/account/username/available?name=` checks live availability without revealing whether a held name belongs to an active user or a redirect.
- Reserved words blocked: admin, showcase, templates, new, settings, help, notifications, auth, login, logout, signup, register, forgot-password, reset-password, about, blog, docs, terms, privacy, api, status, explore, contact, editor, code, export, versions, users, projects, reports, logs, billing, account, profile, appearance, danger, domain, seo, analytics, collaborators, general, visibility, following, dorukaysor, avision, batteringram, showcrate, dashboard, dmca, copyright, legal, abuse, security, cookies, licenses, subprocessors, grievance.

**Project slugs:**
- Auto-generated from project name (kebab-case)
- Unique per user (not globally)
- Renaming triggers a 301 redirect entry in `project_redirects`
---
 
## Build Phases (8 weeks)
 
| Sprint | Weeks | Phases |
|---|---|---|
| Sprint 1 | 1–2 | Setup, auth, user profile, settings |
| Sprint 2 | 2–3 | Project creation, templates, block schema, block editor, autosave, image upload |
| Sprint 3 | 3–4 | Collaboration, public showcase, block renderer |
| Sprint 4 | 4–5 | Version history, docs search, collaboration polish |
| Sprint 5 | 5–6 | Admin dashboard, notifications |
| Sprint 6 | 6–8 | Landing page, marketing pages, polish, launch |
 
---
 
## Team Ownership
 
| Person | Area |
|---|---|
| Lead / Backend | Architecture, DB schema, RLS and Storage policies, middleware, guards and headers, API routes, block-JSON validation, search trigger, version snapshots and pruning, auth logic, admin, deployment, unblocking |
| Frontend 1 | Public pages, auth UI, showcase, block renderer, landing |
| Frontend 2 | Dashboard shell and sidebar, block editor, page tree, settings, collaboration |
| Helper (Assets) | Visual assets, illustrations, brand material |
| Helper (Reports & Presentations) | Reporting, presentation decks, stakeholder materials |
 
---
 
## Critical Rules Every Team Member Must Know
 
1. **Two Supabase clients:** `supabase.ts` (anon key, client-side) and `supabase-server.ts` (SSR cookie-based, server-side only). Never use the service role key on the client.
2. **RLS is the security layer.** Test it manually, for tables and for Storage. If a logged-out user can see private data, or a Collaborator can write to a project, the policy is wrong — enforcement happens at the database, not the UI.
3. **Central route resolution happens once, in middleware.** Astro middleware attaches `locals.project`, `locals.viewer`, and `locals.isOwner` once per request. Pages and API routes read from `locals` — they don't re-derive auth state independently. Marketing routes (`/`, `/about`, `/help`, `/terms`, `/privacy`) skip session resolution entirely to remain static-cacheable and never call `getUser()`. `/dashboard/**` and `/editor/**` require an active viewer, redirecting unauthenticated visitors to `/auth/login?next=...` (validated and capped at 200 chars), and carry `Cache-Control: private, no-store` and `X-Robots-Tag: noindex`. `/dashboard/projects/[id]/**` and `/editor/[projectId]/**` routes use an owner-scoped resolver that validates `id` format (UUID), queries `id = $1 AND owner_id = viewer.id AND deleted_at IS NULL`, and returns 404 (never 403) if nonexistent or unauthorized. Collaborators have no project or editor routes and receive 404 here. React islands have no access to server context and must receive what they need as props.
4. **Reserved usernames** must be validated at signup using the list above.
5. **User content is data, never HTML.** Block JSON is validated with Zod against the shared schema on every save: unknown block types, unknown props, disallowed URLs, and oversized payloads are rejected. At render, all text is escaped, styling props map to a fixed class allowlist, links are limited to `http` / `https` / `mailto`, and images must point at Showcrate storage. No user-supplied string reaches `set:html` or `dangerouslySetInnerHTML`. No exceptions.
6. **Doc pages render at request time** from stored block JSON through the first-party block renderer. There is no build step for documentation content — every save is live.
7. **Docs search runs against `doc_pages.content_tsv`.** `content_text` and `content_tsv` are maintained by a database trigger on every insert/update — never by application-side logic.
8. **One block schema.** `schema.ts` drives the editor, the Zod validator, and the renderer. Adding or changing a block type touches all three in the same PR, and bumps `schema_version` whenever the stored JSON shape changes.
9. **Every save carries `base_revision`.** The API rejects stale saves with `409`. Never write page content without the revision check.
10. **BlockNote versions are pinned.** All `@blocknote/*` packages stay on one exact version. Upgrades are deliberate PRs that include a check of existing stored content against the new version. `@blocknote/xl-*` packages are licensed GPL-3.0 and are not used.
11. **`@dnd-kit/core` + `@dnd-kit/sortable`** for page tree reorder, pinned versions. Do not upgrade to `@dnd-kit/dom`. Native HTML5 drag-and-drop does not work on mobile.
12. **Project rename = 301 redirect entry in `project_redirects`. Username rename = 301 redirect entry in `username_redirects`.** Never break existing URLs; resolve canonical destinations in a single 301 hop with `Cache-Control: public, max-age=3600`.
13. **Collaborators are attribution-only.** Zero write permissions, zero settings access, zero ability to invite others. Only the project Owner can perform any action on a project.
14. **`main` branch is always deployable.** Feature branches only. PR to merge. Review within 24 hours.
15. **All tree mutations must execute through `doc_tree_*` database functions.** Structure operations (`doc_tree_create_node`, `doc_tree_rename_node`, `doc_tree_move_node`, `doc_tree_soft_delete_node`, `doc_tree_restore_node`) enforce hierarchy, depth limits, and atomic `tree_revision` concurrency at the database layer.
---
 
## What Is NOT in v1 (deferred to v2)
 
- Page slug renaming
- Right-hand configuration panel
- PDF export
- ZIP / HTML export
- Markdown import / export
- Real-time multi-user editing
- File, video, and audio blocks; column layouts
- Advanced analytics
- Password-protected projects
- Custom domains
- Billing surface (no Free/Pro tiers)
- Comments on doc pages
- Social graph (likes, following)
- Blog and Showcrate's own /docs
- Template builder UI (v1 templates are pre-populated page structures)
- Version diff view
- Organisations
- AI doc assistant
- Public API
- Embeddable showcase widget
---
 
## Open Decisions
 
- **`astro-og-canvas`** generates OG images at build time. Showcrate has no build step for content — the same incompatibility that ruled out Starlight and Pagefind applies here. Needs either an on-demand/runtime generation path or a documented, scheduled regeneration exception.
- **Version history parameters** are unconfirmed. Proposed: one snapshot per 10 minutes of active editing, a 30-day retention window, and pruning by a scheduled job (Supabase `pg_cron` or a Netlify scheduled function).
- **Block reordering on touch devices** is unverified. BlockNote's side menu is hover-driven and the drag handle has not been tested on real phones or tablets. Proposed fallback: "Move up" / "Move down" items in the drag handle menu, which BlockNote supports customizing.
- **Final v1 block set** must be confirmed against the pinned BlockNote version. Any listed block the version does not ship (divider, quote, or callout) is built as a custom block in `schema.ts`.
- **Docs search text extraction** is designed around a `strict $.**.text` JSONPath walk over the block JSON. It must be verified against BlockNote's shapes for links and table cells before the trigger is finalized.
- **Request-time rendering cost and caching.** Rendering block JSON and running Shiki on a serverless function adds latency per request. A cache policy (edge cache headers with invalidation on save) is needed that keeps "every save is live" true.
- **Asset access for Private and Unlisted projects.** A public storage bucket serves images to anyone with the URL. Decide between unguessable paths in a public bucket and a private bucket with signed URLs.
- **Page size cap.** A maximum serialized size for `doc_pages.content` is needed. Proposed: 1 MB, enforced by the save validator.
- **`project_views` granular fields** (`referrer`, `country`) are collected with no v1 UI to surface them, since advanced analytics is out of scope for v1. Confirm whether to keep writing this data for a v2 analytics feature or drop it from v1 inserts.
 
