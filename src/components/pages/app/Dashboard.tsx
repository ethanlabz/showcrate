import { useState, useEffect } from 'react';
import { Plus, Folder, Eye, Calendar, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Project {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  visibility: string;
  published: boolean;
  featured: boolean;
  view_count: number;
  created_at: string;
  updated_at: string;
}

interface DashboardProps {
  username: string;
  initialProjects?: Project[];
}

export default function Dashboard({ username, initialProjects }: DashboardProps) {
  const [projects, setProjects] = useState<Project[]>(initialProjects ?? []);
  const [loading, setLoading] = useState(initialProjects === undefined);
  const [error, setError] = useState('');

  useEffect(() => {
    if (initialProjects !== undefined) return;

    async function fetchProjects() {
      try {
        const res = await fetch(`/api/users/${username}/projects`);
        if (!res.ok) {
          setProjects([]);
          return;
        }
        const json = await res.json();
        setProjects(json.data?.projects ?? []);
      } catch {
        setError('Failed to load projects');
      } finally {
        setLoading(false);
      }
    }
    fetchProjects();
  }, [username, initialProjects]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="h-8 w-48 bg-muted animate-pulse rounded-lg" />
          <div className="h-9 w-32 bg-muted animate-pulse rounded-lg" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-44 bg-muted animate-pulse rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Your Projects
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {projects.length === 0
              ? 'Create your first project to get started'
              : `${projects.length} project${projects.length === 1 ? '' : 's'}`}
          </p>
        </div>
        <a href="/new">
          <Button size="sm" className="gap-2">
            <Plus className="h-4 w-4" />
            New Project
          </Button>
        </a>
      </div>

      {error && (
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      {/* Empty state */}
      {projects.length === 0 && !error && (
        <div className="flex flex-col items-center justify-center py-16 px-4 text-center border border-dashed border-border rounded-xl bg-card/50">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 mb-6">
            <Folder className="h-8 w-8 text-primary" />
          </div>
          <h2 className="text-lg font-semibold text-foreground mb-2">
            No projects yet
          </h2>
          <p className="text-sm text-muted-foreground max-w-sm mb-6">
            Every project deserves a stage. Create your first project and start building beautiful, interactive documentation.
          </p>
          <a href="/new">
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Create your first project
            </Button>
          </a>
        </div>
      )}

      {/* Projects grid */}
      {projects.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project) => (
            <a
              key={project.id}
              href={`/${username}/${project.slug}`}
              className="group relative flex flex-col rounded-xl border border-border bg-card p-5 hover:border-primary/50 hover:shadow-md transition-all duration-200"
            >
              <div className="flex items-start justify-between mb-3">
                <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors truncate pr-2">
                  {project.name}
                </h3>
                <ExternalLink className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-0.5" />
              </div>

              {project.tagline && (
                <p className="text-sm text-muted-foreground line-clamp-2 mb-4 flex-1">
                  {project.tagline}
                </p>
              )}
              {!project.tagline && <div className="flex-1" />}

              <div className="flex items-center gap-4 text-xs text-muted-foreground mt-auto pt-3 border-t border-border/50">
                <span className="flex items-center gap-1">
                  <Eye className="h-3 w-3" />
                  {project.view_count}
                </span>
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${
                    project.visibility === 'public'
                      ? 'bg-emerald-500/10 text-emerald-500'
                      : project.visibility === 'private'
                        ? 'bg-amber-500/10 text-amber-500'
                        : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {project.visibility}
                </span>
                {!project.published && (
                  <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                    draft
                  </span>
                )}
                <span className="flex items-center gap-1 ml-auto">
                  <Calendar className="h-3 w-3" />
                  {new Date(project.updated_at).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                  })}
                </span>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
