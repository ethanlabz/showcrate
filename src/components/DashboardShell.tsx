'use client';

import * as React from 'react';
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import {
  DashboardSidebar,
  type DashboardViewer,
  type ActiveProject,
} from '@/components/DashboardSidebar';
import {
  FolderKanban,
  Plus,
  Bell,
  User as UserIcon,
  Shield,
  Palette,
  AlertTriangle,
  FileCode2,
  History,
  Settings,
  Eye,
  Users,
  Globe,
  Search,
  ExternalLink,
  ShieldAlert,
  X,
} from 'lucide-react';

export interface DashboardShellProps {
  viewer: DashboardViewer;
  activeProject?: ActiveProject | null;
  currentPath: string;
  pageTitle: string;
  headerTitle?: string;
  headerDescription?: string;
  iconName?: string;
  hideContentHeader?: boolean;
  defaultCollapsed?: boolean;
  maxWidth?: string;
  children: React.ReactNode;
}

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  user: UserIcon,
  profile: UserIcon,
  account: Shield,
  shield: Shield,
  bell: Bell,
  notifications: Bell,
  palette: Palette,
  appearance: Palette,
  danger: AlertTriangle,
  alert: AlertTriangle,
  folder: FolderKanban,
  projects: FolderKanban,
  plus: Plus,
  new: Plus,
  editor: FileCode2,
  history: History,
  versions: History,
  settings: Settings,
  visibility: Eye,
  collaborators: Users,
  seo: Globe,
  admin: ShieldAlert,
};

interface SearchItem {
  id: string;
  title: string;
  category: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

export function DashboardShell({
  viewer,
  activeProject,
  currentPath,
  pageTitle,
  headerTitle,
  headerDescription,
  iconName,
  hideContentHeader = false,
  defaultCollapsed = false,
  maxWidth = 'max-w-[720px]',
  children,
}: DashboardShellProps) {
  const [searchOpen, setSearchOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [selectedIndex, setSelectedIndex] = React.useState(0);
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Global ⌘K / Ctrl+K listener
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      } else if (e.key === 'Escape' && searchOpen) {
        e.preventDefault();
        setSearchOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [searchOpen]);

  // Focus input when search modal opens
  React.useEffect(() => {
    if (searchOpen) {
      setSearchQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [searchOpen]);

  // Prepare static searchable items
  const searchItems: SearchItem[] = React.useMemo(() => {
    const items: SearchItem[] = [
      { id: 'projects', title: 'Projects', category: 'App', href: '/dashboard', icon: FolderKanban },
      { id: 'new-project', title: 'New project', category: 'App', href: '/dashboard/new', icon: Plus },
      { id: 'notifications', title: 'Notifications', category: 'App', href: '/dashboard/notifications', icon: Bell },
      { id: 'settings-profile', title: 'Profile Settings', category: 'Settings', href: '/dashboard/settings/profile', icon: UserIcon },
      { id: 'settings-account', title: 'Account Settings', category: 'Settings', href: '/dashboard/settings/account', icon: Shield },
      { id: 'settings-notifications', title: 'Notification Settings', category: 'Settings', href: '/dashboard/settings/notifications', icon: Bell },
      { id: 'settings-appearance', title: 'Appearance Settings', category: 'Settings', href: '/dashboard/settings/appearance', icon: Palette },
      { id: 'settings-danger', title: 'Danger Zone', category: 'Settings', href: '/dashboard/settings/danger', icon: AlertTriangle },
    ];

    if (activeProject) {
      items.unshift(
        { id: 'project-editor', title: `${activeProject.name} — Editor`, category: 'Active Project', href: `/editor/${activeProject.id}`, icon: FileCode2 },
        { id: 'project-versions', title: `${activeProject.name} — Versions`, category: 'Active Project', href: `/dashboard/projects/${activeProject.id}/versions`, icon: History },
        { id: 'project-general', title: `${activeProject.name} — General Settings`, category: 'Active Project', href: `/dashboard/projects/${activeProject.id}/settings/general`, icon: Settings },
        { id: 'project-visibility', title: `${activeProject.name} — Visibility`, category: 'Active Project', href: `/dashboard/projects/${activeProject.id}/settings/visibility`, icon: Eye },
        { id: 'project-collab', title: `${activeProject.name} — Collaborators`, category: 'Active Project', href: `/dashboard/projects/${activeProject.id}/settings/collaborators`, icon: Users },
        { id: 'project-seo', title: `${activeProject.name} — SEO`, category: 'Active Project', href: `/dashboard/projects/${activeProject.id}/settings/seo`, icon: Globe },
        { id: 'project-danger', title: `${activeProject.name} — Danger Zone`, category: 'Active Project', href: `/dashboard/projects/${activeProject.id}/settings/danger`, icon: AlertTriangle },
      );

      if (activeProject.published && viewer.username) {
        items.push({
          id: 'project-public',
          title: `${activeProject.name} — View Public Page`,
          category: 'Active Project',
          href: `/${viewer.username}/${activeProject.slug}`,
          icon: ExternalLink,
        });
      }
    }

    if (viewer.platformRole === 'admin' || viewer.platformRole === 'developer') {
      items.push({ id: 'admin', title: 'Admin Panel', category: 'Staff', href: '/admin', icon: ShieldAlert });
    }

    return items;
  }, [activeProject, viewer]);

  // Filter items by query
  const filteredItems = React.useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return searchItems;
    return searchItems.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        item.href.toLowerCase().includes(q),
    );
  }, [searchItems, searchQuery]);

  // Handle arrow navigation in search modal
  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % (filteredItems.length || 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredItems.length) % (filteredItems.length || 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const selected = filteredItems[selectedIndex];
      if (selected) {
        window.location.href = selected.href;
      }
    }
  };

  const HeaderIcon = iconName ? ICON_MAP[iconName.toLowerCase()] : null;
  const resolvedHeaderTitle = headerTitle || pageTitle;

  return (
    <SidebarProvider
      defaultOpen={!defaultCollapsed}
      style={
        {
          '--sidebar': '#14161B',
          '--sidebar-foreground': '#EDEDED',
          '--sidebar-border': 'rgba(255, 255, 255, 0.08)',
          '--sidebar-accent': 'rgba(255, 255, 255, 0.06)',
          '--sidebar-accent-foreground': '#C9A96A',
          '--sidebar-ring': '#C9A96A',
        } as React.CSSProperties
      }
      className="min-h-screen bg-[#14161B] text-foreground font-sans"
    >
      {/* 1. Persistent Left Sidebar on Desktop / Offcanvas on Mobile */}
      <DashboardSidebar
        viewer={viewer}
        activeProject={activeProject}
        currentPath={currentPath}
        onOpenSearch={() => setSearchOpen(true)}
      />

      <SidebarInset className="min-h-screen bg-[#14161B] text-foreground flex flex-col flex-1">
        {/* 2. Mobile Header: Hidden on Desktop (md+) */}
        <header className="md:hidden sticky top-0 z-40 flex h-14 w-full items-center justify-between border-b border-border/40 bg-[#14161B]/95 px-4 backdrop-blur">
          <div className="flex w-10 items-center justify-start">
            <SidebarTrigger className="text-foreground hover:bg-surface-raised h-9 w-9" />
          </div>

          <div className="flex-1 text-center px-2 truncate">
            <span className="font-serif font-semibold text-sm tracking-tight text-foreground truncate block">
              {pageTitle}
            </span>
          </div>

          {/* Symmetrical placeholder for centered title */}
          <div className="w-10 flex items-center justify-end">
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="text-muted-foreground hover:text-foreground p-1.5 rounded-md"
              aria-label="Search"
            >
              <Search className="h-4 w-4" />
            </button>
          </div>
        </header>

        {/* 3. Content Pane */}
        <main className="flex-1 p-6 sm:p-8 lg:p-10 w-full overflow-y-auto">
          {!hideContentHeader && (
            <div className="mb-6">
              <div className="flex items-center gap-3">
                {HeaderIcon && (
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#C9A96A]/10 text-[#C9A96A] border border-[#C9A96A]/20 shrink-0">
                    <HeaderIcon className="h-5 w-5 text-[#C9A96A]" />
                  </div>
                )}
                <div>
                  <h1 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                    {resolvedHeaderTitle}
                  </h1>
                  {headerDescription && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {headerDescription}
                    </p>
                  )}
                </div>
              </div>
              <div className="mt-6 border-b border-border/40" />
            </div>
          )}

          <div className={`w-full ${maxWidth}`}>
            {children}
          </div>
        </main>
      </SidebarInset>

      {/* 4. Command Palette (⌘K) Modal */}
      {searchOpen && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 backdrop-blur-xs pt-16 sm:pt-24 px-4"
          onClick={() => setSearchOpen(false)}
        >
          <div
            className="relative w-full max-w-lg rounded-xl border border-border/60 bg-[#14161B] text-foreground shadow-2xl overflow-hidden animate-in fade-in-0 zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={handleSearchKeyDown}
          >
            <div className="flex items-center border-b border-border/40 px-3 py-2.5">
              <Search className="h-4 w-4 text-[#C9A96A] shrink-0 mr-2" />
              <input
                ref={inputRef}
                type="text"
                placeholder="Type a command or search..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setSelectedIndex(0);
                }}
                className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setSearchOpen(false)}
                className="text-muted-foreground hover:text-foreground p-1 rounded"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="max-h-72 overflow-y-auto p-2 space-y-1">
              {filteredItems.length === 0 ? (
                <div className="p-4 text-center text-xs text-muted-foreground">
                  No matching results found.
                </div>
              ) : (
                filteredItems.map((item, index) => {
                  const Icon = item.icon;
                  const isSelected = index === selectedIndex;
                  return (
                    <a
                      key={item.id}
                      href={item.href}
                      onMouseEnter={() => setSelectedIndex(index)}
                      className={`flex items-center justify-between gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                        isSelected
                          ? 'bg-surface-raised text-[#C9A96A]'
                          : 'text-foreground hover:bg-surface-raised/50'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <Icon className={`h-4 w-4 shrink-0 ${isSelected ? 'text-[#C9A96A]' : 'text-muted-foreground'}`} />
                        <span className="truncate">{item.title}</span>
                      </div>
                      <span className="text-[10px] uppercase font-mono tracking-wider text-muted-foreground/70 shrink-0">
                        {item.category}
                      </span>
                    </a>
                  );
                })
              )}
            </div>

            <div className="flex items-center justify-between border-t border-border/40 bg-surface/30 px-3 py-1.5 text-[11px] text-muted-foreground">
              <span>Navigate with ↑ ↓ and Enter</span>
              <span>ESC to close</span>
            </div>
          </div>
        </div>
      )}
    </SidebarProvider>
  );
}
