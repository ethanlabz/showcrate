import {
  Blocks,
  Code2,
  FolderTree,
  Globe,
  History,
  LayoutTemplate,
  Radio,
  Search,
  Users,
  type LucideIcon,
} from 'lucide-react';
import ScrollReveal, {
  ScrollRevealGroup,
} from '@/components/animations/ScrollReveal';

/**
 * Grouped reveals must share one React tree (React context does not cross
 * Astro islands), so each group and its children are composed here.
 */

const cardBase =
  'group relative overflow-hidden rounded-3xl border border-border/60 bg-card/40 p-8 backdrop-blur-md transition-colors duration-500 hover:border-primary/50 sm:p-10';

function IconTile({ icon: Icon }: { icon: LucideIcon }) {
  return (
    <div className='mb-8 flex h-14 w-14 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10'>
      <Icon className='h-7 w-7 text-primary' aria-hidden='true' />
    </div>
  );
}

const slashItems = [
  'Heading',
  'Bulleted list',
  'Code block',
  'Table',
  'Callout',
  'Image',
];

/** Static illustration of the slash menu. Not a live editor. */
function SlashMenuIllustration() {
  return (
    <div
      aria-hidden='true'
      className='mt-8 rounded-xl border border-border bg-background/70 p-4 font-mono text-sm lg:mt-0'
    >
      <p className='mb-3 text-muted-foreground'>
        <span className='text-primary'>/</span>
        <span className='ml-px inline-block h-4 w-px translate-y-0.5 bg-primary' />
      </p>
      <ul className='space-y-1'>
        {slashItems.map((item, i) => (
          <li
            key={item}
            className={`rounded-md px-3 py-1.5 ${
              i === 0
                ? 'bg-primary/10 text-foreground'
                : 'text-muted-foreground'
            }`}
          >
            {item}
          </li>
        ))}
      </ul>
      <p className='mt-3 text-xs text-muted-foreground/70'>Illustration</p>
    </div>
  );
}

export function FeatureGrid() {
  return (
    <ScrollRevealGroup
      as='ul'
      stagger={0.1}
      className='grid gap-6 lg:grid-cols-3 lg:gap-8'
    >
      {/* Lead feature */}
      <ScrollReveal as='li' className={`${cardBase} lg:col-span-2`}>
        <div className='lg:grid lg:grid-cols-[1.2fr_1fr] lg:items-center lg:gap-10'>
          <div>
            <IconTile icon={Blocks} />
            <h3 className='mb-4 text-2xl font-semibold tracking-tight text-foreground'>
              A block editor, not a markup language
            </h3>
            <p className='leading-relaxed text-muted-foreground'>
              Type / to insert a heading, list, table, code block, image or
              callout. Drag the handle to rearrange. There is nothing to compile
              and no preview pane to keep in sync.
            </p>
          </div>
          <SlashMenuIllustration />
        </div>
      </ScrollReveal>

      <ScrollReveal as='li' className={cardBase}>
        <IconTile icon={Radio} />
        <h3 className='mb-4 text-2xl font-semibold tracking-tight text-foreground'>
          Live the moment you save
        </h3>
        <p className='leading-relaxed text-muted-foreground'>
          Pages render on request from what you saved. There is no build step
          between writing and publishing.
        </p>
      </ScrollReveal>

      <ScrollReveal as='li' className={cardBase}>
        <IconTile icon={FolderTree} />
        <h3 className='mb-4 text-2xl font-semibold tracking-tight text-foreground'>
          Pages that nest like files
        </h3>
        <p className='leading-relaxed text-muted-foreground'>
          Organise docs as a tree of folders and pages, and reorder them by
          dragging in the page tree.
        </p>
      </ScrollReveal>

      <ScrollReveal as='li' className={cardBase}>
        <IconTile icon={History} />
        <h3 className='mb-4 text-2xl font-semibold tracking-tight text-foreground'>
          Version history you can undo
        </h3>
        <p className='leading-relaxed text-muted-foreground'>
          Preview any earlier version read-only and restore it in one click.
          Restoring snapshots the current page first, so the restore itself is
          reversible.
        </p>
      </ScrollReveal>

      <ScrollReveal as='li' className={cardBase}>
        <IconTile icon={Search} />
        <h3 className='mb-4 text-2xl font-semibold tracking-tight text-foreground'>
          Search across your docs
        </h3>
        <p className='leading-relaxed text-muted-foreground'>
          Visitors search page titles and content with Postgres full-text
          search, kept current as you save.
        </p>
      </ScrollReveal>
    </ScrollRevealGroup>
  );
}

const alsoIncluded = [
  {
    icon: Globe,
    title: 'A public showcase',
    body: 'Public projects appear in a browsable gallery. Choose Public, Unlisted or Private per project. Visitors never need an account.',
  },
  {
    icon: LayoutTemplate,
    title: 'Templates',
    body: 'Start from a ready-made tree of pages instead of a blank screen.',
  },
  {
    icon: Code2,
    title: 'Highlighted code',
    body: 'Code blocks are highlighted on the server with Shiki, so readers download no highlighting script.',
  },
  {
    icon: Users,
    title: 'Collaborator credits',
    body: 'Credit everyone who worked on a project. Credits are attribution only and grant no edit access.',
  },
];

export function AlsoIncluded() {
  return (
    <ScrollRevealGroup
      as='ul'
      stagger={0.08}
      className='grid gap-x-12 gap-y-10 sm:grid-cols-2'
    >
      {alsoIncluded.map((item) => (
        <ScrollReveal as='li' key={item.title} className='flex gap-4'>
          <item.icon
            className='mt-1 h-5 w-5 shrink-0 text-primary'
            aria-hidden='true'
          />
          <div>
            <h3 className='mb-2 text-lg font-semibold text-foreground'>
              {item.title}
            </h3>
            <p className='text-sm leading-relaxed text-muted-foreground'>
              {item.body}
            </p>
          </div>
        </ScrollReveal>
      ))}
    </ScrollRevealGroup>
  );
}
