import * as React from 'react';
import { Bell, Inbox, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { UserMenu } from './UserMenu';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface User {
  username?: string | null;
  email: string;
  avatarUrl?: string | null;
}

interface AppHeaderProps {
  user: User | null;
}

function Logo() {
  return (
    <a className='flex items-center space-x-2' href='/'>
      <svg
        xmlns='http://www.w3.org/2000/svg'
        viewBox='0 0 256 256'
        className='h-6 w-6 text-primary'
      >
        <rect width='256' height='256' fill='none'></rect>
        <line
          x1='208'
          y1='128'
          x2='128'
          y2='208'
          fill='none'
          stroke='currentColor'
          strokeLinecap='round'
          strokeLinejoin='round'
          strokeWidth='16'
        ></line>
        <line
          x1='192'
          y1='40'
          x2='40'
          y2='192'
          fill='none'
          stroke='currentColor'
          strokeLinecap='round'
          strokeLinejoin='round'
          strokeWidth='16'
        ></line>
      </svg>
      <span className='font-extrabold tracking-tight text-lg'>Dashboard</span>
    </a>
  );
}

export function AppHeader({ user }: AppHeaderProps) {
  const [open, setOpen] = React.useState(false);

  return (
    <>
      <div className='relative top-0 z-9999 w-full pointer-events-none transition-all duration-500'>
        <header className='pointer-events-auto mx-auto w-full max-w-screen border-b-2 border-border bg-background/95 backdrop-blur-xl supports-backdrop-filter:bg-background/60 transition-all duration-500'>
          <div className='w-full mx-auto px-4 sm:px-6 lg:px-8 flex h-16 items-center justify-between'>
            <div className='flex items-center gap-4'>
              <Logo />
            </div>

            <div className='flex items-center justify-end gap-2 sm:gap-2'>
              {/* new project */}
              <Tooltip>
                <TooltipTrigger
                  render={
                    <a
                      href='/new'
                      className='hidden md:flex text-muted-foreground hover:text-foreground items-center justify-center h-9 w-9 border-2 border-border rounded-md hover:bg-secondary-active transition-colors'
                    >
                      <Plus className='w-4 h-4' />
                    </a>
                  }
                />
                <TooltipContent>
                  <p>New Project</p>
                </TooltipContent>
              </Tooltip>

              {/* notifications */}
              <Tooltip>
                <TooltipTrigger
                  render={
                    <a
                      href='/notifications'
                      className='text-muted-foreground hover:text-foreground flex items-center justify-center h-9 w-9 border-2 border-border rounded-md hover:bg-secondary-active transition-colors'
                    >
                      <Inbox className='h-4 w-4' />
                      <span className='sr-only'>Notifications</span>
                    </a>
                  }
                />
                <TooltipContent>
                  <p>Notifications</p>
                </TooltipContent>
              </Tooltip>

              {user ? (
                <UserMenu user={user} />
              ) : (
                <a href='/auth/login' className='text-sm font-medium'>
                  Log in
                </a>
              )}
            </div>
          </div>
        </header>
      </div>
    </>
  );
}
