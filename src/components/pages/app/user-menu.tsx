import * as React from 'react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

import {
  Brush,
  ChevronRight,
  LogOut,
  LucideBookMarked,
  Settings2,
  User,
} from 'lucide-react';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import {
  Menu,
  MenuTrigger,
  MenuPanel,
  MenuGroup,
  MenuGroupLabel,
  MenuItem,
  MenuSeparator,
} from '@/components/animate-ui/components/base/menu';
import { Kbd, KbdGroup } from '@/components/ui/kbd';

interface User {
  username?: string | null;
  email: string;
  avatarUrl?: string | null;
}

interface UserMenuProps {
  user: User;
}

export function UserMenu({ user }: UserMenuProps) {
  const displayName = user.username || user.email;
  const initial = displayName.charAt(0).toUpperCase();
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      localStorage.clear();
      sessionStorage.clear();
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
    } catch {
      // Even if the request fails, redirect to clear client state
    }
    window.location.href = '/';
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant='ghost'
            className='relative h-8 w-8 rounded-full border border-border p-0'
          >
            <Avatar className='h-8 w-8'>
              <AvatarImage
                src={
                  user.avatarUrl ||
                  `https://api.dicebear.com/10.x/waves/svg?seed=${displayName}`
                }
                alt={displayName}
              />
              <AvatarFallback>{initial}</AvatarFallback>
            </Avatar>
          </Button>
        }
      />
      <DropdownMenuContent className='w-60' align='start' sideOffset={25}>
        <DropdownMenuGroup>
          <DropdownMenuLabel>
            <div className='flex gap-3'>
              <Avatar className='h-8 w-8'>
                <AvatarImage
                  src={
                    user.avatarUrl ||
                    `https://api.dicebear.com/10.x/waves/svg?seed=${displayName}`
                  }
                  alt={displayName}
                />
                <AvatarFallback>{initial}</AvatarFallback>
              </Avatar>
              <div className='flex flex-col space-y-1'>
                <p className='text-sm text-foreground font-bold leading-none'>
                  {user.username}
                </p>
                <p className='text-xs leading-none text-muted-foreground'>
                  {user.email}
                </p>
              </div>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem render={<a href={`/${user.username}`}>Profile</a>}>
            <DropdownMenuShortcut>
              <Kbd></Kbd>
            </DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuItem
            render={<a href={`/${user.username}?tab=projects`}>Projects</a>}
          />
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem render={<a href='/settings/profile'>Settings</a>} />
          <DropdownMenuItem render={<a href='/settings/appearance'>Appearance</a>} />
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem
            variant='destructive'
            className='cursor-pointer flex gap-2 items-center'
            disabled={loggingOut}
            onClick={handleLogout}
          >
            Log out
            <DropdownMenuShortcut>⇧⌘Q</DropdownMenuShortcut>
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
