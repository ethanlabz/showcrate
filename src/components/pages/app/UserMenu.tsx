import * as React from 'react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

import { Brush, ChevronRight, LogOut, LucideBookMarked, Settings2, User } from 'lucide-react';

import {
  Menu,
  MenuTrigger,
  MenuPanel,
  MenuGroup,
  MenuGroupLabel,
  MenuItem,
  MenuSeparator,
} from '@/components/animate-ui/components/base/menu';

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
    <Menu>
      <MenuTrigger
        render={
          <Button
            variant='ghost'
            className='relative h-8 w-8 rounded-full border border-border p-0'
          >
            <Avatar className='h-7 w-7'>
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
      <MenuPanel className='w-56' align='end'>
        <MenuGroup>
          <MenuGroupLabel className='font-normal'>
            <div className='flex gap-3'>
              <Avatar className='h-7 w-7'>
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
                <p className='text-sm font-medium leading-none'>
                  {user.username}
                </p>
                <p className='text-xs leading-none text-muted-foreground'>
                  {user.email}
                </p>
              </div>
            </div>
          </MenuGroupLabel>
        </MenuGroup>
        <MenuSeparator />
        <MenuItem>
          <a
            href={`/${user.username}`}
            className='cursor-pointer flex gap-2 items-center'
          >
            <User />
            Profile
          </a>
        </MenuItem>
        <MenuItem>
          <a
            href={`/${user.username}?tab=projects`}
            className='cursor-pointer flex gap-2 items-center'
          >
            <LucideBookMarked />
            Projects
          </a>
        </MenuItem>
        <MenuSeparator />
        <MenuGroup>
          <MenuItem>
            <a href='/settings/profile' className='cursor-pointer flex gap-2 items-center'>
            <Settings2 />
              Settings
            </a>
          </MenuItem>
          <MenuItem>
            <a href='/settings/appearance' className='cursor-pointer flex gap-2 items-center'>
            <Brush />
              Appearance
            </a>
          </MenuItem>
        </MenuGroup>
        <MenuSeparator />
        <MenuItem
          variant='destructive'
          className='cursor-pointer flex gap-2 items-center'
          disabled={loggingOut}
          onClick={handleLogout}
        >
          <LogOut />
          Log out
        </MenuItem>
      </MenuPanel>
    </Menu>
  );
}
