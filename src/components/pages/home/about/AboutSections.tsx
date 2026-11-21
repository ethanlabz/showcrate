import {
  ArrowRight,
  Database,
  History,
  Search,
  ShieldCheck,
} from 'lucide-react';
import ScrollReveal, {
  ScrollRevealGroup,
} from '@/components/animations/ScrollReveal';

/**
 * Every ScrollRevealGroup and its ScrollReveal children must live in one React
 * tree. Astro hydrates each component in an .astro file as its own island, and
 * React context (which the group uses to stagger children) does not cross
 * island boundaries. So the grouped sections are composed here, and
 * about.astro mounts each export as a single island.
 */

const primaryBtn =
  'inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary';
const ghostBtn =
  'inline-flex items-center rounded-lg border border-border px-5 py-3 text-sm font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary';

const principles = [
  {
    title: 'Blocks, not markup',
    body: 'Write in a Notion-style block editor. Type / to insert a block, drag the handle to rearrange. There is no syntax to learn and nothing to compile.',
  },
  {
    title: 'Saving is publishing',
    body: 'Pages render on request from what you saved. There is no build step and no deploy queue, so the live page and the editor never drift apart.',
  },
  {
    title: 'Credit where it is due',
    body: 'Name the people who worked on a project. Collaborators are credited on the project and on their own profile. Only the owner can change anything.',
  },
];

const steps = [
  {
    title: 'Create',
    body: 'Start blank or from a template. Each template is a ready-made tree of pages you can rewrite freely.',
  },
  {
    title: 'Write',
    body: 'Nest pages like folders and files. Every edit autosaves, and past versions can be previewed and restored.',
  },
  {
    title: 'Publish',
    body: 'Choose Public, Unlisted or Private. Public projects appear in the showcase, and visitors read them without an account.',
  },
];

const internals = [
  {
    icon: ShieldCheck,
    title: 'Content is data, never HTML',
    body: 'Every save is validated against one shared block schema. At render time all text is escaped, links are restricted to http, https and mailto, and images must come from Showcrate storage.',
  },
  {
    icon: Database,
    title: 'Access is enforced in the database',
    body: 'Row Level Security covers every table and storage bucket. A logged-out visitor can read published, public projects and nothing else.',
  },
  {
    icon: History,
    title: 'Stale saves are rejected',
    body: 'Each save carries the revision it was based on. If a page changed in another tab, the save fails with a 409 instead of silently overwriting it.',
  },
  {
    icon: Search,
    title: 'Search that follows your edits',
    body: 'Docs search is Postgres full-text search over page text. A database trigger keeps the index current, so a saved page is searchable immediately.',
  },
];

const notYet = [
  'PDF and Markdown export',
  'Custom domains',
  'Real-time co-editing',
  'Comments on pages',
  'A public API',
];

/** Hero CTAs. Starts after the hero text (0.1 / 0.25 / 0.4s) has landed. */
export function HeroActions() {
  return (
    <ScrollRevealGroup
      delay={0.55}
      stagger={0.08}
      className='mt-10 flex flex-wrap items-center gap-4'
    >
      <ScrollReveal as='a' href='/dashboard' className={primaryBtn}>
        Start a project
        <ArrowRight className='h-4 w-4' aria-hidden='true' />
      </ScrollReveal>
      <ScrollReveal as='a' href='/showcase' className={ghostBtn}>
        Browse the showcase
      </ScrollReveal>
    </ScrollRevealGroup>
  );
}

export function Principles() {
  return (
    <ScrollRevealGroup
      as='ol'
      stagger={0.12}
      className='divide-y divide-border border-y border-border'
    >
      {principles.map((item, i) => (
        <ScrollReveal
          as='li'
          key={item.title}
          className='grid gap-4 py-10 md:grid-cols-[6rem_1fr_1.4fr] md:items-baseline md:gap-8'
        >
          <span
            aria-hidden='true'
            className='text-4xl font-light tabular-nums text-primary/70'
          >
            {String(i + 1).padStart(2, '0')}
          </span>
          <h3 className='text-2xl font-semibold text-foreground'>
            {item.title}
          </h3>
          <p className='leading-relaxed text-muted-foreground'>{item.body}</p>
        </ScrollReveal>
      ))}
    </ScrollRevealGroup>
  );
}

export function Steps() {
  return (
    <ScrollRevealGroup
      as='ol'
      stagger={0.12}
      className='grid gap-px overflow-hidden rounded-xl border border-border bg-border md:grid-cols-3'
    >
      {steps.map((step, i) => (
        <ScrollReveal as='li' key={step.title} className='bg-background p-8'>
          <p className='mb-6 text-sm font-medium uppercase tracking-[0.2em] text-primary'>
            Step {i + 1}
          </p>
          <h3 className='mb-3 text-2xl font-semibold text-foreground'>
            {step.title}
          </h3>
          <p className='text-sm leading-relaxed text-muted-foreground'>
            {step.body}
          </p>
        </ScrollReveal>
      ))}
    </ScrollRevealGroup>
  );
}

export function Internals() {
  return (
    <ScrollRevealGroup
      as='dl'
      stagger={0.1}
      className='grid gap-x-12 gap-y-10 sm:grid-cols-2'
    >
      {internals.map((item) => (
        <ScrollReveal as='div' key={item.title} className='flex gap-4'>
          <item.icon
            className='mt-1 h-5 w-5 shrink-0 text-primary'
            aria-hidden='true'
          />
          <div>
            <dt className='mb-2 text-lg font-semibold text-foreground'>
              {item.title}
            </dt>
            <dd className='text-sm leading-relaxed text-muted-foreground'>
              {item.body}
            </dd>
          </div>
        </ScrollReveal>
      ))}
    </ScrollRevealGroup>
  );
}

export function NotAtLaunch() {
  return (
    <ScrollReveal
      as='div'
      className='rounded-xl border border-dashed border-border p-8 md:flex md:items-start md:justify-between md:gap-12'
    >
      <div className='mb-6 max-w-sm md:mb-0'>
        <h2
          id='scope-heading'
          className='mb-2 text-xl font-semibold text-foreground'
        >
          Not at launch
        </h2>
        <p className='text-sm leading-relaxed text-muted-foreground'>
          We would rather tell you what is missing than let you find out. These
          are not in the first release.
        </p>
      </div>
      <ScrollRevealGroup
        as='ul'
        delay={0.2}
        stagger={0.06}
        className='flex flex-wrap gap-2 md:max-w-md md:justify-end'
      >
        {notYet.map((item) => (
          <ScrollReveal
            as='li'
            key={item}
            direction='none'
            className='rounded-full border border-border px-3 py-1 text-sm text-muted-foreground'
          >
            {item}
          </ScrollReveal>
        ))}
      </ScrollRevealGroup>
    </ScrollReveal>
  );
}

export function ClosingCta() {
  return (
    <ScrollRevealGroup stagger={0.12}>
      <ScrollReveal
        as='h2'
        id='cta-heading'
        className='mx-auto mb-8 max-w-2xl text-4xl font-semibold tracking-tight text-foreground text-balance sm:text-5xl'
      >
        Give your project a stage.
      </ScrollReveal>
      <ScrollReveal as='a' href='/dashboard' className={primaryBtn}>
        Start a project
        <ArrowRight className='h-4 w-4' aria-hidden='true' />
      </ScrollReveal>
    </ScrollRevealGroup>
  );
}