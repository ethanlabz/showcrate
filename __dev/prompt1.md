# Task: Restructure routing around `/dashboard` and build the dashboard shell

## 1. Target behavior (final, do not redesign)

**Unauthenticated user**
1. Lands on `/` (landing page).
2. Clicks the CTA "Open dashboard" (plain anchor, `href="/dashboard"`).
3. Middleware responds `302` to `/auth/login?next=%2Fdashboard`.
4. After login or OAuth, the user is redirected to the validated `next`, defaulting to `/dashboard`.

**Authenticated user**
1. Lands on `/`. No automatic redirect, ever.
2. Clicks the same CTA, which goes to `/dashboard` and renders directly.

`index.astro` must contain only the landing page. Remove the authenticated-dashboard component rendering from it, and move that functionality to `/dashboard`.

`/{username}/{project}/**` remains, as public, shareable, read-only pages only. All owner-facing pages move under `/dashboard/**`.

## 2. Route map

| Old | New |
|---|---|
| `/new` | `/dashboard/new` |
| `/notifications` | `/dashboard/notifications` |
| `/settings/{profile,account,notifications,appearance,danger}` | `/dashboard/settings/{same names}` |
| `/{username}/{project}/editor` | `/dashboard/projects/[id]/editor` |
| `/{username}/{project}/versions` | `/dashboard/projects/[id]/versions` |
| `/{username}/{project}/settings/{general,visibility,collaborators,seo,danger}` | `/dashboard/projects/[id]/settings/{same names}` |
| (dashboard component on `/`) | `/dashboard` |
| `/auth/*`, `/admin/**`, `/{username}`, `/{username}/{project}`, `/{username}/{project}/docs/*` | unchanged |

Decisions (final):
- Dashboard project routes use the project `id`, NOT the slug. Slug renames must not break dashboard URLs, and `project_redirects` stays public-URL-only.
- The project is already pre-launch: delete the old route files. Do not add legacy redirects.
- Target structure:

```
src/pages/
  index.astro
  dashboard/
    index.astro
    new.astro
    notifications.astro
    settings/{profile,account,notifications,appearance,danger}.astro
    projects/[id]/
      editor.astro
      versions.astro
      settings/{general,visibility,collaborators,seo,danger}.astro
  [username]/index.astro
  [username]/[project]/index.astro
  [username]/[project]/docs/[...path].astro
```

## 3. Middleware (locate the existing Astro middleware and extend it)

Keep rule 3: resolve once per request, attach `locals.viewer`, `locals.isOwner`, `locals.project`, and branch by path prefix. Do not introduce `locals.user`.

1. **Marketing routes skip session resolution entirely:** `/`, `/about`, `/help`, `/terms`, `/privacy`. `/` must remain static-cacheable and must never call `getUser()`.
2. **`/dashboard` and `/dashboard/**`:**
   - No viewer: `302` to `/auth/login?next=<encodeURIComponent(path + search)>` (cap `next` at 200 characters).
   - Add `// TODO(legal-age-gate)` where the age-attestation gate will later hook in. Do not implement it now.
3. **`/auth/login` and `/auth/signup` with a viewer:** `302` to the validated `next`, else `/dashboard`. Exempt `/auth/logout` and `/auth/reset-password`.
4. **`safeNext(url)` rules:** the value must start with `/dashboard`, must not start with `//`, must not contain `\`, control characters or `://`, and is URL-decoded exactly once before validation. Anything failing validation resolves to `/dashboard`. Carry `next` through the OAuth callback via the callback URL query. Make sure the callback path is in Supabase's allowed redirect URLs.
5. **`/dashboard/projects/[id]/**`:**
   - Validate `id` with Zod against the project id format before querying.
   - Query `id = $1 AND owner_id = viewer.id AND deleted_at IS NULL`.
   - No row: return `404` with the same body and status as a nonexistent id. Never `403`.
   - Row found: `locals.project = row`, `locals.isOwner = true`.
   - Collaborators (credited, not owners) have no project routes. They get `404` here.
6. **Public project routes:** resolve by `username` + `slug`, keep the `project_redirects` 301, compute `isOwner`. Private projects return `404` to everyone except the owner.
7. **`[username]` resolver:** return `404` immediately, without a DB query, when the segment is in the reserved list.
8. **Response headers:**
   - `/dashboard/**` and `/auth/**`: `Cache-Control: private, no-store` and `X-Robots-Tag: noindex`.
   - Leave public page cache headers unchanged (a separate open decision).
9. RLS remains the real enforcement layer. The `owner_id` filter is the application-level check; do not weaken or remove any policy.

## 4. Landing page and Nav

- The primary CTA on `/` is a static anchor to `/dashboard`, identical for everyone. Do not branch its label or href on auth.
- The Nav island on `HomeLayout` must not depend on session props. Show the "Dashboard" CTA plus "Log in" / "Sign up" links, on desktop and mobile. This also closes the existing mobile-auth-gap bug.
- Fix `z-9999` (invalid Tailwind) to a valid value in any file you touch.

## 5. Dashboard shell

Reference: the two attached screenshots (Reactive Resume settings page). Use them for **structure only**. Do not copy branding or copy text. Use Showcrate tokens: dark by default, `#14161B` background, `#C9A96A` accent, Fraunces headings, Outfit body. Do not use `--secondary` plum for text on dark (contrast issue).

Layout rules:
- `AppLayout` is the shell for every `/dashboard/**` page. `EditorLayout` stays under `AppLayout` for the editor route only, with the sidebar defaulting to the collapsed icon rail there.
- Use the existing `sidebar.tsx` primitive. Do not convert it from Radix to Base UI in this task.
- **Desktop:** persistent left sidebar. **Mobile:** sidebar hidden behind a toggle button at the left of the header, opening as an offcanvas sheet; the page title is centered in the header with a bottom divider.
- **Remove `MobileDock` from `AppLayout`.** Keep it in `ProjectLayout`.
- Content pane: header (icon + title), divider, then content left-aligned with a max width of about 720px for forms.
- Create `DashboardSidebar.tsx` as a React island. It gets everything via props (rule 3): `viewer { displayName, email, avatarUrl, username, platformRole }`, `activeProject? { id, name, slug, published }`, and `currentPath`.

Sidebar contents, top to bottom:
1. Showcrate wordmark, linking to `/`.
2. Search trigger (see step 8 in the phases).
3. Group **App**: Projects (`/dashboard`), New project (`/dashboard/new`), Notifications (`/dashboard/notifications`). No unread badge.
4. Group **Project**, shown only on `/dashboard/projects/[id]/**`: project name as a label, then Editor, Versions, and a Settings sub-list (General, Visibility, Collaborators, SEO, Danger). Add a "View public page" link to `/{username}/{slug}` when published.
5. Group **Settings**: Profile, Account, Notifications, Appearance, Danger zone.
6. Admin link to `/admin`, rendered only when `platformRole` is `admin` or `developer`. Hiding is cosmetic; `/admin/**` stays enforced by middleware and RLS.
7. Footer user chip (avatar, display name, email) with a menu: "Public profile" (`/{username}`) and "Log out". **Log out must be a POST form to `/auth/logout`**, not a GET link.

Page content:
- `/dashboard`: "Your projects" (owned) with an empty state linking to `/dashboard/new`; and "Credited on" (read-only, links to the public URL, only where `accepted_at IS NOT NULL`).
- `/dashboard/settings/profile`: fields Name (editable), Username (**read-only** with helper text "Usernames can't be changed yet"; do NOT implement username changes, because shared public URLs would break and no username redirect mechanism exists), Email (read-only, with a verified indicator).
- Every other relocated page keeps its existing functionality; move it into the new shell and change nothing else.

## 6. Public project pages

- When `locals.isOwner` is true, show an "Edit" button linking to `/dashboard/projects/{id}/editor`. Pass the id to the island as a prop only for owners.
- Public pages must not link to any `/dashboard` route for non-owners except the Nav CTA.

## 7. Reserved usernames, robots, sitemap

- Add to the reserved list (and its validation tests): `dashboard`, `dmca`, `copyright`, `legal`, `abuse`, `security`, `cookies`, `licenses`, `subprocessors`, `grievance`. Keep all existing entries. Validate on signup.
- `robots.txt`: `Disallow: /dashboard`, `/auth`, `/admin`.
- `@astrojs/sitemap`: filter out `/dashboard/**`, `/auth/**`, `/admin/**`.

## 8. Docs to update (same PR)

In the attached Project Overview:
- Replace the Authenticated sitemap section with the new `/dashboard/**` tree. Remove `/new`, `/notifications`, `/settings/*` and the project-level `editor`, `versions` and `settings/*` routes from their old locations.
- Add a short "Routing model" section describing the two flows in section 1.
- Rule 3: add the `/dashboard/projects/[id]` owner-scoped resolver and the "marketing routes skip session resolution" exception.
- Add `dashboard` and the other new entries to the reserved list.
- Team Ownership: Frontend 2 owns the dashboard shell and sidebar; Lead owns middleware, guards and headers.
- Open Decisions: add "Username changes are disabled in v1; requires a username redirect table before enabling".

If `Legal.md` is present, replace the old path lists with `/dashboard/**` in the session-replay exclusions (item 3) and the age-gate exceptions (item 1), and add the new reserved routes to item 15.

## 9. Execution order (commit per phase; `main` stays deployable)

1. Middleware, `safeNext`, guards, headers, reserved-list changes, plus tests for them.
2. Move the route files with `git mv`, delete the old ones, then grep and fix every internal link, redirect target, `<a href>` and router push referencing old paths.
3. `AppLayout` shell, `DashboardSidebar`, mobile toggle, `MobileDock` removal.
4. Landing CTA and Nav.
5. Owner "Edit" button on public pages.
6. robots, sitemap, headers verification.
7. Docs updates.
8. Optional, last: ⌘K command palette (shadcn `Command`), client-side only, searching static dashboard routes and the viewer's own projects passed as props. No network requests. If you skip it, remove the search trigger rather than leaving it inert.

## 10. Acceptance checks (run and report each)

- Anonymous `GET /dashboard` returns `302` to `/auth/login?next=%2Fdashboard`.
- `next` values `https://evil.example`, `//evil.example`, `/\evil.example`, `/auth/login` and `/dashboardx` all resolve to `/dashboard`.
- Authenticated `GET /` returns `200` with no redirect, and middleware does not resolve the session on `/`.
- Authenticated `GET /auth/login` returns `302` to `/dashboard`.
- `GET /dashboard/projects/{another-user's-id}/editor` and `.../{nonexistent-id}/editor` return identical `404` responses.
- `/dashboard/**` responses carry `Cache-Control: private, no-store` and `X-Robots-Tag: noindex`.
- Signup with username `dashboard` is rejected. `/settings` and `/new` return `404` without a DB query.
- A grep for the old path patterns returns zero matches in source and docs.
- Keyboard-only: the sidebar toggle is reachable and operable; reduced-motion is respected.
- `astro check`, lint and production build all pass.

## Out of scope

Editor internals, version-history logic, the legal age gate, the Radix to Base UI sidebar conversion, landing redesign, analytics, light mode, username changes.

## Report back

List the files changed, any deviation from this prompt with the reason, and anything you could not verify. Do not claim a check passed without running it.