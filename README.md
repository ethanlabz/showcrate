<div align="center">

# ♠️ Showcrate ♠️

</div>

```md
Every project deserves a stage.
```

## About Showcrate

**Documentation that tells a story.** 
Stop writing boring walls of text. Showcrate brings your code to life with interactive, dynamic, and beautiful documentation. It turns standard markdown into a fully-fledged interactive playground. It's not just a documentation site; it's a live IDE in the browser.

## Features

- **Instant deployments:** Runs WebContainers directly in the user's browser securely.
- **File-system emulation:** Write to files, use Node.js APIs, and run package managers.
- **Shareable snippets:** Embed your live environments anywhere with one click.
- **Interactive Live Editor:** Code directly in your docs and see updates instantly.

## Tech Stack

Showcrate is built using modern web technologies:
- **Framework:** [Astro](https://astro.build/) & [React](https://react.dev/)
- **Styling:** [Tailwind CSS](https://tailwindcss.com/)
- **Animations:** [GSAP](https://gsap.com/) & [Lenis](https://lenis.studiofreight.com/) for smooth scrolling
- **Editor:** [CodeMirror](https://codemirror.net/)
- **Backend/Auth:** [Supabase](https://supabase.com/)
- **Syntax Highlighting:** [Shiki](https://shiki.style/)

## Architecture & Structure

Showcrate follows a modular structure leveraging Astro layouts and domain-driven components:

### Layouts (`src/layouts`)
- **`BaseLayout.astro`**: The root layout containing common head elements and base HTML structure.
- **`AppLayout.astro`**: Main application shell for logged-in users.
- **`AuthLayout.astro`**: Focused layout for authentication pages.
- **`DocsLayout.astro`**: Structure for documentation pages, often including sidebars and table of contents.
- **`EditorLayout.astro`**: Specialized layout for the interactive live editor interface.
- **`PublicLayout.astro`**: Optimized layout for landing and public pages with animations.
- **`ProjectLayout.astro`**: Layout for viewing and managing specific projects/crates.

### Components (`src/components`)
Components are organized by feature domain to keep the codebase maintainable:
- **`ui/`**: Reusable, generic UI components (e.g., buttons, dialogs, inputs) built with Radix/shadcn.
- **`app/`**: Components specific to the main application interface.
- **`docs/`**: Components for rendering documentation (e.g., code blocks, navigation).
- **`editor/`**: Components for the interactive IDE and WebContainer integration.
- **`public/`**: Components for landing pages, hero sections, and public-facing materials.
- **`ThemeToggle.tsx`**: A global component for switching between light and dark modes.

## Getting Started

1. **Clone the repository:**
   ```bash
   git clone <your-repo-url>
   cd showcrate
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Run the development server:**
   ```bash
   npm run dev
   ```
   Open `http://localhost:4321` to view it in the browser.

---

**Updates Overview:** [click here](OVERVIEW.md)

**Latest Fixes:** [click here](CHANGELOG.md)