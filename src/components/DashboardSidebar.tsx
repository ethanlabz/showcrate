'use client';

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from '@/components/ui/sidebar';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  FolderKanban,
  Plus,
  Bell,
  FileCode2,
  AlertTriangle,
  ExternalLink,
  User as UserIcon,
  Shield,
  ShieldAlert,
  LogOut,
  ChevronsUpDown,
  Search,
} from 'lucide-react';

export interface DashboardViewer {
  displayName?: string | null;
  email: string;
  avatarUrl?: string | null;
  username?: string | null;
  platformRole?: string;
}

export interface ActiveProject {
  id: string;
  name: string;
  slug: string;
  published: boolean;
}

export interface DashboardSidebarProps {
  viewer: DashboardViewer;
  activeProject?: ActiveProject | null;
  currentPath: string;
  onOpenSearch?: () => void;
  className?: string;
}

export function DashboardSidebar({
  viewer,
  activeProject,
  currentPath,
  onOpenSearch,
  className,
}: DashboardSidebarProps) {
  const isPathActive = (href: string, exact = false) => {
    if (exact) return currentPath === href;
    return currentPath === href || currentPath.startsWith(href + '/');
  };

  const displayName = viewer.displayName || viewer.username || viewer.email.split('@')[0];
  const avatarUrl =
    viewer.avatarUrl ||
    `https://api.dicebear.com/10.x/shapes/svg?seed=${viewer.username || viewer.email}`;

  const isPlatformStaff =
    viewer.platformRole === 'admin' || viewer.platformRole === 'developer';

  return (
    <Sidebar collapsible="icon" className={className}>
      {/* 1. Header with Icon */}
      <SidebarHeader className="flex p-3 items-center justify-center border-b border-border">
        <a
          href="/"
          className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-foreground transition-colors"
          aria-label="Showcrate Home"
        >
          <div className="flex h-5 w-5 items-center justify-center rounded-lg text-accent">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 256 256"
              className="h-8 w-8 fill-none stroke-current"
            >
              <rect width="256" height="256" fill="none" />
              <line
                x1="208"
                y1="128"
                x2="128"
                y2="208"
                strokeWidth="20"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <line
                x1="192"
                y1="40"
                x2="40"
                y2="192"
                strokeWidth="20"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          {/* <span className="font-display font-bold text-lg tracking-tight text-accent group-data-[collapsible=icon]:hidden">
            Showcrate
          </span> */}
        </a>
      </SidebarHeader>

      <SidebarContent className="px-2 py-2 gap-4">
        {/* 2. Search Trigger */}
        <SidebarGroup className="p-0">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                onClick={onOpenSearch}
                tooltip="Search (⌘K)"
                className="w-full justify-between text-muted-foreground hover:text-foreground hover:bg-surface-raised rounded-sm transition-colors duration-300 px-2.5 h-9"
              >
                <div className="flex items-center gap-2">
                  <Search className="h-4 w-4 shrink-0" />
                  <span className="text-xs group-data-[collapsible=icon]:hidden">Search</span>
                </div>
                <kbd className="pointer-events-none hidden h-5 select-none items-center gap-1 rounded border border-border bg-surface px-1.5 font-mono text-[10px] font-medium opacity-100 group-data-[collapsible=icon]:hidden md:inline-flex">
                  ⌘K
                </kbd>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>

        {/* 3. Group App: Projects, New project, Notifications */}
        <SidebarGroup className="p-0">
          <SidebarGroupLabel className="text-[11px] font-semibold tracking-wider text-muted-foreground/80 uppercase px-2.5">
            App
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={currentPath === '/dashboard'}
                  tooltip="Projects"
                  render={<a href="/dashboard" />}
                >
                  <FolderKanban className="h-4 w-4" />
                  <span>Projects</span>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={isPathActive('/dashboard/new', true)}
                  tooltip="New project"
                  render={<a href="/dashboard/new" />}
                >
                  <Plus className="h-4 w-4" />
                  <span>New project</span>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={isPathActive('/dashboard/notifications', true)}
                  tooltip="Notifications"
                  render={<a href="/dashboard/notifications" />}
                >
                  <Bell className="h-4 w-4" />
                  <span>Notifications</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* 4. Group Project: Editor & Public Page */}
        {activeProject && (
          <SidebarGroup className="p-0">
            <SidebarGroupLabel className="text-[11px] font-semibold tracking-wider text-accent uppercase px-2.5 truncate">
              {activeProject.name}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    isActive={isPathActive(`/editor/${activeProject.id}`)}
                    tooltip="Editor"
                    render={<a href={`/editor/${activeProject.id}`} />}
                  >
                    <FileCode2 className="h-4 w-4" />
                    <span>Editor</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>

                {viewer.username && (
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      tooltip="View public page"
                      render={
                        <a
                          href={`/${viewer.username}/${activeProject.slug}`}
                          target="_blank"
                          rel="noreferrer"
                        />
                      }
                    >
                      <ExternalLink className="h-4 w-4" />
                      <span>View public page</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* 5. Group Settings: Profile, Account, Notifications, Appearance, Danger */}
        <SidebarGroup className="p-0">
          <SidebarGroupLabel className="text-[11px] font-semibold tracking-wider text-muted-foreground/80 uppercase px-2.5">
            Settings
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={isPathActive('/dashboard/settings/profile', true)}
                  tooltip="Profile"
                  render={<a href="/dashboard/settings/profile" />}
                >
                  <UserIcon className="h-4 w-4" />
                  <span>Profile</span>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={isPathActive('/dashboard/settings/account', true)}
                  tooltip="Account"
                  render={<a href="/dashboard/settings/account" />}
                >
                  <Shield className="h-4 w-4" />
                  <span>Account</span>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={isPathActive('/dashboard/settings/danger', true)}
                  tooltip="Danger zone"
                  render={<a href="/dashboard/settings/danger" />}
                  className="text-destructive hover:bg-destructive/10 hover:text-destructive group-hover/menu-button:text-destructive [&_svg]:text-destructive"
                >
                  <AlertTriangle className="h-4 w-4" />
                  <span>Danger zone</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* 6. Admin link: Rendered only when admin or developer */}
        {isPlatformStaff && (
          <SidebarGroup className="p-0">
            <SidebarGroupLabel className="text-[11px] font-semibold tracking-wider text-accent uppercase px-2.5">
              Admin
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    isActive={isPathActive('/admin')}
                    tooltip="Admin panel"
                    render={<a href="/admin" />}
                  >
                    <ShieldAlert className="h-4 w-4 text-accent" />
                    <span>Admin panel</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      {/* 7. Footer user chip with Dropdown Menu */}
      <SidebarFooter className="border-t border-border/40 p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <SidebarMenuButton
                    size="lg"
                    className="data-[state=open]:bg-surface-raised data-[state=open]:text-foreground"
                  />
                }
              >
                <img
                  src={avatarUrl}
                  alt={displayName}
                  className="h-8 w-8 rounded-full border border-border object-cover"
                />
                <div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
                  <span className="truncate font-semibold text-foreground">{displayName}</span>
                  <span className="truncate text-xs text-muted-foreground">{viewer.email}</span>
                </div>
                <ChevronsUpDown className="ml-auto h-4 w-4 text-muted-foreground group-data-[collapsible=icon]:hidden" />
              </DropdownMenuTrigger>

              <DropdownMenuContent
                className="w-56 rounded-lg bg-surface border border-border/60 shadow-xl"
                side="top"
                align="start"
                sideOffset={8}
              >
                {viewer.username && (
                  <DropdownMenuItem
                    render={
                      <a
                        href={`/${viewer.username}`}
                        className="flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-surface-raised cursor-pointer"
                      />
                    }
                  >
                    <UserIcon className="h-4 w-4 text-accent" />
                    <span>Public profile</span>
                  </DropdownMenuItem>
                )}

                <DropdownMenuSeparator className="bg-border/40 my-1" />

                {/* Log out must be a POST form to /auth/logout */}
                <form action="/auth/logout" method="POST" className="w-full m-0 p-0">
                  <DropdownMenuItem
                    variant="destructive"
                    render={
                      <button
                        type="submit"
                        className="flex w-full items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-destructive/10 rounded cursor-pointer transition-colors"
                      />
                    }
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </form>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
