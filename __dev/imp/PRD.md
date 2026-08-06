# Showcrate — Product Requirements Document (PRD)
> By Doruk, 08-06-2026

**Status:** Draft — contains unresolved architectural decisions (see Section 9)
**Owner:** Doruk (Lead Full-Stack Developer)
**Last updated:** 2026-08-06

---

## 1. Product Overview

**Showcrate** is a self-serve documentation and project showcase platform — GitHub Pages meets Notion, purpose-built for project documentation. Users sign up, create a project, write documentation in a split-pane markdown editor, invite collaborators, and publish to a public showcase. Visitors browse, search, and read without an account.

**Tagline:** Every project deserves a stage.
**Domain:** showcrate.io
**URL pattern:** `showcrate.example.com/{username}/{project}/{page}`

### 1.1 Problem Statement
Individuals and small teams building side projects, OSS tools, and portfolios lack a lightweight, hosted way to publish structured documentation without standing up a static site generator, managing a docs repo, or paying for a full wiki product.

### 1.2 Target Users
- Solo developers documenting side projects
- Small teams (≤5 collaborators/project on Free tier) shipping internal or public docs
- Portfolio builders who want a public, discoverable project page

---

## 2. Goals & Non-Goals

### 2.1 v1 Goals
- Auth, project creation, and split-pane markdown editing work end-to-end
- Documentation is stored and rendered from Postgres per-request (SSR), not build-time static generation
- Public showcase is browsable and searchable
- Role-based access (platform roles + project roles) is enforced via Supabase RLS, not just application logic
- Collaboration (invite, accept, edit) works for up to 5 collaborators/project (Free tier)

### 2.2 Explicit Non-Goals (v1)
Deferred to v2 per spec:
- Comments on doc pages
- Social graph (likes, following)
- Blog and Showcrate's own `/docs`
- Drag-drop WYSIWYG template editor (v1 templates are pre-populated file structures only)
- Full version diff view
- Organizations
- AI doc assistant
- Public API
- Embeddable showcase widget
- All Premium/Pro-gated features (custom domain, password-protected projects, unlisted projects, advanced analytics, PDF/HTML export, branding removal) — **the plan-limit logic should still exist, but the feature UI is v2**

---

## 3. Roles & Permissions

### 3.1 Platform Roles (6)
| Role | Description |
|---|---|
| Developer | Full system control, DB-level access. 1–2 people. |
| Moderator | Content moderation only. No infrastructure access. |
| Premium (Pro) | Paid tier, enhanced limits. |
| User | Standard account. 7 projects, 5 collaborators/project. |
| Restricted | Penalty box — can view, limited interaction, cannot create projects. |
| Banned | No access beyond appeal. Projects soft-archived 30 days, then purged. |

### 3.2 Project Roles (2)
| Role | Description |
|---|---|
| Owner | Full control over one project. One owner per project. |
| Collaborator | Edit content only. Cannot change settings, visibility, or invite others. |

### 3.3 Admin Route Access — UNCONFIRMED
Working assumption, not yet verified against spec: Moderator can access `/admin/overview`, `/admin/users`, `/admin/projects`, `/admin/showcase`, `/admin/reports` but **not** `/admin/templates`, `/admin/settings`, `/admin/logs` (Developer-only per spec's explicit callouts). This must be confirmed before `auth-guard.ts` role-gating logic is finalized — getting this wrong is a privilege-escalation bug, not a UX bug.

---

## 4. Functional Requirements by Surface

### 4.1 Public Routes
`/`, `/showcase`, `/templates`, `/about`, `/blog` (placeholder v1), `/help` (placeholder v1), `/terms`, `/privacy`, `/auth/*`, `/{username}`, `/{username}/{project}`, `/{username}/{project}/docs/*`

- No account required to browse, search, or read
- Doc pages render server-side from `doc_pages.content`, sanitized with DOMPurify before render — no exceptions
- RLS restricts public reads to `published = true AND visibility = 'public'` projects and their pages

### 4.2 Authenticated Routes
`/new`, `/notifications`, `/settings/*`, `/{username}/{project}/editor`, `/{username}/{project}/settings/*`, `/{username}/{project}/versions`, `/{username}/{project}/export`

- Auth checks happen in Astro frontmatter (server context). React islands do not perform auth checks — they have no server context.
- Project creation and collaborator invites must check `platform_role` and plan limits (7 projects / 5 collaborators on Free) as **API logic**, not DB logic
- Project rename generates a `project_redirects` entry — existing URLs must never 404

### 4.3 Admin Routes
`/admin/overview`, `/admin/users`, `/admin/projects`, `/admin/templates` (Developer only), `/admin/showcase`, `/admin/reports`, `/admin/settings` (Developer only), `/admin/logs`

- Gated by `auth-guard.ts` — pending confirmation per §3.3
- All admin actions write to `admin_audit_log`

---

## 5. Data Model (core tables)

```sql
users (id, username, display_name, avatar_url, bio, platform_role, created_at)
projects (id, owner_id, slug, name, tagline, cover_url, visibility, password_hash, published, featured, view_count, deleted_at)
project_redirects (id, owner_id, old_slug, new_slug)
doc_pages (id, project_id, slug, title, content, order_index, is_index)
page_versions (id, page_id, content, saved_by, created_at)
project_collaborators (id, project_id, user_id, display_role, visible, accepted_at)
templates (id, name, description, category, structure JSONB, featured)
project_views (id, project_id, page_slug, viewer_id, ip_hash, referrer, country, viewed_at)
notifications (id, user_id, type, payload JSONB, read)
reports (id, reporter_id, project_id, reason, status)
admin_audit_log (id, actor_id, action, target_type, target_id, metadata)
```

RLS enabled on all tables:
- Public → read-only, `published + public` projects and pages only
- Owner → full access to own data
- Collaborator → read + update `doc_pages` on accepted projects only
- Service role key → server-only, never shipped to the client

---

## 6. Non-Functional Requirements

| Category | Requirement |
|---|---|
| Security | RLS is the actual security boundary, not application-layer checks alone. Every new policy must be manually tested for logged-out and cross-tenant access before merge. |
| Content safety | All user-authored markdown sanitized via DOMPurify server-side before render. |
| URL stability | Reserved usernames validated at signup against the platform reserved-word list. Project renames must never break existing links. |
| Mobile | Drag-and-drop (file tree reorder) uses `@dnd-kit` — native HTML5 DnD does not work on mobile and is disallowed. |
| Deployment | `main` is always deployable. Feature branches + PR review within 24h. |
| Rendering model | Documentation is **runtime SSR from Postgres**, not build-time static generation. This is a deliberate deviation from typical docs-site architecture and constrains tooling choices (see §9.2). |

---

## 7. Technical Architecture Summary

| Layer | Tool |
|---|---|
| Framework | Astro 4+ (SSR mode) |
| UI | React islands + TypeScript |
| Styling | Tailwind CSS |
| Components | shadcn/ui |
| Editor | CodeMirror 6 (split-pane markdown) |
| Auth | Supabase Auth (Email + GitHub + Google OAuth) |
| Database | Supabase Postgres + RLS |
| Storage | Supabase Storage |
| Hosting | Netlify (SSR + serverless functions), deployed via `NETLIFY_AUTH_TOKEN` / `NETLIFY_SITE_ID` GitHub secrets |
| Two Supabase clients | `supabase.ts` (anon key, client-side) and `supabase-server.ts` (SSR cookie-based, server-only) — never mix these |

**Confirmed as off the table:** PocketBase, Coolify, Starlight, Fumadocs. Starlight and Fumadocs are both file-based, build-time frameworks and are structurally incompatible with runtime-editable, DB-backed content — Showcrate composes individual libraries instead (Shiki for syntax highlighting, remark/rehype with sanitization for markdown processing, shadcn/ui for nav/TOC).

---

## 8. Build Phases (8 weeks)

| Sprint | Weeks | Phases |
|---|---|---|
| Sprint 1 | 1–2 | Setup, auth, user profile, settings |
| Sprint 2 | 2–3 | Project creation, templates, split-pane editor |
| Sprint 3 | 3–4 | Collaboration, public showcase, doc rendering |
| Sprint 4 | 4–5 | Analytics, version history, export |
| Sprint 5 | 5–6 | Admin dashboard, notifications |
| Sprint 6 | 6–8 | Landing page, marketing pages, polish, launch |

Recommended internal build order (feature-level, independent of calendar sprints): **auth → project creation → collaboration → editor → public rendering.**

---

## 9. Open Decisions & Risks

These are unresolved as of this draft. Shipping code against silent assumptions here is the most likely source of rework in this project.

### 9.1 Project-scoped route data resolution — UNRESOLVED
Two options for `/{username}/{project}/*` routes:
- **Per-page DB lookup**: each route independently queries project + permission state
- **Middleware resolution**: single resolution step populates `Astro.locals`, consumed by all routes under that path

No decision has been made. This affects every project-scoped route being scaffolded right now — it should be resolved before those ~40 stub routes are built out further, not after.

### 9.2 Pagefind vs. runtime-editable content — UNRESOLVED, ARCHITECTURAL CONFLICT
Spec calls for Pagefind for docs search. Pagefind indexes **only at build time** (`npm run build`; does not work in dev mode). Showcrate's docs are **runtime-editable, DB-rendered content**. These are fundamentally incompatible as specified — a Pagefind index cannot reflect an edit made five minutes ago without a full site rebuild, which does not fit an SSR-per-request model. This needs a resolution (e.g., Postgres full-text search, a search-as-a-service provider, or a scheduled reindex job) before doc search is implemented, not a workaround bolted on after.

### 9.3 Moderator admin scope — UNCONFIRMED
See §3.3. Needs explicit sign-off against spec before `auth-guard.ts` role logic is treated as final.

### 9.4 v1 MVP scope cut list — UNCOMMITTED
No explicit commitment yet on which non-essential items get cut for v1 within the 8-week window. Candidates on the table: custom domains, advanced analytics, version history restore UI, admin dashboard depth, PDF/HTML export, password-protected projects. Most of these are already Pro-gated per §2.2, but "gated" is not the same as "descoped from the build" — this needs an explicit decision, not an assumption.

### 9.5 Two-person development capacity
Doruk is effectively the sole developer, with one teammate contributing web design and some backend architecture input. The remaining three team members are non-coding roles. This is a real capacity risk against the spec's stated scope and the "Frontend 1 / Frontend 2 / Backend" ownership table in the original spec, which assumes more engineering headcount than currently exists. Flagged, not resolved — the scope cut list in §9.4 is the lever most likely to actually address this.

---

## 10. Success Metrics (draft — not yet validated with team)
- Auth → project creation → first published page: completable end-to-end without a build error
- No cross-tenant data leakage on manual RLS testing (logged-out and wrong-owner access attempts)
- Public showcase renders and is searchable without requiring Pagefind's build-time constraint to be worked around ad hoc
- `main` remains deployable throughout — no sprint ends with a broken build merged to `main`