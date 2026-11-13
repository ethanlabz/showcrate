'use client';

import * as React from 'react';
import {
  LayoutGrid,
  Rows3,
  List,
  FolderKanban,
  Plus,
  Users,
  ChevronDown,
  Check,
  FileText,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface OwnedProject {
  id: string;
  name: string;
  slug: string;
  tagline?: string | null;
  visibility: string;
  published: boolean;
  updated_at: string;
}

export interface CreditedProject {
  id: string;
  display_role?: string | null;
  project: {
    id: string;
    name: string;
    slug: string;
    tagline?: string | null;
    visibility: string;
    published: boolean;
    owner?: {
      username: string;
    };
  };
}

export interface ProjectDashboardViewProps {
  ownedProjects: OwnedProject[];
  creditedProjects?: CreditedProject[];
  viewerUsername?: string;
}

type ViewMode = 'grid' | 'compact' | 'list';
type SortOption = 'updated_desc' | 'updated_asc' | 'name_asc' | 'name_desc';
type FilterOption = 'all' | 'published' | 'draft' | 'private';

const SORT_LABELS: Record<SortOption, string> = {
  updated_desc: 'Last Updated',
  updated_asc: 'Oldest',
  name_asc: 'Name (A - Z)',
  name_desc: 'Name (Z - A)',
};

const FILTER_LABELS: Record<FilterOption, string> = {
  all: 'All',
  published: 'Published',
  draft: 'Draft',
  private: 'Private',
};

function formatDate(dateStr: string) {
  try {
    const d = new Date(dateStr);
    return (
      d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) +
      ' at ' +
      d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
    );
  } catch {
    return dateStr;
  }
}

function formatDateShort(dateStr: string) {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

export function ProjectDashboardView({
  ownedProjects = [],
  creditedProjects = [],
  viewerUsername = '',
}: ProjectDashboardViewProps) {
  const [viewMode, setViewMode] = React.useState<ViewMode>('grid');
  const [sortOption, setSortOption] = React.useState<SortOption>('updated_desc');
  const [filterOption, setFilterOption] = React.useState<FilterOption>('all');
  const [sortOpen, setSortOpen] = React.useState(false);
  const [filterOpen, setFilterOpen] = React.useState(false);

  const sortRef = React.useRef<HTMLDivElement>(null);
  const filterRef = React.useRef<HTMLDivElement>(null);

  // Restore saved view mode preference
  React.useEffect(() => {
    try {
      const saved = localStorage.getItem('showcrate_dashboard_view') as ViewMode | null;
      if (saved && (saved === 'grid' || saved === 'compact' || saved === 'list')) {
        setViewMode(saved);
      }
    } catch {
      // ignore
    }
  }, []);

  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode);
    try {
      localStorage.setItem('showcrate_dashboard_view', mode);
    } catch {
      // ignore
    }
  };

  // Close dropdowns on outside click
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) {
        setSortOpen(false);
      }
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setFilterOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter & Sort logic
  const filteredAndSortedProjects = React.useMemo(() => {
    let list = [...ownedProjects];

    // Filter
    if (filterOption === 'published') {
      list = list.filter((p) => p.published);
    } else if (filterOption === 'draft') {
      list = list.filter((p) => !p.published);
    } else if (filterOption === 'private') {
      list = list.filter((p) => p.visibility === 'private');
    }

    // Sort
    list.sort((a, b) => {
      if (sortOption === 'updated_desc') {
        return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      }
      if (sortOption === 'updated_asc') {
        return new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime();
      }
      if (sortOption === 'name_asc') {
        return a.name.localeCompare(b.name);
      }
      if (sortOption === 'name_desc') {
        return b.name.localeCompare(a.name);
      }
      return 0;
    });

    return list;
  }, [ownedProjects, filterOption, sortOption]);

  return (
    <div>
      {/* Toolbar: Sort by, Filter by, View mode toggle */}
      <div className="flex flex-wrap items-center justify-between mb-6 gap-3">
        <div className="flex items-center gap-4 text-xs">
          {/* Sort dropdown */}
          <div className="relative flex items-center gap-2 text-muted-foreground" ref={sortRef}>
            <span>Sort by</span>
            <button
              type="button"
              onClick={() => setSortOpen((prev) => !prev)}
              className="bg-accent/10 hover:bg-accent/20 text-accent rounded-md px-3 py-1.5 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <span>{SORT_LABELS[sortOption]}</span>
              <ChevronDown className="h-3 w-3 opacity-80" />
            </button>

            {sortOpen && (
              <div className="absolute left-14 top-full mt-1.5 z-30 w-40 rounded-lg bg-surface border border-border/60 shadow-xl py-1 text-xs">
                {(Object.keys(SORT_LABELS) as SortOption[]).map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      setSortOption(key);
                      setSortOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-1.5 text-left transition-colors cursor-pointer ${
                      sortOption === key
                        ? 'bg-surface-raised text-accent font-medium'
                        : 'text-foreground hover:bg-surface-raised/50'
                    }`}
                  >
                    <span>{SORT_LABELS[key]}</span>
                    {sortOption === key && <Check className="h-3.5 w-3.5 text-accent" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Filter dropdown */}
          <div className="relative flex items-center gap-2 text-muted-foreground" ref={filterRef}>
            <span>Filter by</span>
            <button
              type="button"
              onClick={() => setFilterOpen((prev) => !prev)}
              className="bg-surface hover:bg-surface-raised border border-border/60 rounded-md px-3 py-1.5 text-xs text-foreground font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <span>{FILTER_LABELS[filterOption]}</span>
              <ChevronDown className="h-3 w-3 opacity-80" />
            </button>

            {filterOpen && (
              <div className="absolute left-16 top-full mt-1.5 z-30 w-36 rounded-lg bg-surface border border-border/60 shadow-xl py-1 text-xs">
                {(Object.keys(FILTER_LABELS) as FilterOption[]).map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      setFilterOption(key);
                      setFilterOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-1.5 text-left transition-colors cursor-pointer ${
                      filterOption === key
                        ? 'bg-surface-raised text-accent font-medium'
                        : 'text-foreground hover:bg-surface-raised/50'
                    }`}
                  >
                    <span>{FILTER_LABELS[key]}</span>
                    {filterOption === key && <Check className="h-3.5 w-3.5 text-accent" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* View Toggle: Grid / Compact / List */}
        <div className="flex items-center border border-border/60 rounded-lg overflow-hidden text-xs bg-surface/50">
          <button
            type="button"
            onClick={() => handleViewModeChange('grid')}
            className={`flex items-center gap-1.5 px-3 py-1.5 transition-colors cursor-pointer ${
              viewMode === 'grid'
                ? 'bg-surface-raised text-foreground font-medium'
                : 'text-muted-foreground hover:text-foreground hover:bg-surface-raised/40'
            }`}
            title="Grid view"
          >
            <LayoutGrid className="h-3.5 w-3.5" />
            <span>Grid</span>
          </button>
          <button
            type="button"
            onClick={() => handleViewModeChange('compact')}
            className={`flex items-center gap-1.5 px-3 py-1.5 border-l border-border/60 transition-colors cursor-pointer ${
              viewMode === 'compact'
                ? 'bg-surface-raised text-foreground font-medium'
                : 'text-muted-foreground hover:text-foreground hover:bg-surface-raised/40'
            }`}
            title="Compact view"
          >
            <Rows3 className="h-3.5 w-3.5" />
            <span>Compact</span>
          </button>
          <button
            type="button"
            onClick={() => handleViewModeChange('list')}
            className={`flex items-center gap-1.5 px-3 py-1.5 border-l border-border/60 transition-colors cursor-pointer ${
              viewMode === 'list'
                ? 'bg-surface-raised text-foreground font-medium'
                : 'text-muted-foreground hover:text-foreground hover:bg-surface-raised/40'
            }`}
            title="List view"
          >
            <List className="h-3.5 w-3.5" />
            <span>List</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {ownedProjects.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/60 p-12 text-center bg-surface/20">
          <FolderKanban className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
          <h3 className="font-heading font-semibold text-foreground text-base mb-1">
            No projects yet
          </h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto mb-4">
            Create your first documentation project to get started.
          </p>
          <a href="/dashboard/new">
            <Button size="sm" className="bg-accent text-accent-foreground hover:bg-accent-hover font-medium cursor-pointer">
              <Plus className="h-4 w-4 mr-1.5" />
              Create project
            </Button>
          </a>
        </div>
      ) : filteredAndSortedProjects.length === 0 ? (
        <div className="rounded-xl border border-border/50 p-8 text-center bg-surface/20">
          <p className="text-sm text-muted-foreground">
            No projects match the current filter ({FILTER_LABELS[filterOption]}).
          </p>
          <button
            type="button"
            onClick={() => setFilterOption('all')}
            className="mt-3 text-xs text-accent hover:underline font-medium cursor-pointer"
          >
            Show all projects
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        /* GRID VIEW */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredAndSortedProjects.map((p) => (
            <a
              key={p.id}
              href={`/editor/${p.id}`}
              className="group block relative"
            >
              <div className="relative rounded-lg overflow-hidden border border-border/30 hover:border-border/60 transition-all duration-200 aspect-[3/4] bg-surface-raised/50 group-hover:border-accent/40">
                {/* Document preview placeholder */}
                <div className="absolute inset-3 rounded bg-white/[0.03] border border-white/[0.04] p-4 flex flex-col gap-2.5 overflow-hidden">
                  <div className="h-3 w-3/5 rounded-sm bg-foreground/10" />
                  <div className="h-0.5" />
                  <div className="h-2 w-full rounded-sm bg-foreground/[0.06]" />
                  <div className="h-2 w-11/12 rounded-sm bg-foreground/[0.06]" />
                  <div className="h-2 w-full rounded-sm bg-foreground/[0.06]" />
                  <div className="h-2 w-4/5 rounded-sm bg-foreground/[0.06]" />
                  <div className="h-2 w-full rounded-sm bg-foreground/[0.06]" />
                  <div className="h-2 w-2/3 rounded-sm bg-foreground/[0.06]" />
                  <div className="h-3" />
                  <div className="h-2.5 w-2/5 rounded-sm bg-foreground/[0.08]" />
                  <div className="h-2 w-full rounded-sm bg-foreground/[0.06]" />
                  <div className="h-2 w-5/6 rounded-sm bg-foreground/[0.06]" />
                  <div className="h-2 w-full rounded-sm bg-foreground/[0.06]" />
                  <div className="h-2 w-3/4 rounded-sm bg-foreground/[0.06]" />
                </div>

                {/* Bottom gradient overlay with name + date */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-4 pt-12">
                  <div className="flex items-end justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="font-heading font-bold text-sm text-white truncate group-hover:text-accent transition-colors">
                        {p.name}
                      </h3>
                      <p className="text-[11px] text-white/50 mt-0.5 truncate">
                        Last updated on {formatDate(p.updated_at)}
                      </p>
                    </div>
                    <span
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        window.open(`/${viewerUsername || 'user'}/${p.slug}`, '_blank');
                      }}
                      className="text-[10px] text-white/70 hover:text-white px-2 py-0.5 rounded bg-black/40 hover:bg-black/60 border border-white/10 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                      title="View public preview"
                    >
                      Preview
                    </span>
                  </div>
                </div>
              </div>
            </a>
          ))}
        </div>
      ) : viewMode === 'compact' ? (
        /* COMPACT VIEW */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredAndSortedProjects.map((p) => (
            <a
              key={p.id}
              href={`/editor/${p.id}`}
              className="group block rounded-lg border border-border/40 hover:border-border/80 bg-surface/40 hover:bg-surface-raised/60 p-3.5 transition-all duration-200"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="flex h-8 w-8 items-center justify-center rounded-md bg-accent/10 text-accent shrink-0">
                    <FolderKanban className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-heading font-semibold text-sm text-foreground truncate group-hover:text-accent transition-colors">
                      {p.name}
                    </h3>
                    <p className="text-[11px] font-mono text-muted-foreground truncate">
                      /{p.slug}
                    </p>
                  </div>
                </div>

                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0 ${
                    p.published
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                      : 'bg-surface-raised text-muted-foreground border border-border/40'
                  }`}
                >
                  {p.published ? 'Published' : 'Draft'}
                </span>
              </div>

              <div className="mt-3 pt-2.5 border-t border-border/30 flex items-center justify-between text-[11px] text-muted-foreground">
                <span>Updated {formatDateShort(p.updated_at)}</span>
                <div className="flex items-center gap-2">
                  <span
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      window.open(`/${viewerUsername || 'user'}/${p.slug}`, '_blank');
                    }}
                    className="hover:text-foreground hover:underline cursor-pointer"
                    title="View public preview"
                  >
                    Preview
                  </span>
                  <span>·</span>
                  <span className="text-accent hover:underline group-hover:translate-x-0.5 transition-transform font-medium">
                    Editor →
                  </span>
                </div>
              </div>
            </a>
          ))}
        </div>
      ) : (
        /* LIST VIEW */
        <div className="rounded-xl border border-border/50 bg-surface/30 overflow-hidden divide-y divide-border/40">
          {filteredAndSortedProjects.map((p) => (
            <div
              key={p.id}
              className="p-3.5 sm:px-4 sm:py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-surface-raised/40 transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-accent/10 text-accent shrink-0">
                  <FileText className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <a
                    href={`/editor/${p.id}`}
                    className="font-heading font-semibold text-sm text-foreground hover:text-accent truncate block transition-colors"
                  >
                    {p.name}
                  </a>
                  <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                    <span className="font-mono text-[11px]">/{p.slug}</span>
                    {p.tagline && (
                      <>
                        <span>•</span>
                        <span className="truncate max-w-[200px] sm:max-w-xs">{p.tagline}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0 ml-11 sm:ml-0 text-xs">
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                    p.published
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                      : 'bg-surface-raised text-muted-foreground border border-border/40'
                  }`}
                >
                  {p.published ? 'Published' : 'Draft'}
                </span>

                <span className="text-[11px] text-muted-foreground hidden md:inline">
                  {formatDateShort(p.updated_at)}
                </span>

                <div className="flex items-center gap-1.5">
                  <a
                    href={`/${viewerUsername || 'user'}/${p.slug}`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-2.5 py-1 rounded bg-surface border border-border/50 hover:bg-surface-raised text-foreground text-[11px] font-medium transition-colors"
                  >
                    Preview
                  </a>
                  <a
                    href={`/editor/${p.id}`}
                    className="px-2.5 py-1 rounded bg-accent text-accent-foreground hover:bg-accent-hover text-[11px] font-medium transition-colors"
                  >
                    Editor
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Section: Credited on */}
      {creditedProjects.length > 0 && (
        <div className="mt-12">
          <div className="flex items-center gap-2.5 mb-6">
            <Users className="h-5 w-5 text-foreground/80" />
            <h2 className="font-heading text-xl font-bold tracking-tight text-foreground">
              Credited on
            </h2>
            <span className="text-xs font-mono text-muted-foreground px-2 py-0.5 rounded-full bg-surface-raised border border-border/40">
              {creditedProjects.length}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {creditedProjects.map((c) => {
              const project = c.project;
              const ownerUsername = project.owner?.username;
              const publicUrl = `/${ownerUsername}/${project.slug}`;
              return (
                <a
                  key={c.id}
                  href={publicUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="group block"
                >
                  <div className="relative rounded-lg overflow-hidden border border-border/30 hover:border-border/60 transition-all duration-200 aspect-[3/4] bg-surface/30">
                    <div className="absolute inset-3 rounded bg-white/[0.02] border border-white/[0.03] p-4 flex flex-col gap-2.5 overflow-hidden">
                      <div className="h-3 w-3/5 rounded-sm bg-foreground/[0.07]" />
                      <div className="h-0.5" />
                      <div className="h-2 w-full rounded-sm bg-foreground/[0.04]" />
                      <div className="h-2 w-5/6 rounded-sm bg-foreground/[0.04]" />
                      <div className="h-2 w-full rounded-sm bg-foreground/[0.04]" />
                      <div className="h-2 w-2/3 rounded-sm bg-foreground/[0.04]" />
                    </div>

                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-4 pt-12">
                      <h3 className="font-heading font-bold text-sm text-white truncate">
                        {project.name}
                      </h3>
                      <p className="text-[11px] text-white/50 mt-0.5 truncate">
                        by @{ownerUsername} · {c.display_role || 'Contributor'}
                      </p>
                    </div>
                  </div>
                </a>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
