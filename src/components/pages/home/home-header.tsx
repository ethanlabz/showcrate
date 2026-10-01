import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import MobileNav from '@/components/pages/home/mobile-nav';

const navLinks = [
  { href: '/showcase', label: 'Showcase' },
  { href: '/templates', label: 'Templates' },
  { href: '/about', label: 'About' },
  { href: '/playground', label: 'Playground' },
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
}

export function Header({ currentPath }: Props) {
  return (
    <>
      {/* Universal Top Header (Visible everywhere) */}
      <div className='fixed top-0 z-50 w-full pointer-events-none transition-all duration-500'>
        <header className='pointer-events-auto mx-auto w-full max-w-screen border-b border-border/40 bg-background/95 backdrop-blur-xl supports-backdrop-filter:bg-background/60 transition-all duration-500'>
          <div className='w-full mx-auto px-4 sm:px-6 lg:px-8 flex h-16 items-center justify-between'>
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

            {/* Desktop Global Actions: Static Dashboard CTA + Log in + Sign up */}
            <div className='flex items-center justify-end space-x-2 sm:space-x-3'>
              <ThemeToggle />

              <a href='/auth/login' className='hidden sm:inline-block'>
                <Button size='sm' variant='ghost' className='text-xs font-medium'>
                  Log in
                </Button>
              </a>

              <a href='/auth/signup' className='hidden sm:inline-block'>
                <Button size='sm' variant='outline' className='text-xs font-medium'>
                  Sign up
                </Button>
              </a>

              <a href='/dashboard'>
                <Button
                  size='sm'
                  className='bg-[#C9A96A] text-[#14161B] hover:bg-[#C9A96A]/90 text-xs font-semibold px-4'
                >
                  Dashboard
                </Button>
              </a>
            </div>
          </div>
        </header>
      </div>

      {/* Mobile Floating Bottom Dock (hidden on tablet and desktop) */}
      <MobileNav
        navLinks={navLinks}
        currentPath={currentPath}
      />
    </>
  );
}
