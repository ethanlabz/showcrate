import ScrollReveal, {
  ScrollRevealGroup,
} from '@/components/animations/ScrollReveal';
import { Button } from '@/components/ui/button';
import { Shine } from '@animate-ui/react/primitives/effects/shine';
import { ArrowRight, Code, PenLine, Zap } from 'lucide-react';

// ScrollRevealGroup only staggers ScrollReveals inside the SAME React tree,
// which is why these blocks live in a .tsx file and not in index.astro.

const features = [
  {
    icon: PenLine,
    title: 'Block editor',
    body: 'Write documentation directly in a block editor. Showcrate saves in real time, so nothing is ever lost.',
  },
  {
    icon: Code,
    title: 'Built-in code editor',
    body: 'Let readers tinker with your examples in the browser, in a live environment that is safe to break.',
  },
  {
    icon: Zap,
    title: 'Fast by default',
    body: 'Powered by Astro, pages are generated statically. They load instantly and stay friendly to search engines.',
  },
];

const steps = [
  {
    n: '01',
    title: 'Write',
    body: 'Capture your project in blocks: headings, lists, notes and code, with no markup to learn.',
  },
  {
    n: '02',
    title: 'Make it live',
    body: 'Add interactive examples so people can run and edit your work instead of just reading about it.',
  },
  {
    n: '03',
    title: 'Share',
    body: 'Put it on the showcase and send one link. Your project gets a proper stage.',
  },
];

export function HeroContent() {
  return (
    <ScrollRevealGroup
      delay={0.25}
      stagger={0.12}
      className='relative z-10 flex max-w-4xl flex-col items-center text-center'
    >
      <ScrollReveal
        as='h1'
        duration={0.9}
        distance={28}
        className='font-display text-5xl font-bold leading-[1.05] tracking-tight text-balance pb-2 sm:text-6xl lg:text-7xl bg-linear-to-b from-foreground to-foreground/60 bg-clip-text text-transparent'
      >
        Every project deserves a stage.
      </ScrollReveal>

      <ScrollReveal
        as='p'
        duration={0.8}
        className='mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground text-balance sm:text-lg'
      >
        Document, present and share your work in one place, with a block editor
        that saves as you type.
      </ScrollReveal>

      <ScrollReveal
        duration={0.8}
        className='mt-10 flex w-full flex-col items-center gap-3 sm:w-auto sm:flex-row sm:gap-4'
      >
        <a href='/dashboard' className='w-full sm:w-auto'>
          <Shine enableOnHover>
            <Button
              size='lg'
              className='group flex items-center justify-center w-full gap-1 hover:gap-3 sm:w-auto'
            >
              Get started
              <ArrowRight size={14} className='duration-300' />
            </Button>
          </Shine>
        </a>
        <a href='/showcase' className='w-full sm:w-auto'>
          <Shine loop loopDelay={4}>
            <Button
              variant='outline'
              size='lg'
              className='w-full bg-background/50 backdrop-blur-sm sm:w-auto'
            >
              Browse projects
            </Button>
          </Shine>
        </a>
      </ScrollReveal>
    </ScrollRevealGroup>
  );
}

export function FeatureGrid() {
  return (
    <ScrollRevealGroup
      stagger={0.12}
      className='grid grid-cols-1 gap-5 sm:gap-6 md:grid-cols-3'
    >
      {features.map((f) => (
        <ScrollReveal
          key={f.title}
          distance={32}
          duration={0.7}
          // Only transition border + translate. `transition-all` would fight
          // the reveal's transform/opacity and make the entrance laggy.
          className='group relative overflow-hidden rounded-2xl border border-border/60 bg-card/50 p-8 transition-[border-color,translate] duration-500 hover:-translate-y-1 hover:border-primary/40 sm:p-9'
        >
          <div
            aria-hidden='true'
            className='pointer-events-none absolute inset-0 bg-linear-to-br from-primary/10 via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100'
          />
          <div className='relative'>
            <div className='mb-7 flex h-12 w-12 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary'>
              <f.icon className='h-5 w-5' />
            </div>
            <h3 className='mb-3 font-display text-xl font-semibold tracking-tight'>
              {f.title}
            </h3>
            <p className='leading-relaxed text-muted-foreground'>{f.body}</p>
          </div>
        </ScrollReveal>
      ))}
    </ScrollRevealGroup>
  );
}

export function StepList() {
  return (
    <ScrollRevealGroup
      as='ol'
      stagger={0.15}
      className='grid grid-cols-1 gap-10 md:grid-cols-3 md:gap-8'
    >
      {steps.map((s) => (
        <ScrollReveal
          as='li'
          key={s.n}
          distance={24}
          duration={0.7}
          className='border-t border-border pt-6'
        >
          <span className='font-mono text-sm text-primary'>{s.n}</span>
          <h3 className='mt-3 mb-2 font-display text-xl font-semibold tracking-tight'>
            {s.title}
          </h3>
          <p className='leading-relaxed text-muted-foreground'>{s.body}</p>
        </ScrollReveal>
      ))}
    </ScrollRevealGroup>
  );
}
