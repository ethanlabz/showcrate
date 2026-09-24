import * as React from 'react';
import { Home, LayoutGrid, FileCode2, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import MobileNav from '@/components/pages/home/MobileNav';

const navLinks = [
  { href: '/showcase', label: 'Showcase' },
  { href: '/templates', label: 'Templates' },
  { href: '/about', label: 'About' },
];

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
      <span className='font-extrabold tracking-tight text-lg'>Showcrate</span>
    </a>
  );
}

interface Props {
  currentPath: string;
  user?: {
    username?: string | null;
    email: string;
    avatarUrl?: string | null;
  } | null;
}

export function Header({ currentPath, user }: Props) {
  return (
    <>
      {/* Universal Top Header (Visible everywhere) */}
      <div className='sticky top-0 z-9999 w-full pointer-events-none transition-all duration-500'>
        <header className='pointer-events-auto mx-auto w-full max-w-7xl border-b border-border/40 bg-background/95 backdrop-blur-xl supports-backdrop-filter:bg-background/60 transition-all duration-500 rounded-full'>
          <div className='w-full mx-auto px-4 sm:px-6 lg:px-8 lg:mt-4 flex h-16 items-center justify-between'>
            <div className='flex items-center gap-6'>
              <Logo />

              {/* Desktop Navigation Links (hidden on mobile) */}
              <nav className='hidden md:block lg:flex items-center gap-6 text-sm font-medium'>
                <div className='flex items-center gap-8'>
                  <ul className='hidden items-center gap-6 text-sm font-medium md:flex'>
                    {navLinks.map((link) => (
                      <li key={link.href}>
                        <a
                          href={link.href}
                          className='text-muted-foreground transition-colors hover:text-foreground duration-300 ease-in-out'
                          aria-current={
                            currentPath === link.href ? 'page' : undefined
                          }
                        >
                          {link.label}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              </nav>
            </div>

            {/* Universal Global Actions */}
            <div className='flex items-center justify-end space-x-2 sm:space-x-4'>
              <ThemeToggle />
              {user ? (
                <a href='/dashboard'>
                  <Button
                    size='sm'
                    className='shadow-md shadow-primary/20 sm:px-6 sm:h-9 h-8 text-xs sm:text-sm rounded-full'
                  >
                    Dashboard
                  </Button>
                </a>
              ) : (
                <>
                  <a
                    href='/auth/login'
                    className='text-sm font-medium transition-colors hover:text-primary hidden sm:inline-block rounded-full'
                  >
                    Log in
                  </a>
                  <a href='/auth/signup'>
                    <Button
                      size='sm'
                      className='shadow-md shadow-primary/20 sm:px-6 sm:h-9 h-8 text-xs sm:text-sm rounded-full'
                    >
                      Sign up
                    </Button>
                  </a>
                </>
              )}
            </div>
          </div>
        </header>
      </div>

      {/* tablet will be same as Desktop for HomeLayout */}

      {/* Mobile Floating Bottom Dock (hidden on tablet and desktop) */}
      <MobileNav
        navLinks={navLinks}
        currentPath={currentPath}
        data-lenis-prevent
      />
    </>
  );
}
