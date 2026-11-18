import ScrollReveal, {
  ScrollRevealGroup,
} from '@/components/animations/ScrollReveal';
import { GitBranch } from 'lucide-react';

// ====================================================================================================

const navLinks = [
  { label: 'Showcase', href: '/showcase' },
  { label: 'Templates', href: '/templates' },
  { label: 'About', href: '/about' },
  { label: 'Playground', href: '/playground' },
];

const legalLinks = [
  { label: 'Help', href: '/help' },
  { label: 'Terms', href: '/terms' },
  { label: 'Privacy', href: '/privacy' },
];

const developers = [
  { label: 'Doruk Aysor', href: 'https://github.com/dorukaysor' },
];

const contributors = [
  { label: 'Avision', href: 'https://github.com/avision' },
  { label: 'Battering Ram', href: 'https://github.com/thebatteringram' },
  { label: 'Krabby', href: '' },
  { label: 'Satyajit', href: '' },
];

// ====================================================================================================

export function Footer() {
  return (
    <div className='relative z-10 w-full border-t border-border/50 bg-background'>
      <div className='mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8'>
        <div className='flex flex-col gap-10 md:flex-row md:items-start md:justify-between'>
          {/* Brand */}
          <ScrollReveal distance={16} duration={0.7} className='max-w-xs'>
            <a href='/' className='font-display text-lg font-bold'>
              Showcrate
            </a>
            <p className='mt-3 text-sm text-muted-foreground'>
              Every project deserves a stage.
            </p>
          </ScrollReveal>

          {/* Links */}
          <ScrollRevealGroup
            stagger={0.1}
            className='grid grid-cols-2 md:grid-cols-4 gap-x-16 gap-y-12 text-sm sm:gap-x-24'
          >
            <ScrollReveal distance={16} duration={0.7}>
              <p className='mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-foreground'>
                Developer
              </p>
              <ul className='space-y-3'>
                {developers.map((developer) => (
                  <li key={developer.href}>
                    <a
                      href={developer.href}
                      className='text-muted-foreground transition-colors duration-300 hover:text-accent'
                    >
                      {developer.label}
                    </a>
                  </li>
                ))}
              </ul>
            </ScrollReveal>
            <ScrollReveal distance={16} duration={0.7}>
              <p className='mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-foreground'>
                Contributors
              </p>
              <ul className='space-y-3'>
                {contributors.map((contributor) => (
                  <li key={contributor.href}>
                    <a
                      href={contributor.href}
                      className='text-muted-foreground transition-colors duration-300 hover:text-accent'
                    >
                      {contributor.label}
                    </a>
                  </li>
                ))}
              </ul>
            </ScrollReveal>

            <ScrollReveal distance={16} duration={0.7}>
              <p className='mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-foreground'>
                Explore
              </p>
              <ul className='space-y-3'>
                {navLinks.map((link) => (
                  <li key={link.href}>
                    <a
                      href={link.href}
                      className='text-muted-foreground transition-colors duration-300 hover:text-accent'
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </ScrollReveal>

            <ScrollReveal distance={16} duration={0.7}>
              <p className='mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-foreground'>
                Support
              </p>
              <ul className='space-y-3'>
                {legalLinks.map((link) => (
                  <li key={link.href}>
                    <a
                      href={link.href}
                      className='text-muted-foreground transition-colors duration-300 hover:text-accent'
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </ScrollReveal>
          </ScrollRevealGroup>
        </div>

        <ScrollReveal
          direction='none'
          duration={0.8}
          className='flex mt-12 border-t border-border pt-6 text-sm text-muted-foreground items-center justify-between'
        >
          <span>&copy; {new Date().getFullYear()} Showcrate.</span>
          <span
            id='social-icons'
            className='flex items-center justify-center gap-2'
          >
            <GitBranch
              size={16}
              className='p-2 text-foreground border hover:border-strong bg-transparent hover:bg-accent-hover/10 transition-transform duration-300 ease-in-out hover:-translate-y-0.5'
            />
          </span>
        </ScrollReveal>
      </div>
    </div>
  );
}
