import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import ScrollReveal, {
  ScrollRevealGroup,
} from '@/components/animations/ScrollReveal';
import { Shine } from '@animate-ui/react/primitives/effects/shine';

// ====================================================================================================

const navLinks = [
  { label: 'Showcase', href: '/showcase' },
  { label: 'Templates', href: '/templates' },
  { label: 'About', href: '/about' },
  { label: 'Playground', href: '/playground' },
];

function RightAccess() {
  return (
    <>
      {/* desktop viewport */}
      <ScrollRevealGroup
        delay={1.3}
        stagger={0.3}
        className='flex items-center justify-center gap-2'
      >
        <ScrollReveal as='a' href='/auth/login' direction='none'>
          <Shine asChild enable loop loopDelay={10}>
            <Button variant='ghost'>Sign in</Button>
          </Shine>
        </ScrollReveal>
        <ScrollReveal as='a' href='/auth/signup' direction='none'>
          <Shine asChild enableOnHover loop>
            <Button>Sign up</Button>
          </Shine>
        </ScrollReveal>
        <ScrollReveal as='span' direction='none'>
          <ThemeToggle />
        </ScrollReveal>
      </ScrollRevealGroup>
    </>
  );
}

// ====================================================================================================
// ====================================================================================================

interface Props {
  currentPath: string;
}

export function Header({ currentPath }: Props) {
  return (
    <ScrollReveal
      direction='down'
      delay={1}
      className='absolute top-0 z-100 flex items-center justify-center w-full backdrop-blur-xs'
    >
      <div className='py-4 px-4 md:px-0 w-full max-w-7xl'>
        <div className='flex items-center justify-between'>
          <div className='flex items-center justify-center space-x-4'>
            {/* Logo */}
            <ScrollReveal
              as='a'
              href='/'
              direction='down'
              className='group font-display font-bold lg:text-lg'
            >
              Showcrate
            </ScrollReveal>

            {/* Navigation */}
            <nav className='hidden md:flex'>
              <ScrollRevealGroup
                delay={1.6}
                stagger={0.08}
                as='ul'
                className='flex items-center space-x-1'
              >
                {navLinks.map((link) => (
                  <ScrollReveal
                    as='li'
                    direction='down'
                    key={link.href}
                    className='group px-3 py-1.5 hover:bg-accent/10 rounded-sm transition-colors duration-500 ease-in-out cursor-pointer'
                  >
                    <a
                      href={link.href}
                      aria-current={
                        currentPath === link.href ? 'page' : undefined
                      }
                      className='font-sans text-sm group-hover:text-accent aria-[current=page]:text-accent transition-colors duration-500 ease-in-out'
                    >
                      {link.label}
                    </a>
                  </ScrollReveal>
                ))}
              </ScrollRevealGroup>
            </nav>
          </div>

          {/* Authentication Buttons */}
          <RightAccess />
        </div>
      </div>
    </ScrollReveal>
  );
}