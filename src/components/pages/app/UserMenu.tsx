import * as React from 'react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

import { User } from 'lucide-react';

import {
  Menu,
  MenuTrigger,
  MenuPanel,
  MenuGroup,
  MenuGroupLabel,
  MenuItem,
  MenuSeparator,
} from '@/components/animate-ui/components/base/menu';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

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

      <DropdownMenuContent className='w-56' align='end'>
        <DropdownMenuGroup>
          <DropdownMenuLabel>
            <div className='flex flex-col space-y-1'>
              <p className='text-sm font-medium leading-none'>
                {user.username}
              </p>
              <p className='text-xs leading-none text-muted-foreground'>
                {user.email}
              </p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuItem>
            <a href={`/${user.username ?? ''}`} className='flex gap-2'>
              <User />
              Profile
            </a>
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>

    // <Menu>
    //   <MenuTrigger
    //     render={
    //       <Button
    //         variant='ghost'
    //         className='relative h-8 w-8 rounded-full border border-border p-0'
    //       >
    //         <Avatar className='h-7 w-7'>
    //           <AvatarImage
    //             src={
    //               user.avatarUrl ||
    //               `https://api.dicebear.com/10.x/waves/svg?seed=${displayName}`
    //             }
    //             alt={displayName}
    //           />
    //           <AvatarFallback>{initial}</AvatarFallback>
    //         </Avatar>
    //       </Button>
    //     }
    //   />
    //   <MenuPanel className='w-56' align='end'>
    //     <MenuGroup>
    //       <MenuGroupLabel className='font-normal'>
    //         <div className='flex flex-col space-y-1'>
    //           <p className='text-sm font-medium leading-none'>
    //             {user.username}
    //           </p>
    //           <p className='text-xs leading-none text-muted-foreground'>
    //             {user.email}
    //           </p>
    //         </div>
    //       </MenuGroupLabel>
    //       <MenuItem>
    //         <a href={`/${user.username}`} className='cursor-pointer flex gap-2'>
    //           Profile
    //         </a>
    //       </MenuItem>
    //     </MenuGroup>
    //     <MenuSeparator />
    //     <MenuItem>
    //       <a href='/settings' className='cursor-pointer' />
    //       Settings
    //     </MenuItem>
    //     <MenuSeparator />
    //     <MenuItem
    //       variant='destructive'
    //       className='cursor-pointer'
    //       disabled={loggingOut}
    //       onClick={handleLogout}
    //     >
    //       {loggingOut ? 'Logging out...' : 'Log out'}
    //     </MenuItem>
    //   </MenuPanel>
    // </Menu>
  );
}
