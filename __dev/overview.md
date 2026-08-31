# Showcrate

> ***Every project deserves a stage.***

# Project Overview

**Showcrate** lets anyone sign up, create a project, write documentation in a split-pane markdown editor, invite collaborators, and publish to a public showcase. Visitors can browse, search, and read — no account needed.

<aside>

</aside>

# Tech Stack

| **Layer** | **Tool(s)** |
| --- | --- |
| Framework | [Astro 7](http://astro.build) (SSR mode) |
| Styling | React islands + [Typescript](http://typescriptlang.org) |
| Styling | [Tailwind CSS](http://tailwindcss.com) |
| UI Components | [shadcn/ui](http://ui.shadcn.com) + [Base UI](http://base-ui.com) + [Headless UI](http://headlessui.com) |
| Animations | [Framer Motion](http://motion.dev) + [Lenis SmoothScroll](http://lenis.dev) |
| Animated Components | [Animate-UI](http://animate-ui.com) + [ReactBits](http://reactbits.dev) |
| Icons | [Lucide Icons](http://lucide.dev) |
| Editor | [CodeMirror 6](http://codemirror.net) (split-pane markdown) |
| Markdown Pipeline | unified + remark + rehype ― rendered at request time, no build step |
| Markdown Security | [isomorphic-dompurify](https://www.npmjs.com/package/isomorphic-dompurify) — sanitizes at render time, not save time, so raw markdown is stored untouched and diffs stay clean |
| Search (Showcase) | [Fuse.js](http://fusejs.io) — client-side fuzzy search over showcase cards |
| Search (Docs) | Postgres full-text search — `tsvector` column + GIN index on `doc_pages` |
| Auth | Supabase Auth (Email, Github, Google OAuth) |
| Database | Supabase Postgres + RLS |
| Storage | Supabase Storage (avatars, covers assets) |
| Email | [Resend](http://resend.com) (welcome, invites, password reset) |
| Validation | [zod](http://zod.dev) |
| ID Generation | [nanoid](https://www.npmjs.com/package/nanoid) |
| OG Images | [astro-og-canvas](https://www.npmjs.com/package/astro-og-canvas) |
| Sitemap | @astrojs/sitemap |
| Hosting | Netlify (SSR + serverless functions) — single deployment target |
| DnD | @dnd-kit/core + @dnd-kit/sortable, pinned — `@dnd-kit/dom` is not used |

# Roles

### 6 Platform Roles

| Developer | Full system control, including infrastructure and deployment. 2 people. |
| --- | --- |
| Moderator | Full `/admin/**` access — user management, project moderation, reports, template curation, showcase curation, audit log. ~4–5 trusted people. |
| User | Standard registered account. Default role for all sign-ups. Can create and own projects. |

### 2 Project Roles

| Owner | Full control over the project — content, settings, visibility, collaborators, deletion. One owner per project. Only the Owner can perform any action on a project. |
| --- | --- |
| Collaborator | Attribution-only. Zero permissions — cannot edit content, change settings, or take any action. Name is credited on the project. |

# Sitemap

### Public

```markdown

/                          Landing page (storytelling, Lenis scroll)
/showcase                  Public discovery gallery
/templates                 Template browser
/about                     About page
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

### Authenticated

```markdown
/new                                          Project creation wizard
/notifications                                Notification center
/settings/profile                             Avatar, display name, bio, links
/settings/account                             Email, password, OAuth, 2FA
/settings/notifications                       Email preferences
/settings/appearance                          Theme, editor font size
/settings/danger                              Export data, delete account
/{username}/{project}/editor                  Split-pane markdown editor
/{username}/{project}/settings/general        Rename, description, delete
/{username}/{project}/settings/visibility     Public/Private/Unlisted
/{username}/{project}/settings/collaborators  Invite, manage, remove
/{username}/{project}/settings/seo            Meta title, OG image
/{username}/{project}/settings/danger         Archive, delete
/{username}/{project}/versions                Version history, restore
```

### Admin

```markdown
/admin                     Overview stats
/admin/users               User management
/admin/projects            All projects across platform
/admin/templates           Template management
/admin/showcase            Featured project curation
/admin/reports             Reported content queue
/admin/settings            Platform-wide config
/admin/logs                Audit trail
```

# Database Schema

<aside>

**Table of Contents**

</aside>

**Detailed Sections**

<aside>

[Showcrate [pub]](https://app.notion.com/p/Showcrate-pub-3b5da1dcb0ce80d8854fe884f0b64562?pvs=21)

</aside>

<aside>

[Design](https://app.notion.com/p/Design-3cada1dcb0ce8077a9cfce263bbccb82?pvs=21)

</aside>

```sql
users (id, username, display_name, avatar_url, bio, platform_role, created_at)
projects (id, owner_id, slug, name, tagline, cover_url, visibility, published, featured, view_count, deleted_at)
project_redirects (id, owner_id, old_slug, new_slug)
doc_pages (id, project_id, slug, title, content, content_tsv, order_index, is_index)
page_versions (id, page_id, content, saved_by, created_at)
project_collaborators (id, project_id, user_id, display_role, visible, accepted_at)
templates (id, name, description, category, structure JSONB, featured)
project_views (id, project_id, page_slug, viewer_id, ip_hash, referrer, country, viewed_at)
notifications (id, user_id, type, payload JSONB, read)
reports (id, reporter_id, project_id, reason, status)
admin_audit_log (id, actor_id, action, target_type, target_id, metadata)
```

`doc_pages.content_tsv` is a generated `tsvector` column (title + content, weighted) backed by a GIN index — this is what docs search runs against.

**RLS** is enabled on all tables. Public can only read published + public projects and their doc pages. Owners have full access to their own data. Collaborators have read visibility into projects they're credited on and no write access — attribution carries no permission. Service role key is server-only — never in client-side code.

# URL & Username Rules

<aside>

### Usernames

- 3–39 chars, lowercase letters/numbers/hyphens only
- Cannot start or end with hyphen, no consecutive hyphens
- Reserved words blocked: admin, showcase, templates, new, settings, help, notifications, auth, login, logout, signup, register, forgot-password, reset-password, about, blog, docs, terms, privacy, api, status, explore, contact, editor, code, export, versions, users, projects, reports, logs, billing, account, profile, appearance, danger, domain, seo, analytics, collaborators, general, visibility, following, dorukaysor, avision, batteringram, showcrate
</aside>

<aside>

### Project Slugs

- Auto-generated from project name (kebab-case)
- Unique per user (not globally)
- Renaming triggers a 301 redirect entry in project_redirects
</aside>

# Team Ownership

| **Role** | **Name** | **Work** |
| --- | --- | --- |
| Backend Architect | Piyusn Parida | Architecture, DB schema, RLS policies, middleware routing, API routes, auth logic, admin, deployment, unblocking |
| Frontend Functions | Adarsh Sarangi | Dashboard, editor, settings, collaboration, doc renderer |
| Frontend Design | Jivitesh Gochhayat | Public pages, auth UI, showcase landing |
| Assets Management | Saumit Swain | Visual assets, illustrations, brand material |
| Reports & Presentations | Satyajit Paltasingh | Reporting, presentation decks |

# Critical Rules

<aside>

1. **Two Supabase clients:** `supabase.ts` (anon key, client-side) and `supabase-server.ts` (SSR cookie-based, server-side only). Never use the service role key on the client.
2. **RLS is the security layer.** Test it manually. If a logged-out user can see private data, or a Collaborator can write to a project, the policy is wrong — enforcement happens at the database, not the UI.
3. **Central route resolution happens once, in middleware.** Astro middleware attaches `locals.project`, `locals.viewer`, and `locals.isOwner` once per request. Pages and API routes read from `locals` — they don't re-derive auth state independently. React islands have no access to server context and must receive what they need as props.
4. **Reserved usernames** must be validated at signup using the list above.
5. **Markdown rendered from user content must be sanitized with `isomorphic-dompurify` at render time — never at save time.** No exceptions. This keeps stored markdown raw and diffs clean.
6. **Doc pages render through the unified/remark/rehype pipeline at request time.** There is no build step for documentation content — every save is live.
7. **Docs search runs against `doc_pages.content_tsv`.** Keep it in sync on every insert/update via a trigger or generated column — not application-side logic.
8. **`@dnd-kit/core` + `@dnd-kit/sortable`** for drag-and-drop (file tree reorder), pinned versions. Do not upgrade to `@dnd-kit/dom`. Native HTML5 drag-and-drop does not work on mobile.
9. **Project rename = 301 redirect entry.** Never break existing URLs.
10. **Collaborators are attribution-only.** Zero write permissions, zero settings access, zero ability to invite others. Only the project Owner can perform any action on a project.
11. **`main` branch is always deployable.** Feature branches only. PR to merge. Review within 24 hours.
</aside>

---
