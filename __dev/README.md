## Product Overview

**Showcrate** lets anyone sign up, create a project, write documentation in a split-pane markdown editor, invite collaborators, and publish to a public showcase. Visitors can browse, search, and read — no account needed.

> Every project deserves a stage.
> **Domain:** https://showcrate.netlify.app/
> **Routing:** showcrate.netlify.app/{username}/{project}/{docs-slug}

---

## Tech Stack

| Layer               | Tool(s)                                       |
| :------------------ | :-------------------------------------------- |
| Framework           | Astro 4+ (SSR mode)                           |
| UI                  | React islands + TypeScript                    |
| Styling             | Tailwind CSS                                  |
| UI Components       | shadcn/ui + Base UI + Headless UI             |
| Animations          | Framer Motion + Lenis SmoothScroll            |
| Animated Components | Animate-UI + ReactBits                        |
| Icons               | Lucide + SimpleIcons                          |
| Editor              | CodeMirror 6 (split-pane markdown)            |
| Docs Renderer       | Starlight (Astro)                             |
| Search              | Fuse.js (showcase cards) + Pagefind (docs)    |
| Auth                | Supabase Auth (Email + GitHub + Google OAuth) |
| Database            | Supabase Postgres + RLS                       |
| Storage             | Supabase Storage (avatars, covers, assets)    |
| Email               | Resend (welcome, invites, password reset)     |
| PDF Export          | Puppeteer via Netlify serverless function     |
| Validation          | Zod                                           |
| ID Generation       | nanoid                                        |
| OG Images           | astro-og-canvas                               |
| Sitemap             | @astrojs/sitemap                              |
| Hosting             | Netlify (SSR + serverless functions)          |
| DnD                 | @dnd-kit/core + @dnd-kit/sortable             |
| Markdown Security   | DOMPurify                                     |

## Platform Roles (6)

| Role       | Description                                                             |
| :--------- | :---------------------------------------------------------------------- |
| Developer  | Full system control. DB-level only. 1–2 people.                         |
| Moderator  | Content moderation. No infrastructure access.                           |
| Pro        | Paid tier. Enhanced features.                                           |
| User       | Standard account. Up to 10 projects & 5 collaborators per project.      |
| Restricted | Penalty box. Can view, limited interaction. Cannot create new projects. |
| Banned     | No access beyond appeal. Projects soft-archived 30 days then purged.    |

## Project Roles (2)

| Role         | Description                                                              |
| :----------- | :----------------------------------------------------------------------- |
| Owner        | Full control over one project. One owner per project.                    |
| Collaborator | Edit content only. Cannot change settings, visibility, or invite others. |

## Free vs Pro

| Feature                     | Free         | Pro       |
| :-------------------------- | :----------- | :-------- |
| Projects                    | 7            | Unlimited |
| Collaborators/project       | 5            | Unlimited |
| Version history             | 10 snapshots | 60 days   |
| Custom domain               | [ ]          | [x]       |
| Password-protected projects | [ ]          | [x]       |
| Unlisted projects           | [ ]          | [x]       |
| Advanced analytics          | [ ]          | [x]       |
| PDF + HTML export           | [ ]          | [x]       |
| ZIP export                  | [x]          | [x]       |
| Remove platform branding    | [ ]          | [x]       |

> Premium & all premium only features will be implemented in v2

---

## The Sitemap

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
/{username}                Public user profile
/{username}/{project}      Project overview page
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
/{username}/{project}/editor                  Split-pane markdown editor
/{username}/{project}/settings/general        Rename, description, delete
/{username}/{project}/settings/visibility     Public/Private/Unlisted, password
/{username}/{project}/settings/collaborators  Invite, manage, remove
/{username}/{project}/settings/domain         Custom domain (Pro)
/{username}/{project}/settings/seo            Meta title, OG image
/{username}/{project}/settings/analytics      Views, referrers, visitors
/{username}/{project}/settings/danger         Archive, delete
/{username}/{project}/versions                Version history, restore
/{username}/{project}/export                  ZIP / PDF / HTML download

```

### Admin 🟣

```
/admin                     Overview stats
/admin/users               User management
/admin/projects            All projects across platform
/admin/templates           Template management (Developer only)
/admin/showcase            Featured project curation
/admin/reports             Reported content queue
/admin/settings            Platform-wide config (Developer only)
/admin/logs                Audit trail
```

---

## Database Schema (core tables)

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

RLS is enabled on all tables. Public can only read published + public projects and their doc pages. Owners have full access to their own data. Collaborators can read + update doc pages for projects they are accepted on. Service role key is server-only — never in client-side code.

---

## URL & Username Rules

**Usernames:**

- 4–39 chars, lowercase letters/numbers/hyphens only, spaces(between words) turned into hyphens
- Cannot start or end with hyphen, no consecutive hyphens
- Reserved words blocked:
  ```txt
    admin, showcase, templates, new, settings, help, notifications, auth, login, logout, signup, register, forgot-password, reset-password, about, blog, docs, terms, privacy, api, status, explore, contact, editor, code, export, versions, users, projects, reports, logs, billing, account, profile, appearance, danger, domain, seo, analytics, collaborators, general,visibility, following, followers, search
  ```
- Reserved developer usernames:
  ```txt
  dorukaysor, avision, batteringram, showcrate
  ```

**Project slugs:**

- Auto-generated from project name (kebab-case)
- Unique per user (not globally)
- Renaming triggers a 301 redirect entry in project_redirects

---

## Build Phases (7 sprints)

| Sprint   | Weeks | Phases                                         |
| -------- | ----- | ---------------------------------------------- |
| Sprint 0 | 0–1   | Planning, web design, architecture             |
| Sprint 1 | 1–2   | Setup, auth, user profile, settings            |
| Sprint 2 | 2–3   | Project creation, templates, split-pane editor |
| Sprint 3 | 3–4   | Collaboration, public showcase, doc rendering  |
| Sprint 4 | 4–5   | Analytics, version history, export             |
| Sprint 5 | 5–6   | Admin dashboard, notifications                 |
| Sprint 6 | 6–8   | Landing page, marketing pages, polish, launch  |

---

## Team Ownership

<details>
<summary><b><i>OLD System</i></b></summary>

| Person   | Person           | Area                                                    |
| -------- | ---------------- | ------------------------------------------------------  |
| Person 1 | Lead             | Architecture, DB schema, admin, deployment, unblocking  |
| Person 2 | Frontend 1       | Public pages, auth UI, showcase, doc renderer, landing  |
| Person 3 | Frontend 2       | Dashboard, editor, settings, collaboration, analytics   |
| Person 4 | Backend          | API routes, DB queries, auth logic, email, export       |
| Person 5 | Presentation     | Marketing pages, blog, templates, copywriting           |

</details>

| Roles         |	Primary Role                                              |	Secondary	Role                        |
| ------------- | --------------------------------------------------------- | ------------------------------------- |
| Lead          | Architecture, DB schema, API routes, unblocking	          | Code review, deployment	              |
| Web Designer  | Public pages, landing, showcase gallery, doc renderer UI  |	Settings UI polish, component library |
| Backend       | Project settings, collaboration flows, analytics UI	      | Email templates, error states	        |
| Person 3      | Dashboard, notifications, admin basics                    | Testing, bug triage                   |
| Person 4      | Auth flows, user profile, account settings                | Export/PDF integration                |
---

## Critical Rules Every Team Member Must Know

1. **Two Supabase clients:** `supabase.ts` (anon key, client-side) and `supabase-server.ts` (SSR cookie-based, server-side only). Never use the service role key on the client.
2. **RLS is the security layer.** Test it manually. If a logged-out user can see private data, the policy is wrong.
3. **Astro SSR:** auth checks go in the Astro frontmatter, not in `useEffect`. React islands have no access to server context.
4. **Reserved usernames** must be validated at signup using the list above.
5. **Markdown rendered from user content must be sanitized with DOMPurify** before rendering. No exceptions.
6. **Plan limits are API logic, not DB logic.** Check `platform_role === 'premium'` in every route that creates projects or adds collaborators.
7. **Pagefind only works after `npm run build`.** It does not work in dev mode. Tell everyone.
8. **`@dnd-kit`** for drag-and-drop (file tree reorder). Native HTML5 drag-and-drop does not work on mobile.
9. **Project rename = 301 redirect entry.** Never break existing URLs.
10. **`main` branch is always deployable.** Feature branches only. PR to merge. Review within 24 hours.

---

## What Is NOT in v1 (deferred to v2)

- Comments on doc pages
- Social graph (likes, following)
- Blog and Showcrate's own /docs
- Drag-drop WYSIWYG template editor (v1 templates are pre-populated file structures)
- Full version diff view
- Organisations
- AI doc assistant
- Public API
- Embeddable showcase widget
