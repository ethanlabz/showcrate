import { Button } from "@/components/ui/button";
import { FolderKanban, BookMarked } from "lucide-react";

type Project = {
  id: string;
  name: string;
  tagline: string;
  visibility: string;
  updated_at: string;
  slug: string;
  owner: { username: string };
};

interface Props {
  projects: Project[];
  viewer: {
    id: string;
    username: string | null;
    display_name?: string | null;
    displayName?: string | null;
    avatar_url?: string | null;
    avatarUrl?: string | null;
  };
}

export function LeftRail({ projects, viewer }: Props) {
  return (
    <aside className='hidden lg:flex lg:flex-col gap-3 border-r border-border sticky top-0 md:h-screen p-6 bg-surface/90'>
      <div className='flex items-center justify-between mb-3'>
        <h2 className='text-sm font-semibold text-foreground'>Top projects</h2>
        <a href='/new'>
          <Button size='md' className='px-4 h-8'>
            <BookMarked />
            New
          </Button>
        </a>
      </div>

      <div className='relative mb-2'>
        <input
          type='text'
          placeholder='Find a project...'
          className='w-full p-3 py-1.5 text-sm rounded-md border border-foreground/30 bg-surface focus:outline-none focus:ring-1 focus:ring-primary'
          data-project-filter
        />
      </div>

      <ul className='space-y-0.5' data-project-list>
        {projects && projects.length > 0 ? (
          projects.map((p) => (
            <li key={p.id}>
              <a
                href={`/${p.owner.username}/${p.slug}`}
                className='flex items-center gap-2 px-2 py-1.5 rounded-md text-sm hover:bg-muted/40 truncate'
                data-project-name={`${p.owner.username}/${p.slug}`.toLowerCase()}
              >
                <FolderKanban className='w-3.5 h-3.5 shrink-0 text-muted-foreground' />
                <span className='truncate'>
                  {p.owner.username}/{p.slug}
                </span>
              </a>
            </li>
          ))
        ) : (
          <li className='px-2 py-1.5 text-sm text-muted-foreground'>
            No projects yet.
          </li>
        )}
      </ul>

      <a
        href='/settings/profile'
        className='mt-3 inline-block text-xs text-muted-foreground hover:underline'
      >
        Show all →
      </a>
    </aside>
  );
}