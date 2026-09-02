# Showcrate — Landing Page + Layout System

Build a storytelling landing page and complete the stub layouts (Editor, Project, Docs) using the existing design tokens from `global.css`, with MineKeep-style minimalistic dark aesthetics and GitHub-style routing/functionality patterns.

## Reference Analysis

**Image 1 — MineKeep (Design Style Target):**
![MineKeep reference](/.user_uploaded/media_1788379622944.png)
- Dark, ultra-clean UI with near-black backgrounds and subtle borders
- Top header: logo + breadcrumb nav, right-aligned links + avatar
- Left vertical icon sidebar (narrow ~48px) for section switching
- Resizable file explorer panel with file tree
- Tabbed code editor area with line numbers
- Collapsible bottom console panel

**Image 2 — GitHub (Routing/Function Target):**
![GitHub reference](/.user_uploaded/media_1788379622955.png)
- Breadcrumb path: `org / repo > file` with branch selector
- Sub-nav tabs: Code, Issues, Pull requests, etc.
- File tree sidebar with search
- Edit/Preview toggle tabs in editor
- "Cancel changes" / "Commit changes" action buttons

---

## Proposed Changes

### 1. Landing Page — Storytelling Design

The landing page will be a vertical scroll narrative built with GSAP scroll-triggered animations and Lenis smooth scrolling (both already installed). Minimal, dark-first, using existing design tokens.

#### Sections (scroll sequence):
1. **Hero** — Full-viewport. Large Syne heading with `StrokeText` animation: *"Every project deserves a stage."* Subtle grid/dot background. Single CTA button.
2. **Problem → Solution** — Two-panel storytelling. "Documentation is broken" → "Showcrate fixes it." Text fade-ins on scroll.
3. **Features Grid** — 3-column bento grid with icons. Interactive docs, file-system emulation, instant deploys, shareable snippets.
4. **Live Demo Preview** — Simulated editor screenshot/mockup in a browser chrome frame, with scroll-triggered reveal.
5. **How It Works** — 3-step numbered flow: Create → Write → Share. Horizontal timeline on desktop.
6. **Social Proof / Showcase** — Grid of featured project cards (placeholder data for now).
7. **CTA Section** — Final call-to-action. "Start building. It's free."

#### [NEW] [HeroSection.tsx](file:///d:/projects/ethanlabz/showcrate/src/components/pages/landing/HeroSection.tsx)
Full-viewport hero with StrokeText animation, ambient grid background, CTA buttons. Uses GSAP for entrance animations.

#### [NEW] [ProblemSolution.tsx](file:///d:/projects/ethanlabz/showcrate/src/components/pages/landing/ProblemSolution.tsx)
Scroll-triggered two-panel narrative section.

#### [NEW] [FeaturesGrid.tsx](file:///d:/projects/ethanlabz/showcrate/src/components/pages/landing/FeaturesGrid.tsx)
Bento-style feature cards with Lucide icons.

#### [NEW] [EditorPreview.tsx](file:///d:/projects/ethanlabz/showcrate/src/components/pages/landing/EditorPreview.tsx)
Simulated editor mockup in a browser chrome frame.

#### [NEW] [HowItWorks.tsx](file:///d:/projects/ethanlabz/showcrate/src/components/pages/landing/HowItWorks.tsx)
Three-step horizontal timeline.

#### [NEW] [ShowcaseGrid.tsx](file:///d:/projects/ethanlabz/showcrate/src/components/pages/landing/ShowcaseGrid.tsx)
Featured project cards gallery.

#### [NEW] [CTASection.tsx](file:///d:/projects/ethanlabz/showcrate/src/components/pages/landing/CTASection.tsx)
Final CTA with gradient accent glow.

#### [NEW] [PublicHeader.tsx](file:///d:/projects/ethanlabz/showcrate/src/components/public/PublicHeader.tsx)
Shared public header for landing + public pages. Logo, nav links (Features, Docs, Showcase, Pricing), sign in / sign up buttons. Glassmorphism nav bar that fades in on scroll.

#### [MODIFY] [index.astro](file:///d:/projects/ethanlabz/showcrate/src/pages/index.astro)
Replace placeholder with full landing page using `LandingLayout` and all landing section components.

#### [MODIFY] [LandingLayout.astro](file:///d:/projects/ethanlabz/showcrate/src/layouts/LandingLayout.astro)
Update footer to use design tokens from `global.css` (currently uses `primary`, `muted-foreground`, `card` which aren't in the token system). Update import path for `PublicHeader` to match new location.

---

### 2. Editor Layout — MineKeep-Style

A full-screen, no-scroll editor environment modeled after MineKeep's panel design. This is used at `/:username/:project/editor`.

#### [MODIFY] [EditorLayout.astro](file:///d:/projects/ethanlabz/showcrate/src/layouts/EditorLayout.astro)
Complete layout with BaseLayout wrapper. Full-screen flex layout, no body scroll. Passes project context from `Astro.locals`.

#### [NEW] [EditorShell.tsx](file:///d:/projects/ethanlabz/showcrate/src/components/pages/editor/EditorShell.tsx)
React island — the main editor container. Manages panel state. Sub-components:

#### [NEW] [EditorHeader.tsx](file:///d:/projects/ethanlabz/showcrate/src/components/pages/editor/EditorHeader.tsx)
Top bar: Logo + `owner/project` breadcrumb (left), action buttons — Save, Commit changes (right). Minimal, dark.

#### [NEW] [EditorSidebar.tsx](file:///d:/projects/ethanlabz/showcrate/src/components/pages/editor/EditorSidebar.tsx)
Narrow (48px) vertical icon sidebar (left edge). Icons: Explorer, Search, Pages, Settings. Active state with accent border. MineKeep-style.

#### [NEW] [FileExplorer.tsx](file:///d:/projects/ethanlabz/showcrate/src/components/pages/editor/FileExplorer.tsx)
Collapsible file tree panel (~260px). Shows doc pages as a tree. Toolbar with add/refresh/collapse actions. Like MineKeep's explorer panel.

#### [NEW] [EditorTabs.tsx](file:///d:/projects/ethanlabz/showcrate/src/components/pages/editor/EditorTabs.tsx)
Tab bar for open files. Closable tabs. "No tabs open" empty state (like MineKeep).

#### [NEW] [EditorPane.tsx](file:///d:/projects/ethanlabz/showcrate/src/components/pages/editor/EditorPane.tsx)
Main content area. Houses the CodeMirror editor (already installed) with Edit/Preview toggle tabs (like GitHub). Line numbers, dark theme.

#### [NEW] [ConsolePanel.tsx](file:///d:/projects/ethanlabz/showcrate/src/components/pages/editor/ConsolePanel.tsx)
Collapsible bottom panel (like MineKeep's "Server Console"). Shows save status, build logs, markdown preview output.

#### [NEW] [editor/index.astro](file:///d:/projects/ethanlabz/showcrate/src/pages/[username]/[project]/editor/index.astro)
Editor page route. Uses `EditorLayout`, passes project data from `locals.project`.

---

### 3. Project Layout — GitHub-Style Repo View

The project overview page at `/:username/:project`. Shows project info, README-like overview, and navigation tabs.

#### [MODIFY] [ProjectLayout.astro](file:///d:/projects/ethanlabz/showcrate/src/layouts/ProjectLayout.astro)
Full layout with BaseLayout wrapper. App-style header, project sub-navigation tabs.

#### [NEW] [ProjectHeader.tsx](file:///d:/projects/ethanlabz/showcrate/src/components/pages/project/ProjectHeader.tsx)
Project header bar: owner avatar + `owner / project` breadcrumb. Visibility badge. Star/fork-like action buttons.

#### [NEW] [ProjectTabs.tsx](file:///d:/projects/ethanlabz/showcrate/src/components/pages/project/ProjectTabs.tsx)
GitHub-style tab navigation: Docs, Editor, Versions, Collaborators, Settings. Active tab highlighted with accent.

#### [NEW] [ProjectOverview.tsx](file:///d:/projects/ethanlabz/showcrate/src/components/pages/project/ProjectOverview.tsx)
Landing content for the project: tagline, description, quick links to docs, collaborator list, metadata (created date, view count).

#### [NEW] [index.astro](file:///d:/projects/ethanlabz/showcrate/src/pages/[username]/[project]/index.astro)
Project overview page. Uses `ProjectLayout`.

---

### 4. Docs Layout — Sidebar + Content

Properly built docs viewer layout, replacing the current stub.

#### [MODIFY] [DocsLayout.astro](file:///d:/projects/ethanlabz/showcrate/src/layouts/DocsLayout.astro)
Full layout with BaseLayout wrapper. Two-column: sidebar navigation + content area. Mobile-responsive with collapsible sidebar.

#### [NEW] [DocsSidebar.tsx](file:///d:/projects/ethanlabz/showcrate/src/components/pages/docs/DocsSidebar.tsx)
Left sidebar with project name, doc page tree navigation, active state highlighting.

#### [NEW] [DocsContent.tsx](file:///d:/projects/ethanlabz/showcrate/src/components/pages/docs/DocsContent.tsx)
Main content area with typography styles, table of contents, prev/next navigation.

#### [MODIFY] [[...slug].astro](file:///d:/projects/ethanlabz/showcrate/src/pages/[username]/[project]/docs/[...slug].astro)
Update to use the new DocsLayout properly, pass sidebar data and content.

---

### 5. Shared Components

#### [NEW] [AppHeader.tsx](file:///d:/projects/ethanlabz/showcrate/src/components/app/AppHeader.tsx)
Authenticated app header. Logo, search input, notification bell, user menu dropdown. Used by AppLayout and ProjectLayout.

#### [NEW] [UserMenu.tsx](file:///d:/projects/ethanlabz/showcrate/src/components/app/UserMenu.tsx)
User avatar dropdown: Profile, Settings, Sign out.

#### [NEW] [MobileBottomNav.tsx](file:///d:/projects/ethanlabz/showcrate/src/components/app/MobileBottomNav.tsx)
Mobile bottom tab bar for authenticated views.

---

## User Review Required

> [!IMPORTANT]
> **Design token alignment**: The existing `LandingLayout.astro` footer uses shadcn token names (`primary`, `muted-foreground`, `card`, `foreground`) which don't directly map to your `global.css` tokens (`accent`, `text-muted`, `surface`, `text`). I'll update the footer to use your custom tokens consistently. Some shadcn components (Button, DropdownMenu) may still reference shadcn tokens — I'll leave those as-is since shadcn has its own CSS variable mapping.

> [!IMPORTANT]
> **Dark-first approach**: MineKeep is dark-only. Your tokens support both light and dark modes. I'll design dark-first (default dark class on landing) but preserve the light mode toggle for authenticated views. Let me know if you want dark-only everywhere.

## Open Questions

1. **Editor functionality scope**: Should the editor components be fully wired to CodeMirror with live editing, or is the layout/UI shell sufficient for now (with CodeMirror integration as a follow-up)?

2. **Landing page content**: I'll use the README tagline ("Every project deserves a stage") and feature descriptions from the project context. Should I use any specific copy/content, or is placeholder content acceptable?

3. **Missing pages**: The footer links to `/features`, `/pricing`, `/blog`, `/guides`, `/community`, `/changelog`, `/terms`, `/privacy`, `/security`, `/contact` — none of these exist. Should I create placeholder pages, or leave the links as-is?

---

## Verification Plan

### Automated Tests
```bash
npm run build
```
Ensures all Astro pages compile, all imports resolve, and no TypeScript errors.

### Manual Verification
- Run `npm run dev` and visually verify:
  - Landing page scroll narrative with animations
  - Editor layout panel behavior (sidebar toggle, tab switching)
  - Project overview page structure
  - Docs layout sidebar navigation
  - Responsive behavior on mobile viewport
  - Dark/light theme toggle
