'use client';

import * as React from 'react';

import { NavMain } from '@/components/pages/app/sidebar/nav-main';
import { NavSecondary } from '@/components/pages/app/sidebar/nav-secondary';
import { NavUser } from '@/components/pages/app/sidebar/nav-user';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import {
  LayoutDashboardIcon,
  FolderKanbanIcon,
  LayoutTemplateIcon,
  TerminalSquareIcon,
  GlobeIcon,
  BellIcon,
  BookOpenIcon,
  UsersIcon,
  MailIcon,
  SlashIcon,
} from 'lucide-react';

const navMain = [
  {
    title: 'Home',
    url: '/dashboard',
    icon: <LayoutDashboardIcon />,
    isActive: true,
  },
  {
    title: 'Projects',
    url: '/dashboard',
    icon: <FolderKanbanIcon />,
    items: [
      { title: 'All Projects', url: '/dashboard' },
      { title: 'New Project', url: '/dashboard/new' },
    ],
  },
  {
    title: 'Templates',
    url: '/templates',
    icon: <LayoutTemplateIcon />,
  },
  {
    title: 'Playground',
    url: '/playground',
    icon: <TerminalSquareIcon />,
  },
  {
    title: 'Showcase',
    url: '/showcase',
    icon: <GlobeIcon />,
  },
  {
    title: 'Notifications',
    url: '/dashboard/notifications',
    icon: <BellIcon />,
  },
];

const navSecondary = [
  {
    title: 'Docs',
    url: '/docs',
    icon: <BookOpenIcon />,
  },
  {
    title: 'Community',
    url: '/community',
    icon: <UsersIcon />,
  },
  {
    title: 'Contact',
    url: '/contact',
    icon: <MailIcon />,
  },
];

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  user?: {
    name: string;
    email: string;
    avatar: string;
  };
}

const defaultUser = {
  name: 'Guest',
  email: '',
  avatar: '',
};

export function AppSidebar({ user = defaultUser, ...props }: AppSidebarProps) {
  return (
    <Sidebar
      collapsible='icon'
      className='hidden md:flex'
      {...props}
    >
      {/* Header — Logo */}
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size='lg' render={<a href='/dashboard' />}>
              <div className='flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground'>
                <SlashIcon className='size-4' />
              </div>
              <div className='grid flex-1 text-left text-sm leading-tight'>
                <span className='truncate font-semibold'>Showcrate</span>
                <span className='truncate text-xs text-sidebar-foreground/60'>
                  Dashboard
                </span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      {/* Content */}
      <SidebarContent>
        <NavMain items={navMain} />
        <NavSecondary items={navSecondary} className='mt-auto' />
      </SidebarContent>

      {/* Footer — User */}
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
    </Sidebar>
  );
}
