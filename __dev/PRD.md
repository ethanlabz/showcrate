# Showcrate — Product Requirements Document

**Owner:** Doruk Aysoy (Lead / Backend)

## 1. Product Summary

**Showcrate** lets anyone sign up, create a project, write documentation in a split-pane markdown editor, invite collaborators, and publish to a public showcase. Visitors browse, search, and read without an account.

**Tagline:** Every project deserves a stage.
**Domain:** showcrate.io
**URL pattern:** `showcrate.io/{username}/{project}/{page}`

**The one fact every technical decision must respect:** content is database-backed and editable at runtime, not a build artifact. Showcrate renders on request from Postgres rows, not from files compiled ahead of time. Any tool that assumes otherwise — a static site generator, a build-time search indexer, a file-based content collection — does not belong in this stack, no matter how well it's regarded elsewhere.

---

## 2. Tech Stack

| Layer | Tool |
|---|---|
| Framework | Astro 7+ — full SSR (`output: 'server'`). Not Astro's "Server Islands" pattern, which is a static-first, mostly-cached model for occasional dynamic fragments — the inverse of what this product needs on every route. |
| UI | React islands + TypeScript |
| Styling | Tailwind CSS |
| UI Components | shadcn/ui + Base UI + Headless UI |
| Animations | Framer Motion + Lenis SmoothScroll |
| Animated Components | Animate-UI + ReactBits |
| Icons | Lucide + SimpleIcons |
| Editor | CodeMirror 6 (split-pane markdown), via `@uiw/react-codemirror` |
| Docs Rendering | `unified` / `remark` / `rehype` pipeline (`remark-parse` → `remark-gfm` → `remark-rehype` → `rehype-stringify`), invoked at request time. One shared render module feeds both the editor's live preview and the public doc route. |
| Search | Fuse.js (client-side, showcase card search only) + Postgres full-text search (`tsvector` + GIN index on `doc_pages`, exposed via RPC) for docs search |
| Sanitization | `isomorphic-dompurify` (DOMPurify + jsdom), applied at render time. Raw markdown is what's stored. |
| Auth | Supabase Auth (Email + GitHub + Google OAuth) |
| Database | Supabase Postgres + RLS |
| Storage | Supabase Storage (avatars, covers, assets) |
| Email | Resend (welcome, invites, password reset) |
| Validation | Zod |
| ID Generation | nanoid |
| OG Images | astro-og-canvas |
| Sitemap | @astrojs/sitemap |
| Hosting | Netlify (SSR + serverless functions) |
| DnD | `@dnd-kit/core` + `@dnd-kit/sortable` + `@dnd-kit/utilities`. dnd-kit also ships a newer, framework-agnostic `@dnd-kit/dom` core — that is a different API and is not used here. |

---

## 3. Architecture Notes

**Rendering:** Docs render through the `unified`/`remark`/`rehype` pipeline directly, called at request time from the Astro SSR route and fed by the `doc_pages.content` column, shared between the editor's live preview and the public doc route — because an edit made a minute ago has to be servable immediately, not after the next deploy.

**Sanitization:** `isomorphic-dompurify` runs at render time, not at save time. `doc_pages.content` and `page_versions.content` stay as raw markdown — this keeps version-history diffs clean, and means a sanitizer config change doesn't require reprocessing every stored document.

**Search:** Docs search runs on a generated `tsvector` column (`doc_pages.fts`) with a GIN index, ranked with `ts_rank` via a Postgres RPC function. It updates automatically on every write, inherits the same RLS policies as the rest of the schema, and requires no separate index-build step or external service. The showcase gallery's card search stays on Fuse.js client-side — small dataset, not a security boundary.

**Route resolution:** Every `/{username}/{project}/*` route resolves the project once, centrally, in Astro middleware — not per-page. `middleware.ts` resolves `{username}` and `{project}` into their DB rows, checks visibility and ownership against RLS, and attaches the result to `Astro.locals` (`locals.project`, `locals.viewer`, `locals.isOwner`). Downstream pages read from `Astro.locals`; they do not re-query. An unauthenticated visitor hitting a private project gets a 404, not a 403, consistently, because the check lives in exactly one place.

**Project permissions:** The Owner is the only person with any write access to a project — content, settings, visibility, collaborator management, all of it. Every authenticated, project-scoped route (`/editor`, every `/settings/*` page, `/versions`, `/export`) checks `locals.isOwner` and nothing else; there is no intermediate permission tier to branch on. Collaborators are not a permission level — see §4.

**Admin access:** A single middleware check gates every `/admin/**` route: `platform_role in ('developer', 'admin')`. There is no per-page permission matrix inside the admin panel. Developer's additional authority (service role key, deployment, environment configuration, direct database access) lives outside the web app entirely and isn't expressed as a route.

**Drag-and-drop:** File-tree reordering uses `@dnd-kit/core` + `@dnd-kit/sortable`, pinned explicitly in `package.json`, not the newer framework-agnostic `@dnd-kit/dom` core. Native HTML5 drag-and-drop does not work on mobile, which is why dnd-kit is used at all.

---

## 4. Roles & Permissions

### Platform Roles (6)

| Role | Description |
|---|---|
| Developer | Full system control — infrastructure, deployment, database, and everything Admin can do. 2 people. |
| Admin | Full access to `/admin` and every route within `/admin/**` — user management, project moderation, templates, showcase curation, reports, platform settings, audit logs. No infrastructure-level access. Trusted individuals, roughly 4–5 people. |
| Premium (Pro) | Paid tier. Enhanced features. |
| User | Standard account. Up to 7 projects, 5 collaborators per project. |
| Restricted | Penalty box. Can view, limited interaction. Cannot create new projects. |
| Banned | No access beyond appeal. Projects soft-archived 30 days then purged. |

### Project Roles (2)

| Role | Description |
|---|---|
| Owner | Sole controller of the project. Only the Owner can edit content, change settings or visibility, or manage collaborators. One owner per project. |
| Collaborator | **Attribution only — no permissions of any kind.** A collaborator is a name credited on a project, nothing more: no content edit access, no settings access, no ability to invite or remove anyone. Being credited requires accepting the invite (`accepted_at`), after which the project appears in the collaborator's own project list and, if the project is public, on their public profile alongside their owned projects. A collaborator credited on a private project gains no special visibility into it beyond what any other non-owner already has — credit is a label, not a grant. |

---

## 5. Free vs Pro

| Feature | Free | Pro |
|---|---|---|
| Projects | 7 | Unlimited |
| Collaborators/project | 5 | Unlimited |
| Version history | 10 snapshots | 60 days |
| Unlisted projects | ❌ | ✅ |
| Remove platform branding | ❌ | ✅ |

> "Premium" and all premium-only features ship in v2.

---

## 6. Full Sitemap

### Public 🟢
```
/                          Landing page (storytelling, Lenis scroll)
/showcase                  Public discovery gallery
/templates                 Template browser
/about                     About page
/blog                      Blog (placeholder v1)
/help                      Help center (placeholder v1)
/terms                     Terms of service
/privacy                   Privacy policy
/auth/login                Login
/auth/logout               Logout
/auth/signup               Registration
/auth/forgot-password      Password reset request
/auth/reset-password       Password reset form
/{username}                Public user profile — projects owned + projects collaborated on
/{username}/{project}      Project overview page — credits any listed collaborators
/{username}/{project}/docs/*    Documentation pages
```

### Authenticated 🔵
```
/new                                          Project creation wizard
/notifications                                Notification center
/settings/profile                             Avatar, display name, bio, links
/settings/account                             Email, password, OAuth, 2FA
/settings/notifications                       Email preferences
/settings/appearance                          Theme, editor font size
/settings/billing                             Plan, usage, payment, history
/settings/danger                              Export data, delete account
/{username}/{project}/editor                  Split-pane markdown editor — Owner only
/{username}/{project}/settings/general        Rename, description, delete — Owner only
/{username}/{project}/settings/visibility     Public / Private / Unlisted — Owner only
/{username}/{project}/settings/collaborators  Invite, manage, remove credits — Owner only
/{username}/{project}/settings/seo            Meta title, OG image — Owner only
/{username}/{project}/settings/analytics      Page view counts — Owner only
/{username}/{project}/settings/danger         Archive, delete — Owner only
/{username}/{project}/versions                Version history, restore — Owner only
/{username}/{project}/export                  ZIP / HTML download — Owner only
```

### Admin 🟣 — Developer and Admin roles
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

## 7. URL & Username Rules

**Usernames:**
- 5–39 chars, lowercase letters/numbers/hyphens only
- Cannot start or end with hyphen, no consecutive hyphens
- Reserved words blocked: admin, showcase, templates, new, settings, help, notifications, auth, login, logout, signup, register, forgot-password, reset-password, about, blog, docs, terms, privacy, api, status, explore, contact, editor, code, export, versions, users, projects, reports, logs, billing, account, profile, appearance, danger, seo, analytics, collaborators, general, visibility, following

**Project slugs:**
- Auto-generated from project name (kebab-case)
- Unique per user (not globally)
- Renaming triggers a 301 redirect entry in `project_redirects`

---

## 8. Data Model

```sql
users (id, username, display_name, avatar_url, bio, platform_role, created_at)
projects (id, owner_id, slug, name, tagline, cover_url, visibility, published, featured, view_count, deleted_at)
project_redirects (id, owner_id, old_slug, new_slug)
doc_pages (id, project_id, slug, title, content, order_index, is_index, fts)
page_versions (id, page_id, content, saved_by, created_at)
project_collaborators (id, project_id, user_id, display_role, visible, accepted_at)
templates (id, name, description, category, structure JSONB, featured)
project_views (id, project_id, page_slug, viewer_id, ip_hash, referrer, country, viewed_at)
notifications (id, user_id, type, payload JSONB, read)
reports (id, reporter_id, project_id, reason, status)
admin_audit_log (id, actor_id, action, target_type, target_id, metadata)
```

`doc_pages.fts` is a generated `tsvector` column — derives automatically from `title` and `content`, never written to directly.

`project_collaborators.display_role` is a credit label ("Designer", "Contributor", etc.) shown on the project and on the collaborator's profile — it carries no permission. `visible` controls whether the credit surfaces on the collaborator's public profile; `accepted_at` gates it entirely — nothing displays until the invited person accepts.

RLS is enabled on all tables. Public can only read published + public projects and their doc pages. Only the Owner has write access to a project's rows and its `doc_pages` — there is no RLS carve-out granting collaborators write access, because none exists. Service role key is server-only — never in client-side code. `doc_pages.content` and `page_versions.content` are raw markdown; sanitization happens at render time.

---

## 9. Team & Build Plan

The team is split into two groups: three people building the software, and two people supporting it.

**Software (3):**

| Person | Area |
|---|---|
| Lead / Backend | Architecture, DB schema, admin panel, deployment, API routes, DB queries, auth logic, email, export, unblocking |
| Frontend 1 | Public pages, auth UI, showcase, doc renderer, landing |
| Frontend 2 | Dashboard, editor, settings, collaboration, analytics |

**Helpers (2):** Visual assets (images, video, cover art, OG image templates), documentation and report writing, presentation and pitch deck creation.

**Sprint plan (8 weeks):**

| Sprint | Weeks | Phases |
|---|---|---|
| Sprint 1 | 1–2 | Setup, auth, user profile, settings |
| Sprint 2 | 2–3 | Project creation, templates, split-pane editor |
| Sprint 3 | 3–4 | Collaboration credits, public showcase, doc rendering |
| Sprint 4 | 4–5 | Search, version history, export |
| Sprint 5 | 5–6 | Admin dashboard, notifications |
| Sprint 6 | 6–8 | Landing page, marketing pages, polish, launch |

---

## 10. Critical Engineering Rules

1. **Two Supabase clients:** `supabase.ts` (anon key, client-side) and `supabase-server.ts` (SSR cookie-based, server-side only). Never use the service role key on the client.
2. **RLS is the security layer.** Test it manually. If a logged-out user can see private data, the policy is wrong.
3. **Astro SSR:** auth and project-resolution checks go in middleware / `Astro.locals`, not in `useEffect`. React islands have no access to server context.
4. **Reserved usernames** must be validated at signup using the list above.
5. **Markdown rendered from user content must be sanitized with `isomorphic-dompurify` at render time.** No exceptions.
6. **Plan limits are API logic, not DB logic.** Check `platform_role === 'premium'` in every route that creates projects or adds collaborators.
7. **Postgres full-text search updates automatically on write** via the generated `fts` column — no separate build/index step.
8. **`@dnd-kit/core` + `@dnd-kit/sortable`** for drag-and-drop (file tree reorder) — pin these exact packages, do not substitute `@dnd-kit/dom`.
9. **Project rename = 301 redirect entry.** Never break existing URLs.
10. **Admin route access is a single check:** `platform_role in ('developer', 'admin')`. Don't build a per-page permission matrix inside `/admin/**`.
11. **Collaborators are not a permission tier.** Every project-scoped write route checks `locals.isOwner` only — do not add a "collaborator can edit" branch anywhere. If a future feature needs collaborator edit access, that's a deliberate v2 change, not an oversight to patch quietly.
12. **`main` branch is always deployable.** Feature branches only. PR to merge. Review within 24 hours.

---

## 11. Future Scope

**Deferred to v2:**
- Comments on doc pages
- Social graph (likes, following)
- Blog and Showcrate's own /docs
- Drag-drop WYSIWYG template editor (v1 templates are pre-populated file structures)
- Full version diff view
- Organisations
- AI doc assistant
- Public API
- Embeddable showcase widget
- Collaborator edit access (v1 collaborators are credit-only)

**Not currently planned** (may be revisited in a future update if there's demand):
- PDF export
- Advanced analytics
- Password-protected projects
- Custom domains