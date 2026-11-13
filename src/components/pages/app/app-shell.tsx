'use client';

import * as React from 'react';

import { AppSidebar } from './app-sidebar';
import { AppHeader } from './app-header';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';

interface User {
  username?: string | null;
  email: string;
  avatarUrl?: string | null;
}

interface AppShellProps {
  user: User | null;
  children?: React.ReactNode;
}

export function AppShell({ user, children }: AppShellProps) {
  // Map Astro user shape → AppSidebar's NavUser shape
  const sidebarUser = user
    ? {
        name: user.username ?? user.email,
        email: user.email,
        avatar:
          user.avatarUrl ??
          `https://api.dicebear.com/10.x/waves/svg?seed=${user.username ?? user.email}`,
      }
    : undefined;

  return (
    <SidebarProvider>
      <AppSidebar user={sidebarUser} />
      <SidebarInset>
        <AppHeader user={user} />
        <main className='flex-1 p-4'>{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
