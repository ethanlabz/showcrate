# Implementing User Project Docs in Showcrate — A Complete Walkthrough

**Route this builds:** `/{username}/{project}/docs/{page}`
**What it does:** Reads a doc page out of Postgres, turns its markdown into safe HTML, and serves it — fresh, on every request, no build step.

This guide assumes you know basic TypeScript and have never built a dynamic SSR route before. Every step explains *why*, not just *what*.

---

## 0. The mental model (read this before touching code)

Forget "docs site." Think of this route the way you'd think of a blog post page backed by a database, like a CMS-driven page. Three things happen on every single visit:

1. **Look up** the page — "which row in `doc_pages` matches this URL?"
2. **Check permission** — "is this visitor allowed to see it?"
3. **Render** — "turn the stored markdown into HTML and send it."

No files on disk. No build step. If the owner hits save in the editor, the very next visitor sees the new content — because step 1 hits the live database, not a pre-built page.

---

## 1. Prerequisites

Make sure these are true before starting:

- [ ] Supabase project created, connected, `.env` has your `SUPABASE_URL` and `SUPABASE_ANON_KEY` (and `SUPABASE_SERVICE_ROLE_KEY`, server-only — never prefixed with `PUBLIC_`)
- [ ] `doc_pages` table exists (see schema below)
- [ ] `src/lib/supabase-server.ts` exists — the SSR, cookie-aware client (Critical Rule #1)
- [ ] Astro is running in **SSR mode** (`output: 'server'` in `astro.config.mjs`), not static

If any of these are missing, stop here and set them up first — everything below depends on them.

---

## 2. The database piece (what you're querying against)

```sql
create table doc_pages (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade,
  slug text not null,
  title text not null,
  content text not null,       -- raw markdown, exactly what the editor saved
  order_index int default 0,   -- controls sidebar ordering
  is_index boolean default false, -- true = this is the project's docs homepage
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (project_id, slug)
);
```

**RLS policy you need** (Critical Rule #2 — RLS is the actual security layer, not your application code):

```sql
alter table doc_pages enable row level security;

-- Anyone can read doc pages belonging to a published, public project
create policy "public can read published project docs"
on doc_pages for select
using (
  exists (
    select 1 from projects
    where projects.id = doc_pages.project_id
    and projects.published = true
    and projects.visibility = 'public'
  )
);

-- Owners and accepted collaborators can always read (and later, write) their own project's docs
create policy "owners and collaborators can read their docs"
on doc_pages for select
using (
  exists (
    select 1 from projects
    where projects.id = doc_pages.project_id
    and projects.owner_id = auth.uid()
  )
  or exists (
    select 1 from project_collaborators
    where project_collaborators.project_id = doc_pages.project_id
    and project_collaborators.user_id = auth.uid()
    and project_collaborators.accepted_at is not null
  )
);
```

Test this manually in the Supabase SQL editor by impersonating different users before you trust it. Application code is not your backstop here — the policy is.

---

## 3. Install what you'll need

```bash
npm install unified remark-parse remark-rehype rehype-stringify rehype-slug rehype-shiki isomorphic-dompurify
```

What each does:

| Package | Job |
|---|---|
| `unified` + `remark-parse` | Reads markdown text into a structured tree |
| `remark-rehype` | Converts that tree from "markdown-shaped" to "HTML-shaped" |
| `rehype-stringify` | Turns the HTML-shaped tree into an actual HTML string |
| `rehype-slug` | Adds `id` attributes to headings, so you can link to sections |
| `rehype-shiki` | Syntax-highlights code blocks |
| `isomorphic-dompurify` | Strips anything dangerous (`<script>`, `onclick=`, etc.) before it reaches the browser — **non-negotiable, Critical Rule #5** |

---

## 4. Build the markdown-to-HTML pipeline (its own file)

Create `src/lib/render-markdown.ts`. Keep this separate from the route file — you'll reuse it wherever else user markdown gets rendered (project descriptions, README-style content, etc.).

```typescript
// src/lib/render-markdown.ts
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import rehypeSlug from 'rehype-slug';
import rehypeStringify from 'rehype-stringify';
import DOMPurify from 'isomorphic-dompurify';

export async function renderMarkdown(rawContent: string): Promise<string> {
  // Step 1: markdown text -> HTML string (unsafe, could contain anything)
  const result = await unified()
    .use(remarkParse)        // parse markdown
    .use(remarkRehype)       // markdown AST -> HTML AST
    .use(rehypeSlug)         // add id="..." to headings
    .use(rehypeStringify)    // HTML AST -> HTML string
    .process(rawContent);

  const unsafeHtml = String(result);

  // Step 2: sanitize. This is not optional. Ever.
  const safeHtml = DOMPurify.sanitize(unsafeHtml, {
    ALLOWED_TAGS: [
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'a', 'ul', 'ol', 'li',
      'blockquote', 'code', 'pre', 'strong', 'em', 'img', 'table',
      'thead', 'tbody', 'tr', 'th', 'td', 'hr', 'br', 'span'
    ],
    ALLOWED_ATTR: ['href', 'src', 'alt', 'id', 'class', 'title'],
  });

  return safeHtml;
}
```

Why sanitize *after* rendering, not before? Because the danger isn't in the markdown syntax — it's in what markdown allows through, like raw HTML pass-through (`<script>alert(1)</script>` is valid inside a markdown file). You sanitize the final HTML, right before it's ever sent to a browser.

---

## 5. Build the route itself

Create `src/pages/[username]/[project]/docs/[...slug].astro`.

The `[...slug]` (with three dots) is a **rest parameter** — it matches any number of path segments after `/docs/`, so `/docs/getting-started` and `/docs/guides/advanced/setup` both hit this same file.

```astro
---
// src/pages/[username]/[project]/docs/[...slug].astro
import { supabaseServer } from '../../../../lib/supabase-server';
import { renderMarkdown } from '../../../../lib/render-markdown';
import Layout from '../../../../layouts/DocsLayout.astro';

// 1. Pull the pieces out of the URL
const { username, project: projectSlug, slug } = Astro.params;
const pageSlug = slug || 'index'; // no slug = the project's docs homepage

// 2. Create the request-scoped Supabase client
//    This reads the auth cookie from Astro.cookies, so RLS applies
//    as this specific visitor — not as an admin, not as anonymous by default.
const supabase = supabaseServer(Astro.cookies);

// 3. Resolve username -> project -> page, in that order.
//    (This is the exact lookup your PRD's open "route resolution" decision
//    is about — this query is where per-page lookup vs. middleware-cached
//    resolution actually gets decided. Written here as a direct per-page
//    lookup for clarity.)

const { data: owner } = await supabase
  .from('users')
  .select('id')
  .eq('username', username)
  .single();

if (!owner) {
  return Astro.redirect('/404');
}

const { data: project } = await supabase
  .from('projects')
  .select('id, name, visibility, published, password_hash')
  .eq('owner_id', owner.id)
  .eq('slug', projectSlug)
  .single();

if (!project) {
  return Astro.redirect('/404');
}

// 4. Password-protected project check (Pro feature)
//    RLS won't block this for you automatically — password gating is
//    an application-level check on top of RLS, not a replacement for it.
if (project.visibility === 'password') {
  const hasAccess = Astro.cookies.get(`project-access-${project.id}`)?.value === 'granted';
  if (!hasAccess) {
    return Astro.redirect(`/${username}/${projectSlug}/unlock`);
  }
}

// 5. Now fetch the actual doc page. RLS on doc_pages enforces the rest:
//    if this visitor shouldn't see it, this query simply returns nothing,
//    even though the code "asked" for it.
const { data: page } = await supabase
  .from('doc_pages')
  .select('title, content, order_index')
  .eq('project_id', project.id)
  .eq('slug', pageSlug)
  .single();

if (!page) {
  return Astro.redirect('/404');
}

// 6. Fetch the sidebar tree — every page in this project, for navigation
const { data: allPages } = await supabase
  .from('doc_pages')
  .select('title, slug, order_index, is_index')
  .eq('project_id', project.id)
  .order('order_index', { ascending: true });

// 7. Render markdown -> sanitized HTML
const html = await renderMarkdown(page.content);
---

<Layout title={`${page.title} — ${project.name}`}>
  <div class="docs-shell">
    <aside class="docs-sidebar">
      <ul>
        {allPages?.map((p) => (
          <li>
            <a href={`/${username}/${projectSlug}/docs/${p.is_index ? '' : p.slug}`}>
              {p.title}
            </a>
          </li>
        ))}
      </ul>
    </aside>

    <article class="docs-content">
      <h1>{page.title}</h1>
      <!-- set:html because we already sanitized this ourselves in step 4 -->
      <div set:html={html} />
    </article>
  </div>
</Layout>
```

**Why the frontmatter (the part between `---`) and not a `useEffect` in a React component?** This is Critical Rule #3. Everything above runs on the server, before any HTML reaches the browser. A visitor who isn't allowed to see a private project never receives the content — it never left your server. If you did this permission check inside a React island with `useEffect`, the page would flash the content (or its structure) client-side before JavaScript ever ran the check. Server-side frontmatter checks are not a style preference — they're the only version that's actually secure.

---

## 6. What "no build step" actually gets you

Walk through what happens when someone hits **Save** in the CodeMirror editor:

1. Editor sends the new `content` to an API route, e.g. `src/pages/api/pages/[id]/save.ts`
2. That route runs `supabase.from('doc_pages').update({ content }).eq('id', pageId)`
3. Done. That's it.

The next person who requests `/{username}/{project}/docs/{page}` runs the exact route file you just built — which queries `doc_pages` fresh, every time. There's no cache to bust, no rebuild to trigger, no deploy to wait on. This is the entire reason Starlight and Pagefind were ruled out for this route: they'd require a rebuild to reflect that save, and "publish instantly" is a stated product requirement, not a nice-to-have.

---

## 7. Testing checklist before you consider this done

- [ ] Visit a public, published project's docs while logged out — should render
- [ ] Visit a private project's docs while logged out — should 404 or redirect, **not** leak the title/content
- [ ] Log in as a collaborator on a private project — should render
- [ ] Log in as a random unrelated user — private project should still be blocked
- [ ] Edit a page in the editor, save, reload the docs URL in an incognito window — new content should appear immediately, no redeploy
- [ ] Try submitting `<script>alert(1)</script>` as page content through the editor, then view the rendered page — it should not execute
- [ ] Check a code block renders with syntax highlighting
- [ ] Click a heading anchor link — should scroll to that section (confirms `rehype-slug` is working)

---

## 8. What's deliberately *not* covered here

- **Caching** — right now, every single doc page view is a live database round trip. Fine for launch traffic; worth revisiting with CDN or edge caching once a project starts getting real visitor volume. Not addressed here because it's a performance decision, not a correctness one.
- **Search across doc pages** — separate open decision in your PRD (Postgres full-text vs. search-as-a-service), deliberately out of scope for this guide.
- **The `[...slug]` → sidebar ordering when a project has nested doc folders** — the schema above assumes a flat `slug` per page; if you want folder-style nesting (`guides/setup`, `guides/advanced`), that changes both the `slug` format and the sidebar-tree-building logic in step 5.6, and is worth deciding deliberately rather than backing into.