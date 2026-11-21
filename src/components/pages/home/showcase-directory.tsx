import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { LayoutGrid, List, Search, Star, X, ArrowUpRight } from 'lucide-react';
import ScrollReveal from '@/components/animations/ScrollReveal';

// ====================================================================================================
// SAMPLE DATA - fictional projects for demonstration. Replace with real data
// (Supabase, etc.) later. Set `href` on a project to make its card clickable.
// ====================================================================================================

export interface ShowcaseProject {
  id: string;
  title: string;
  description: string;
  tags: string[];
  addedDate: string;
  featured: boolean;
  href?: string;
  author?: {
    username: string;
    displayName?: string | null;
    avatarUrl?: string | null;
  };
}

export type Project = ShowcaseProject;

export interface ShowcaseDirectoryProps {
  initialProjects?: ShowcaseProject[];
}

const DEFAULT_SAMPLE_PROJECTS: ShowcaseProject[] = [
  {
    id: 'smart-attendance',
    title: 'Smart Attendance',
    description:
      'RFID-based attendance tracking on an ESP32, with a realtime dashboard for faculty.',
    tags: ['IoT', 'Dashboard'],
    addedDate: '2026-09-12',
    featured: true,
  },
  {
    id: 'campus-navigator',
    title: 'Campus Navigator',
    description:
      'An interactive campus map that helps new students find classrooms, labs and offices.',
    tags: ['Web App', 'Maps'],
    addedDate: '2026-08-30',
    featured: true,
  },
  {
    id: 'plant-monitor',
    title: 'Plant Monitor',
    description:
      'Soil moisture and light sensors that report to a live chart and send watering alerts.',
    tags: ['IoT', 'Sensors'],
    addedDate: '2026-08-04',
    featured: false,
  },
  {
    id: 'notes-exchange',
    title: 'Notes Exchange',
    description:
      'A peer-to-peer platform for sharing and organizing semester notes by subject.',
    tags: ['Web App', 'Education'],
    addedDate: '2026-10-02',
    featured: true,
  },
  {
    id: 'library-queue',
    title: 'Library Queue',
    description:
      'Shows live seat availability and book reservation status for the college library.',
    tags: ['Dashboard', 'Education'],
    addedDate: '2026-07-18',
    featured: false,
  },
  {
    id: 'weather-station',
    title: 'Weather Station',
    description:
      'A rooftop sensor node that logs temperature, humidity and pressure to a public page.',
    tags: ['IoT', 'Sensors'],
    addedDate: '2026-06-22',
    featured: false,
  },
  {
    id: 'portfolio-kit',
    title: 'Portfolio Kit',
    description:
      'A starter template for student developers to publish a clean personal portfolio.',
    tags: ['Web App', 'Templates'],
    addedDate: '2026-09-25',
    featured: false,
  },
];



type SortOption = 'featured' | 'newest' | 'az';
type ViewMode = 'grid' | 'list';

const sortOptions: { value: SortOption; label: string }[] = [
  { value: 'featured', label: 'Featured' },
  { value: 'newest', label: 'Newest' },
  { value: 'az', label: 'A-Z' },
];

function formatDate(iso: string) {
  // Fixed locale + UTC so server and client render identically (no hydration mismatch).
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

// ====================================================================================================

function Monogram({ title }: { title: string }) {
  return (
    <div
      aria-hidden='true'
      className='flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 font-sans text-lg font-semibold text-primary'
    >
      {title.charAt(0)}
    </div>
  );
}

function TagList({ tags }: { tags: string[] }) {
  return (
    <ul className='flex flex-wrap gap-1.5'>
      {tags.map((tag) => (
        <li
          key={tag}
          className='rounded-md bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground'
        >
          {tag}
        </li>
      ))}
    </ul>
  );
}

function ProjectCard({
  project,
  viewMode,
}: {
  project: Project;
  viewMode: ViewMode;
}) {
  const reduceMotion = useReducedMotion();
  const isList = viewMode === 'list';

  const title = project.href ? (
    <a
      href={project.href}
      className='after:absolute after:inset-0 focus-visible:outline-none'
    >
      {project.title}
    </a>
  ) : (
    project.title
  );

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: reduceMotion ? 0 : 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, transition: { duration: 0.15 } }}
      whileHover={reduceMotion ? undefined : { y: -3 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className={`group relative overflow-hidden rounded-2xl border border-border/60 bg-card/50 transition-colors duration-500 hover:border-primary/40 focus-within:border-primary/60 ${
        isList ? 'flex items-center gap-5 p-5' : 'flex flex-col p-6 sm:p-7'
      }`}
    >
      <div
        aria-hidden='true'
        className='pointer-events-none absolute inset-0 bg-linear-to-br from-primary/10 via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100'
      />

      <div
        className={`relative flex items-start ${
          isList ? 'shrink-0' : 'mb-6 justify-between'
        }`}
      >
        <Monogram title={project.title} />
        {!isList && project.featured && (
          <span className='inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary'>
            <Star className='h-3 w-3 fill-current' />
            Featured
          </span>
        )}
      </div>

      <div className={`relative ${isList ? 'min-w-0 flex-1' : 'flex-1'}`}>
        <div
          className={`flex gap-x-3 gap-y-2 ${
            isList ? 'flex-wrap items-center' : 'flex-col'
          }`}
        >
          <h3 className='font-sans text-lg font-semibold tracking-tight'>
            {title}
          </h3>
          <TagList tags={project.tags} />
        </div>
        <p
          className={`mt-3 leading-relaxed text-muted-foreground ${
            isList ? 'line-clamp-2 text-sm' : 'text-[15px]'
          }`}
        >
          {project.description}
        </p>
      </div>

      <div
        className={`relative flex items-center text-xs text-muted-foreground ${
          isList ? 'shrink-0 gap-4' : 'mt-6 justify-between border-t border-border/50 pt-4'
        }`}
      >
        <div className='flex items-center gap-1.5 truncate'>
          {project.author?.username && (
            <span className='font-medium text-foreground/85'>
              @{project.author.username}
            </span>
          )}
          {project.author?.username && <span>•</span>}
          <span>{formatDate(project.addedDate)}</span>
        </div>
        <ArrowUpRight
          aria-hidden='true'
          className={`h-4 w-4 shrink-0 transition-all duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary ${
            project.href ? 'opacity-100' : 'opacity-30'
          }`}
        />
      </div>
    </motion.article>
  );
}

// ====================================================================================================

export function ShowcaseDirectory({ initialProjects }: ShowcaseDirectoryProps = {}) {
  const [projectsList, setProjectsList] = useState<ShowcaseProject[]>(() => {
    return initialProjects && initialProjects.length > 0 ? initialProjects : DEFAULT_SAMPLE_PROJECTS;
  });
  const [isSampleData, setIsSampleData] = useState<boolean>(() => {
    return !initialProjects || initialProjects.length === 0;
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTags, setActiveTags] = useState<string[]>([]);
  const [sortOption, setSortOption] = useState<SortOption>('featured');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [modKey, setModKey] = useState('Ctrl');

  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!initialProjects || initialProjects.length === 0) {
      let isMounted = true;
      fetch('/api/projects')
        .then((res) => res.json())
        .then((data) => {
          if (!isMounted) return;
          const fetchedProjects = data?.projects ?? data?.data?.projects;
          if (Array.isArray(fetchedProjects) && fetchedProjects.length > 0) {
            const mapped: ShowcaseProject[] = fetchedProjects.map((p: any) => {
              const user = Array.isArray(p.users) ? p.users[0] : p.users;
              const username = user?.username;
              return {
                id: p.id,
                title: p.name,
                description: p.tagline || 'Documentation hosted on Showcrate.',
                tags: ['Documentation', ...(p.featured ? ['Featured'] : [])],
                addedDate: p.created_at || new Date().toISOString(),
                featured: Boolean(p.featured),
                href: username ? `/${username}/${p.slug}` : undefined,
                author: username
                  ? {
                      username,
                      displayName: user?.display_name || null,
                      avatarUrl: user?.avatar_url || null,
                    }
                  : undefined,
              };
            });
            setProjectsList(mapped);
            setIsSampleData(false);
          }
        })
        .catch(() => {});
      return () => {
        isMounted = false;
      };
    }
  }, [initialProjects]);

  useEffect(() => {
    if (/Mac|iPhone|iPad/.test(navigator.platform)) setModKey('\u2318');

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const allTags = useMemo(() => {
    return Array.from(new Set(projectsList.flatMap((p) => p.tags))).sort();
  }, [projectsList]);

  const toggleTag = (tag: string) =>
    setActiveTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );

  const clearFilters = () => {
    setSearchQuery('');
    setActiveTags([]);
  };

  const visible = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const result = projectsList.filter((p) => {
      const matchesSearch =
        !q ||
        p.title.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        Boolean(p.author?.username?.toLowerCase().includes(q));
      const matchesTags =
        activeTags.length === 0 || activeTags.every((t) => p.tags.includes(t));
      return matchesSearch && matchesTags;
    });

    return [...result].sort((a, b) => {
      if (sortOption === 'featured') {
        return Number(b.featured) - Number(a.featured);
      }
      if (sortOption === 'newest') {
        return (
          new Date(b.addedDate).getTime() - new Date(a.addedDate).getTime()
        );
      }
      return a.title.localeCompare(b.title);
    });
  }, [projectsList, searchQuery, activeTags, sortOption]);

  const hasFilters = searchQuery !== '' || activeTags.length > 0;

  return (
    <div className='w-full'>
      {/* Header */}
      <ScrollReveal
        duration={0.8}
        className='mx-auto max-w-3xl pt-32 pb-12 text-center lg:pt-40'
      >
        <p className='mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-primary'>
          The Showcase
        </p>
        <h1 className='font-display text-4xl font-bold leading-[1.1] tracking-tight text-balance pb-1 sm:text-5xl lg:text-6xl bg-linear-to-b from-foreground to-foreground/60 bg-clip-text text-transparent'>
          Built with Showcrate
        </h1>
        <p className='mx-auto mt-5 max-w-2xl text-muted-foreground text-balance sm:text-lg'>
          Browse projects documented and presented on Showcrate.
        </p>
        {/* <span className='mt-5 inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/60 px-3 py-1 text-xs text-muted-foreground backdrop-blur-md'>
          <span className={`h-1.5 w-1.5 rounded-full ${isSampleData ? 'bg-amber-500' : 'bg-emerald-500 animate-pulse'}`} />
          {isSampleData
            ? 'Sample data for demonstration'
            : `${projectsList.length} published project${projectsList.length === 1 ? '' : 's'}`}
        </span> */}
      </ScrollReveal>

      {/* Search */}
      <ScrollReveal
        delay={0.1}
        duration={0.8}
        className='relative z-20 mx-auto mb-10 w-full max-w-xl'
      >
        <Search
          aria-hidden='true'
          className='pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground'
        />
        <input
          ref={searchInputRef}
          type='search'
          aria-label='Search projects'
          placeholder='Search projects...'
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setSearchQuery('');
              e.currentTarget.blur();
            }
          }}
          className='block w-full rounded-xl border border-border/70 bg-card/80 py-3 pl-12 pr-20 text-base shadow-lg shadow-black/5 outline-none backdrop-blur-xl transition-all placeholder:text-muted-foreground/60 focus:border-primary focus:ring-2 focus:ring-primary/30 [&::-webkit-search-cancel-button]:appearance-none'
        />
        <kbd className='pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 items-center gap-1 rounded-md border border-border bg-muted/80 px-2 py-1 font-mono text-[11px] text-muted-foreground sm:inline-flex'>
          {modKey} K
        </kbd>
      </ScrollReveal>

      {/* Toolbar */}
      <div className='mb-8 flex flex-col gap-4 border-y border-border/50 py-4'>
        <div className='flex flex-wrap items-center justify-between gap-3'>
          <p
            aria-live='polite'
            className='text-sm font-medium text-muted-foreground'
          >
            {visible.length} {visible.length === 1 ? 'project' : 'projects'}
          </p>

          <div className='flex items-center gap-3'>
            <div
              role='group'
              aria-label='Sort projects'
              className='flex items-center rounded-lg border border-border/60 bg-card/50 p-0.5'
            >
              {sortOptions.map((opt) => (
                <button
                  key={opt.value}
                  type='button'
                  aria-pressed={sortOption === opt.value}
                  onClick={() => setSortOption(opt.value)}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                    sortOption === opt.value
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <div
              role='group'
              aria-label='View mode'
              className='flex items-center rounded-lg border border-border/60 bg-card/50 p-0.5'
            >
              <button
                type='button'
                aria-label='Grid view'
                aria-pressed={viewMode === 'grid'}
                onClick={() => setViewMode('grid')}
                className={`rounded-md p-1.5 transition-colors ${
                  viewMode === 'grid'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <LayoutGrid className='h-4 w-4' />
              </button>
              <button
                type='button'
                aria-label='List view'
                aria-pressed={viewMode === 'list'}
                onClick={() => setViewMode('list')}
                className={`rounded-md p-1.5 transition-colors ${
                  viewMode === 'list'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <List className='h-4 w-4' />
              </button>
            </div>
          </div>
        </div>

        <div className='flex flex-wrap items-center gap-2'>
          {allTags.map((tag) => {
            const active = activeTags.includes(tag);
            return (
              <button
                key={tag}
                type='button'
                aria-pressed={active}
                onClick={() => toggleTag(tag)}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                  active
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border/60 bg-card/50 text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                {tag}
              </button>
            );
          })}
          {hasFilters && (
            <button
              type='button'
              onClick={clearFilters}
              className='ml-1 inline-flex items-center gap-1 text-xs text-muted-foreground underline-offset-2 transition-colors hover:text-foreground hover:underline'
            >
              <X className='h-3 w-3' />
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Results */}
      <motion.div
        layout
        className={
          viewMode === 'grid'
            ? 'grid grid-cols-1 gap-5 md:grid-cols-2 lg:gap-6 xl:grid-cols-3'
            : 'flex flex-col gap-3'
        }
      >
        <AnimatePresence mode='popLayout'>
          {visible.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              viewMode={viewMode}
            />
          ))}
        </AnimatePresence>
      </motion.div>

      {visible.length === 0 && (
        <div className='py-20 text-center'>
          <div className='mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full border border-border/60 bg-muted/40'>
            <Search className='h-6 w-6 text-muted-foreground/60' />
          </div>
          <h3 className='mb-2 font-display text-xl font-semibold'>
            No projects found
          </h3>
          <p className='text-muted-foreground'>
            Try adjusting your search or filters.
          </p>
          <button
            type='button'
            onClick={clearFilters}
            className='mt-6 text-sm font-medium text-primary hover:underline'
          >
            Clear all filters
          </button>
        </div>
      )}
    </div>
  );
}