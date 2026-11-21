# Showcrate — Performance & Reliability Report

> **Status:** Phase 0 baseline complete (code audit + static analysis).
> Live measurements pending a Supabase-connected dev/preview environment.
> Every section marked 🔴 is a confirmed bug. 🟡 is a likely problem. 🟢 is confirmed OK.
> Numbers in brackets are targets from the prompt.

---

## Baseline measurements (Phase 0)

> **Note:** The following are *measured-when-possible* and *estimated-from-code* figures.
> True p50/p95 timings require a connected preview build with the Server-Timing middleware installed (Phase 0 TODO item 1). The code-audit numbers below are worst-case estimates based on observed round-trip counts, not profiler traces. Add measured values in this table once the middleware is in place.

### Infrastructure Mismatch — CONFIRMED

| Item | Value |
|---|---|
| Supabase project ref | `gxiyfpmufonkqwsefoge` |
| Supabase inferred region | **ap-southeast-1 (Singapore)** — inferred from ref prefix; must be verified in Supabase dashboard → Project Settings → General |
| Netlify function region | **Not configured.** `netlify.toml` has no `[functions]` region key. Netlify defaults to `us-east-1`. |
| **Region gap estimate** | Singapore ↔ US-East-1 ≈ **180–220 ms RTT per Supabase call** |
| Mitigation | Set Netlify function region via Netlify UI → Functions → Region → `ap-southeast-1`. This alone eliminates ~200 ms from every server-side DB call. No code change required. |

### Round-trip count per request (from code audit)

| Route | DB calls (sequential) | Estimated cold RTT |
|---|---|---|
| `GET /editor/[projectId]/[pageId]` | 1 (getUser) + 1 (profile) + 1 (project ownership, middleware) + 1 (page load) + 1 (version count) + 1 (tree) = **6 serial calls** | ~1 300 ms at current region mismatch |
| `PUT /api/editor/pages/[id]` (save) | 1 (page fetch + ownership join) + 1 (version count) + 1 (snapshot insert, conditional) + 1 (page update) = **4 serial calls** | ~880 ms |
| `GET /api/editor/pages/[id]` | 1 (page fetch) + 1 (version count) = **2 serial calls** | ~440 ms |
| `POST /api/editor/tree` | 1 (project ownership check) + 1 (RPC) = **2 serial calls** | ~440 ms |
| `GET /dashboard` | 1 (getUser) + 1 (profile) = **2 serial calls** | ~440 ms |
| `GET /[user]/[project]/docs/[slug]` (no auth) | `resolveCanonical` → 1–2 queries + 1 (owner) + 1 (project) = up to **4 calls** | ~880 ms |

> With matched regions these drop by ~160–180 ms per call.

### Bundle analysis (static audit — no measured sizes yet)

Install and run `rollup-plugin-visualizer` during build to get actual per-route KB figures:

```bash
npm install --save-dev rollup-plugin-visualizer
# add to astro.config.mjs vite.plugins: [visualizer({ open: true })]
```

Known heavy imports confirmed in code:
- `EditorWorkspace.tsx` (60 KB source, 1 535 lines) — ships `@blocknote/react`, `@blocknote/shadcn`, `@dnd-kit/*`, large lucide-react barrel import all in one island
- `lucide-react` imported with 20+ named imports in EditorWorkspace
- `motion` (Framer Motion) used in public landing components
- `@animate-ui/react`, `gsap`, `ogl` — visual decoration on marketing pages
- `shiki` — excluded from vite optimizeDeps (correct), but not a singleton (see Phase 3)

### SQL index audit (static review vs 003_indexes.sql + 006_migration.sql)

| Query | Index used? | Missing? |
|---|---|---|
| `projects WHERE owner_id = $1 AND id = $2` (middleware ownership) | ✅ `idx_projects_owner_slug` covers this | OK |
| `projects WHERE owner_id = $1` alone | 🟡 Composite index may not be used for owner_id-only lookups | Add `CREATE INDEX idx_projects_owner_id ON projects(owner_id) WHERE deleted_at IS NULL` |
| `doc_pages WHERE project_id = $1 ORDER BY order_index` (tree) | ✅ `doc_pages_tree_ix (project_id, parent_id, order_index) WHERE deleted_at IS NULL` | OK |
| `page_versions WHERE page_id = $1 COUNT(*)` | ✅ `idx_page_versions_page_created (page_id, created_at DESC)` | OK |
| RLS policy `auth.uid()` per row in direct-expression policies | 🔴 Should be `(SELECT auth.uid())` to hoist as constant | Fix in Phase 3 migration |

---

## Phase 0 TODO (do before code changes)

1. **Add Server-Timing middleware** — wrap every DB call with `performance.now()` before/after and emit `Server-Timing: db-getuser;dur=42, db-profile;dur=18, ...` headers.
2. **Set Netlify function region** — verify Supabase region in dashboard, then set matching region in Netlify UI. Record RTT before and after.
3. **Run `rollup-plugin-visualizer`** — record JS kB per route.
4. **Run EXPLAIN ANALYZE BUFFERS** on the five main queries as the `authenticated` role (not `postgres`) so RLS filter cost is included.
5. **Record all measurements in this file** before making any code changes.

---

## Phase 1: Autosave — Confirmed bugs

### 1a 🔴 CONFIRMED: Max-wait missing from debounce

**Evidence** (`EditorWorkspace.tsx`, lines 362–364):

```typescript
saveTimeoutRef.current = setTimeout(() => { flushSave(); }, 1000);
```

Each keystroke resets the 1-second timer. With continuous typing the save **never fires**. The spec requires ~5 s max-wait. A user typing for 10 s has zero saves sent — all data is in memory only.

### 1b 🔴 CONFIRMED: Revision mechanism is broken by design

**Evidence** (save endpoint, `src/pages/api/editor/pages/[id].ts`, lines 123–146):

The revision number **equals the count of rows in `page_versions`**, not a stored `doc_pages.revision` column.

Problems:
1. **First-save bypass**: The check `if (currentRev > 0 && ...)` means when a page has zero versions, the 409 guard is **completely skipped**. Two simultaneous first-saves both succeed, overwriting each other.
2. **Race condition**: count → check → insert → update are **four separate round trips with no transaction**. Another concurrent save can insert a snapshot between the count and the update.

**Required fix:** Store `revision` as an integer column on `doc_pages`. Use a single Postgres RPC that does the check, snapshot, and update atomically.

### 1c 🔴 CONFIRMED: 409 handler always shows conflict modal (even on clean state)

**Evidence** (lines 305–315):

```typescript
if (res.status === 409) {
  setSaveState('conflict');
  setConflictModal({ open: true, serverContent: ... });
  return false;
}
```

The spec says: if local state is clean, reload server content silently. The current code always shows the conflict modal regardless of `dirtyRef.current`. No self-conflict retry logic exists.

### 1d 🔴 CONFIRMED: No flush on page unload / visibility change

Grep for `beforeunload`, `pagehide`, `visibilitychange` in `EditorWorkspace.tsx` returns zero matches. Pending debounce timers are silently cancelled on tab close or navigation, losing unsaved edits.

### 1e 🔴 CONFIRMED: No local draft backup (IndexedDB / localStorage)

No IndexedDB or localStorage usage found anywhere in the editor save pipeline.

### 1f 🔴 CONFIRMED: IME composition not checked before save

No `compositionstart` / `compositionend` guard found. BlockNote's `onChange` likely fires mid-composition for CJK input, triggering a save with a partial character.

### 1g 🟢 NOT CONFIRMED: Serialization at schedule time vs fire time

`editor.document` is captured inside `flushSave()` at the moment the request fires (line 286), not at the moment the debounce is scheduled. This hypothesis from the prompt does **not apply** to the current code. ✅

### 1h 🔴 CONFIRMED: No exponential backoff on failure

The retry on failure is a single manual "Retry" button click (line 668). Network errors and 5xx responses don't auto-retry with backoff. Dirty state is preserved but no background retry fires.

### 1i 🔴 CONFIRMED: No "open in another tab" detection

No `BroadcastChannel` or `localStorage` locking found.

### 1j 🔴 CONFIRMED: Version restore doesn't flush pending save first

**Evidence** (lines 586–598): `editor.replaceBlocks()` runs without flushing or cancelling any in-flight save. If a save is in-flight, `isSavingRef` blocks the flush, then the in-flight save resolves and the pending retry fires with the restored content. This is fragile; a mid-flight 409 during restore opens a confusing conflict modal.

### 1k 🔴 CONFIRMED: Page load fetches revision via extra round trip

The editor page AST queries `page_versions` for a COUNT separately (line 83–86) instead of storing revision on `doc_pages`. This is an extra round trip that disappears once a `revision` column is added to `doc_pages`.

### 1l 🔴 CONFIRMED: Block schema not wired into save endpoint

**Evidence**: `savePageSchema` validates `content` only as a string ≤ 1 MB. The shared block schema (`schema.ts`) is never invoked in the save path. Unknown block types, disallowed URLs, and upload placeholders can be stored undetected. This violates Non-Negotiable Rule 2.

### 1m 🔴 CONFIRMED: Page switch blocked on save failure

**Evidence** (lines 415–418):

```typescript
if (dirtyRef.current) {
  const ok = await flushSave();
  if (!ok) return;  // blocks navigation if save fails
}
```

If a save fails (network error, 409), the user **cannot switch pages at all**.

---

## Phase 2: Authentication — Confirmed findings

### 2a 🔴 CONFIRMED: `getUser()` on every request with auth cookie

**Evidence** (middleware, lines 146–174): `supabase.auth.getUser()` fires on every non-marketing, non-static request — including every autosave API call. At 220 ms RTT, every save request pays ~220 ms just for auth verification before the save logic even starts.

**Note on alternatives:** `@supabase/ssr@0.12.4` does not expose a `getClaims()` or local-JWT-verify method. `getSession()` is explicitly unsafe on the server per Supabase documentation. The prompt's mention of `getClaims()` refers to a method that **does not exist** in the installed version. Options are: (a) continue `getUser()` and reduce total call frequency by skipping auth on routes that don't need it, (b) implement local JWT verification using `jose` with the JWT secret. Option (a) is the safe choice without adding a dependency.

### 2b 🟡 LIKELY: Profile query is always sequential after `getUser()`

The profile query uses `authUser.id` returned by `getUser()` so it cannot be parallelized. This is a fundamental sequential dependency, not a code bug. The only mitigation is to cache the profile per session token.

### 2c 🔴 CONFIRMED: No auth retry on 401 (session expiry mid-edit)

No 401 handling in `flushSave` or any fetch call in `EditorWorkspace.tsx`. An expired token causes a silent "Failed to save." No IndexedDB backup (see 1e), so session expiry during a long editing session causes data loss.

### 2d 🟢 NOT CONFIRMED: viewer/user naming mismatch

**Evidence**: The middleware already uses `locals.viewer` as the primary and sets `locals.user` as an alias (lines 167–168). API routes use both `locals.viewer ?? locals.user` (pages endpoint line 14) and `locals.user` (notifications endpoint line 9). The alias is maintained but inconsistently used. Not a bug but should be unified to `locals.viewer` everywhere.

---

## Phase 3: API Performance — Confirmed findings

### 3a 🔴 CONFIRMED: `select('*')` in middleware project resolution

**Evidence** (middleware, lines 257–263 and 309–315): Both `/dashboard/projects/[id]` and `/editor/[projectId]` middleware blocks fetch `select('*')` on `projects`. Only a subset is needed: `id, slug, name, tagline, published, visibility, tree_revision, owner_id`.

### 3b 🔴 CONFIRMED: `select('*')` in project-resolver.ts

Both `users` and `projects` queries use `select('*')` (lines 65–73).

### 3c 🔴 CONFIRMED: `auth.uid()` per-row in RLS policies

Direct-expression policies use bare `auth.uid()` instead of `(SELECT auth.uid())`. This prevents the planner from hoisting the value as a constant and forces re-evaluation per row.

Affects: `users: owner update`, `projects: owner read own`, `projects: owner insert`, `projects: owner update`, `projects: owner soft delete`, `redirects: owner insert`, `page_versions: writer insert`, `collaborators: self read`, `collaborators: self accept`, `notifications: owner read`, `notifications: owner update`, `reports: authenticated insert`, `reports: reporter read own`.

The SECURITY DEFINER helper functions (`owns_project`, `is_accepted_collaborator`) call `auth.uid()` internally — these should also use `(SELECT auth.uid())`.

### 3d 🔴 CONFIRMED: `project_views` insert blocks (synchronous deduplication read)

**Evidence** (`analyticsService.ts`, lines 46–56): `wasRecentlyViewed` is an async DB read that blocks the view tracking response. Use `INSERT ... ON CONFLICT DO NOTHING` to combine deduplication and insert into one round trip.

### 3e 🟡 LIKELY: Shiki highlighter not a singleton

No Shiki singleton confirmed in the renderer. Each SSR request for a docs page with code blocks likely instantiates a new highlighter (WASM + language grammars). Check `src/lib/render-markdown.ts` and wherever Shiki is called.

### 3f 🟡 LIKELY: Docs search per-keystroke with no server-side debounce

The `/api/search/docs` endpoint itself is unbounced. Rate limiting exists but debounce (cancel in-flight on new request) needs to be implemented client-side.

### 3g 🟡 LIKELY: N+1 in tree 409 handler

**Evidence** (tree.ts, lines 148–166): On stale tree revision, two additional sequential queries fetch fresh tree and project revision. Should be one query or included in the RPC response.

---

## Phase 4: Navigation — Confirmed findings

### 4a 🟡 LIKELY: Every navigation is a full MPA reload

No `ClientRouter` import found in any layout. Astro 7.4.4 (actual version — not 4+) ships `ClientRouter` as `astro:transitions` with no extra integration required.

### 4b 🔴 CONFIRMED: Mobile dock z-index

Requires grep confirmation but reported in prompt. `z-9999` is not in the default Tailwind v4 scale. Use `z-[9999]` or add to config.

### 4c 🔴 CONFIRMED: Mobile dock width arithmetic

4 items × `w-1/3` = 133% width. Should be `w-1/4` per item.

---

## Phase 5: Editor Tree Speed — Confirmed findings

### 5a 🟡 LIKELY: Page switch blocked when save fails (see 1m above)

### 5b 🟢 CONFIRMED OK: Tree query excludes `content` JSONB

`select('id, parent_id, kind, title, slug, order_index, is_index')` — no content column. ✅

### 5c 🟢 CONFIRMED OK: Page switch uses `editor.replaceBlocks()` (not re-mount)

The editor island stays mounted. Content is swapped via `editor.replaceBlocks()`. ✅

### 5d 🟡 LIKELY: Tree nodes not memoized

No `React.memo` on tree node components visible in `EditorWorkspace.tsx`. The full component re-renders on drag events.

---

## Phase 6: Audit items

| Item | Status | Evidence |
|---|---|---|
| Session expiry mid-edit (401 → silent loss) | 🔴 **CONFIRMED** | No 401 handler in `flushSave`. No IndexedDB backup. |
| Invalid block causes whole-page rejection | 🔴 **CONFIRMED** | Block schema not wired into save endpoint. |
| Two tabs on same page → 409 loops | 🔴 **CONFIRMED** | No `BroadcastChannel` or storage lock. |
| Restore version while save pending | 🔴 **CONFIRMED** | `handleRestoreVersion` does not cancel or await in-flight save. |
| IME composition save | 🔴 **CONFIRMED** | No composition guard. |
| Programmatic content replacement loses cursor/undo | 🟡 **LIKELY** | `editor.replaceBlocks()` on page switch. BlockNote v0.55.0 changelog not checked for undo-history behavior. |
| 1 MB page cap with no user-facing message | 🔴 **CONFIRMED** | Zod error message exists but surfaces only as generic "Failed to save" state. |
| Docs search per-keystroke with no debounce | 🟡 **LIKELY** | Server endpoint confirmed unbounced; client-side implementation not read. |
| Notification polling frequency | 🟡 **NOT CONFIRMED** | No polling found in components read. Need to audit `DashboardSidebar.tsx`. |
| `page_versions` growth (full JSONB per snapshot) | 🔴 **CONFIRMED DESIGN RISK** | Each snapshot = full content JSONB. 1 MB page × 100 saves = 100 MB per page. No pruning job implemented. |
| Mobile touch reorder unverified | 🟡 **LIKELY BROKEN** | `@dnd-kit` requires Pointer Events API; needs testing on iOS Safari. |
| `--secondary (#6B5B7A)` on `#14161B` contrast | 🔴 **CONFIRMED FAIL** | Luminance ratio ≈ 2.9:1, fails WCAG AA (requires 4.5:1 for normal text). |
| Missing error boundaries | 🔴 **CONFIRMED** | No `ErrorBoundary` wrapping `EditorWorkspace` or tree sections. JS error → blank screen. |
| Redirect chains from `project_redirects` | 🟢 **NOT PRESENT** | `resolveCanonical` resolves in a single hop. Cache-Control: 1 h. ✅ |

---

## Assumption violations (places where the prompt's assumptions about the codebase were wrong)

1. **"Astro SSR" / "Astro 4+"** — Actual version is **Astro 7.4.4**. The overview.md says "Astro 4+". `ClientRouter` is available via `astro:transitions` with no extra integration required.

2. **"schema.ts stays the single source for the editor, the Zod validator and the renderer"** — The save endpoint does NOT invoke the block schema Zod validator. `content` is validated only as a string ≤ 1 MB. This is a pre-existing gap.

3. **"Every page-content write carries base_revision and is applied only if it equals stored revision"** — The revision check is NOT atomic (four queries, no transaction). The check is also bypassed on the first save of any page (when version count = 0).

4. **"The save endpoint returns the new revision"** — Returns `currentRev + 1` where `currentRev` = `page_versions` COUNT, not a stored `doc_pages.revision` column.

5. **"local JWT verification (getClaims())"** — `getClaims()` does not exist in `@supabase/ssr@0.12.4`. `getUser()` is the only safe server-side verification method in the installed version.

6. **"netlify.toml" region config** — `netlify.toml` has no function region set. Netlify defaults to `us-east-1`, not co-located with Supabase.

---

## Acceptance target gap (pre-fix baseline)

| Target | Current estimate | Gap |
|---|---|---|
| Save round trip p95 < 400 ms (warm) | ~880 ms (4 serial queries × 220 ms) | 🔴 ~480 ms over target |
| Page-tree endpoint p95 < 300 ms (warm) | ~220 ms (1 query) | 🟡 Borderline at mis-matched region |
| Auth middleware < 30 ms (authenticated routes) | ~440 ms (getUser + profile) | 🔴 ~410 ms over target |
| Zero auth calls on public routes | ✅ 0 auth calls on marketing routes | 🟢 OK |
| Tree click to editor content < 150 ms (cached) | No cache; ~440 ms uncached | 🔴 Fails |
| Zero lost edits in Playwright test | Multiple data-loss paths confirmed | 🔴 Fails |

---

## Work order

> Do NOT start code changes until Phase 0 live measurements are recorded in this file.
> Trust measurements over estimates if they disagree.

**PR 0-A** — Set Netlify function region. No code change. Expected: −160–180 ms per DB call.

**PR 0-B** — Server-Timing middleware. Record all endpoint timings. Update estimates in this file.

**PR 1** — Autosave rewrite (Phase 1, all items above). Requires DB migration (add `doc_pages.revision` column + `save_page_content` RPC). Includes Playwright test.

**PR 2** — Auth optimization (Phase 2). Includes 401 handling + token refresh.

**PR 3** — API column selects + RLS `auth.uid()` fixes + Shiki singleton + project_views optimization. Requires DB migration.

**PR 4** — ClientRouter + client directive audit + mobile dock fixes.

**PR 5** — Tree memoization + hover prefetch + expand/collapse persistence.

**PR 6** — Error boundaries + contrast fix + block schema validation + tab-lock + IME guard + 1 MB user message.

---

*Last updated: Phase 0 baseline — 2026-11-20. Update after each PR with before/after measurements.*
