# File Tree: showcrate
# Astro + React + TailwindCSS + ShadCN + Supabase project scaffold

```
├── public
│   ├── favicon.ico
│   ├── favicon.svg
│   └── robots.txt
├── src
│   ├── components
│   │   ├── animate-ui
│   │   │   ├── components
│   │   │   │   ├── animate
│   │   │   │   │   ├── avatar-group.tsx
│   │   │   │   │   └── cursor.tsx
│   │   │   │   ├── base
│   │   │   │   │   ├── alert-dialog.tsx
│   │   │   │   │   ├── checkbox.tsx
│   │   │   │   │   └── menu.tsx
│   │   │   │   └── buttons
│   │   │   │       └── button.tsx
│   │   │   └── primitives
│   │   │       ├── animate
│   │   │       │   ├── avatar-group.tsx
│   │   │       │   ├── cursor.tsx
│   │   │       │   └── slot.tsx
│   │   │       ├── base
│   │   │       │   ├── alert-dialog.tsx
│   │   │       │   ├── checkbox.tsx
│   │   │       │   └── menu.tsx
│   │   │       ├── buttons
│   │   │       │   └── button.tsx
│   │   │       └── effects
│   │   │           └── highlight.tsx
│   │   ├── bg
│   │   │   ├── LightRays.tsx
│   │   │   └── SideRays.tsx
│   │   ├── editor
│   │   │   └── EditorWorkspace.tsx
│   │   ├── pages
│   │   │   ├── app
│   │   │   │   ├── sidebar
│   │   │   │   │   ├── nav-main.tsx
│   │   │   │   │   ├── nav-projects.tsx
│   │   │   │   │   ├── nav-secondary.tsx
│   │   │   │   │   └── nav-user.tsx
│   │   │   │   ├── Dashboard.astro
│   │   │   │   ├── activities.tsx
│   │   │   │   ├── app-header.tsx
│   │   │   │   ├── app-shell.tsx
│   │   │   │   ├── app-sidebar.tsx
│   │   │   │   ├── mobile-bottom-nav.tsx
│   │   │   │   ├── projects.tsx
│   │   │   │   └── user-menu.tsx
│   │   │   ├── auth
│   │   │   │   ├── forgot-password-form.tsx
│   │   │   │   ├── login-form.tsx
│   │   │   │   ├── reset-password-form.tsx
│   │   │   │   ├── signup-form.tsx
│   │   │   │   └── social-username-form.tsx
│   │   │   ├── docs
│   │   │   │   ├── docs-mobile-nav.tsx
│   │   │   │   └── docs-search.tsx
│   │   │   ├── home
│   │   │   │   ├── contact-form.tsx
│   │   │   │   ├── glass-card.tsx
│   │   │   │   ├── gradient-heading.tsx
│   │   │   │   ├── home-header.tsx
│   │   │   │   ├── interactive-editor.tsx
│   │   │   │   ├── mobile-nav.tsx
│   │   │   │   ├── showcase-directory.tsx
│   │   │   │   └── timeline.tsx
│   │   │   ├── playground
│   │   │   │   └── playground-editor.tsx
│   │   │   └── settings
│   │   │       └── UsernameSettingsSection.tsx
│   │   ├── ui
│   │   │   ├── avatar.tsx
│   │   │   ├── breadcrumb.tsx
│   │   │   ├── button-group.tsx
│   │   │   ├── button.tsx
│   │   │   ├── collapsible.tsx
│   │   │   ├── drawer.tsx
│   │   │   ├── dropdown-menu.tsx
│   │   │   ├── empty.tsx
│   │   │   ├── field.tsx
│   │   │   ├── input-group.tsx
│   │   │   ├── input-otp.tsx
│   │   │   ├── input.tsx
│   │   │   ├── kbd.tsx
│   │   │   ├── label.tsx
│   │   │   ├── separator.tsx
│   │   │   ├── sheet.tsx
│   │   │   ├── sidebar.tsx
│   │   │   ├── skeleton.tsx
│   │   │   ├── textarea.tsx
│   │   │   ├── theme-toggle.tsx
│   │   │   └── tooltip.tsx
│   │   ├── CardSwap.tsx
│   │   ├── DashboardShell.tsx
│   │   └── DashboardSidebar.tsx
│   ├── hooks
│   │   ├── use-controlled-state.tsx
│   │   ├── use-data-state.tsx
│   │   └── use-mobile.ts
│   ├── layouts
│   │   ├── 00__ARCHITECTURE.md
│   │   ├── AppLayout.astro
│   │   ├── AuthLayout.astro
│   │   ├── BaseLayout.astro
│   │   ├── Docs.astro
│   │   ├── Editor.astro
│   │   ├── EditorLayout.astro
│   │   ├── HomeLayout.astro
│   │   └── ProjectLayout.astro
│   ├── lib
│   │   ├── api
│   │   │   ├── async-handler.ts
│   │   │   ├── rate-limiter.ts
│   │   │   └── response.ts
│   │   ├── auth
│   │   │   └── safe-next.ts
│   │   ├── config
│   │   │   └── unified-config.ts
│   │   ├── repositories
│   │   │   ├── AnalyticsRepository.ts
│   │   │   ├── AuditLogRepository.ts
│   │   │   ├── CollaboratorRepository.ts
│   │   │   ├── DocPageRepository.ts
│   │   │   ├── NotificationRepository.ts
│   │   │   ├── ProjectRepository.ts
│   │   │   ├── ReportRepository.ts
│   │   │   └── UserRepository.ts
│   │   ├── routing
│   │   │   ├── generate-slug.ts
│   │   │   └── resolve-canonical.ts
│   │   ├── services
│   │   │   ├── adminService.ts
│   │   │   ├── analyticsService.ts
│   │   │   ├── authService.ts
│   │   │   ├── collaboratorService.ts
│   │   │   ├── docService.ts
│   │   │   ├── emailService.ts
│   │   │   ├── notificationService.ts
│   │   │   ├── projectService.ts
│   │   │   └── storageService.ts
│   │   ├── supabase
│   │   │   ├── client.ts
│   │   │   └── server.ts
│   │   ├── validators
│   │   │   ├── admin.schema.ts
│   │   │   ├── auth.schema.ts
│   │   │   ├── collaborator.schema.ts
│   │   │   ├── doc-page.schema.ts
│   │   │   ├── project.schema.ts
│   │   │   ├── report.schema.ts
│   │   │   ├── upload.schema.ts
│   │   │   └── user.schema.ts
│   │   ├── get-strict-context.tsx
│   │   ├── render-markdown.ts
│   │   └── utils.ts
│   ├── middleware
│   │   ├── auth-guard.ts
│   │   ├── index.ts
│   │   ├── project-resolver.ts
│   │   └── rate-limit.ts
│   ├── pages
│   │   ├── [username]
│   │   │   ├── [project]
│   │   │   │   ├── docs
│   │   │   │   │   ├── [slug].astro
│   │   │   │   │   └── index.astro
│   │   │   │   └── index.astro
│   │   │   └── index.astro
│   │   ├── api
│   │   │   ├── account
│   │   │   │   ├── username
│   │   │   │   │   └── available.ts
│   │   │   │   └── username.ts
│   │   │   ├── admin
│   │   │   │   ├── projects
│   │   │   │   │   └── index.ts
│   │   │   │   ├── reports
│   │   │   │   │   ├── [reportId].ts
│   │   │   │   │   └── index.ts
│   │   │   │   ├── showcase
│   │   │   │   │   └── [projectId].ts
│   │   │   │   ├── templates
│   │   │   │   │   └── index.ts
│   │   │   │   ├── users
│   │   │   │   │   ├── [userId].ts
│   │   │   │   │   └── index.ts
│   │   │   │   ├── logs.ts
│   │   │   │   └── telemetry.ts
│   │   │   ├── auth
│   │   │   │   ├── delete-account.ts
│   │   │   │   ├── forgot-password.ts
│   │   │   │   ├── login.ts
│   │   │   │   ├── logout.ts
│   │   │   │   ├── oauth.ts
│   │   │   │   ├── reset-password.ts
│   │   │   │   ├── set-username.ts
│   │   │   │   └── signup.ts
│   │   │   ├── editor
│   │   │   │   ├── pages
│   │   │   │   │   └── [id].ts
│   │   │   │   ├── trash.ts
│   │   │   │   └── tree.ts
│   │   │   ├── notifications
│   │   │   │   └── index.ts
│   │   │   ├── projects
│   │   │   │   ├── [projectId]
│   │   │   │   │   ├── collaborators
│   │   │   │   │   │   ├── [colId].ts
│   │   │   │   │   │   ├── accept.ts
│   │   │   │   │   │   └── index.ts
│   │   │   │   │   ├── pages
│   │   │   │   │   │   ├── [pageId].ts
│   │   │   │   │   │   ├── index.ts
│   │   │   │   │   │   └── reorder.ts
│   │   │   │   │   ├── versions
│   │   │   │   │   │   └── [pageId].ts
│   │   │   │   │   ├── analytics.ts
│   │   │   │   │   ├── index.ts
│   │   │   │   │   ├── publish.ts
│   │   │   │   │   └── view.ts
│   │   │   │   └── index.ts
│   │   │   ├── reports
│   │   │   │   └── index.ts
│   │   │   ├── search
│   │   │   │   ├── docs.ts
│   │   │   │   └── showcase.ts
│   │   │   ├── upload
│   │   │   │   ├── avatar.ts
│   │   │   │   └── cover.ts
│   │   │   └── users
│   │   │       └── [username]
│   │   │           └── profile.ts
│   │   ├── auth
│   │   │   ├── callback.astro
│   │   │   ├── forgot-password.astro
│   │   │   ├── login.astro
│   │   │   ├── logout.ts
│   │   │   ├── reset-password.astro
│   │   │   └── signup.astro
│   │   ├── dashboard
│   │   │   ├── projects
│   │   │   │   └── [id]
│   │   │   │       ├── settings
│   │   │   │       │   ├── collaborators.astro
│   │   │   │       │   ├── danger.astro
│   │   │   │       │   ├── general.astro
│   │   │   │       │   ├── seo.astro
│   │   │   │       │   └── visibility.astro
│   │   │   │       └── versions.astro
│   │   │   ├── settings
│   │   │   │   ├── account.astro
│   │   │   │   ├── appearance.astro
│   │   │   │   ├── danger.astro
│   │   │   │   ├── notifications.astro
│   │   │   │   └── profile.astro
│   │   │   ├── index.astro
│   │   │   ├── new.astro
│   │   │   └── notifications.astro
│   │   ├── editor
│   │   │   └── [projectId]
│   │   │       └── [...page].astro
│   │   ├── about.astro
│   │   ├── blog.astro
│   │   ├── changelog.astro
│   │   ├── community.astro
│   │   ├── contact.astro
│   │   ├── features.astro
│   │   ├── guides.astro
│   │   ├── index.astro
│   │   ├── playground.astro
│   │   ├── privacy.astro
│   │   ├── security.astro
│   │   ├── showcase.astro
│   │   ├── templates.astro
│   │   └── terms.astro
│   ├── styles
│   │   ├── themes
│   │   │   ├── cobalt-glacier.css
│   │   │   ├── gold.css
│   │   │   ├── midnight-amethyst.css
│   │   │   ├── purple.css
│   │   │   ├── sage-pine.css
│   │   │   └── terracota-charcoal.css
│   │   ├── global.css
│   │   └── shadcn.css
│   ├── types
│   │   ├── auth.ts
│   │   └── database.ts
│   └── instrument.ts
├── supabase
│   ├── migrations
│   │   ├── 001_initial_schema.sql
│   │   ├── 002_rls_policies.sql
│   │   ├── 003_indexes.sql
│   │   ├── 004_storage_buckets.sql
│   │   ├── 005_oauth_username_support.sql
│   │   └── 006_editor_tree_and_username_redirects.sql
│   └── tests
│       └── doc_tree_and_username.test.sql
├── test-results
│   └── .last-run.json
├── tests
│   ├── auth-routing.test.ts
│   ├── resolve-canonical.test.ts
│   └── tree-and-username.test.ts
├── .env.example
├── .gitignore
├── .prettierrc.json
├── README.md
├── astro.config.mjs
├── components.json
├── package.json
└── tsconfig.json
```