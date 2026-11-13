import { Button } from '@/components/ui/button';
import { FolderKanban, BookMarked } from 'lucide-react';

type Project = {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  visibility: string;
  updated_at: string;
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

export function Projects({ projects, viewer }: Props) {
  return (
    <>
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
        href='/dashboard'
        className='mt-3 inline-block text-xs text-muted-foreground hover:underline'
      >
        Show all →
      </a>
    </>
  );
}
