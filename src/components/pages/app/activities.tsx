import { Button } from '@/components/ui/button';
import { Plus, Bell, BookSearch, Folder } from 'lucide-react';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';

type Activity = {
  id: string;
  title: string;
  created_at: string | number | Date;
  saved_by: {
    avatar_url: string | null | undefined;
    display_name: any;
    username: any;
  };
  page: {
    slug: any;
    project: {
      slug: unknown;
      owner: { username: unknown };
    };
  };
};

interface Props {
  activities: Activity[];
  viewer: {
    id: string;
    username: string | null;
    display_name?: string | null;
    displayName?: string | null;
    avatar_url?: string | null;
    avatarUrl?: string | null;
  };
}

export function Activities({ activities, viewer }: Props) {
  return (
    <div className='space-y-3' data-activity-list>
      {activities && activities.length > 0 ? (
        activities.map((a) => (
          <article
            key={a.id}
            className='border border-border rounded-xl p-4 bg-card/40'
          >
            <div className='flex items-center gap-2 text-sm mb-2'>
              {a.saved_by.avatar_url ? (
                <img
                  src={a.saved_by.avatar_url}
                  className='w-6 h-6 rounded-full'
                  alt={a.saved_by.display_name ?? a.saved_by.username}
                />
              ) : (
                <div className='w-6 h-6 rounded-full bg-muted' />
              )}
              <span className='font-medium'>
                {a.saved_by.display_name ?? a.saved_by.username}
              </span>
              <span className='text-muted-foreground'>updated a page</span>
              <span className='text-muted-foreground text-xs ml-auto'>
                {new Date(a.created_at).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                })}
              </span>
            </div>
            <a
              href={`/${a.page.project.owner.username}/${a.page.project.slug}/docs/${a.page.slug}`}
              className='font-semibold hover:underline'
            >
              {a.title}
            </a>
            <p className='text-xs text-muted-foreground mt-0.5'>
              {String(a.page.project.owner.username)}/
              {String(a.page.project.slug)}
            </p>
          </article>
        ))
      ) : (
        <div className='border border-dashed border-border rounded-xl'>
          <Empty>
            <EmptyHeader>
              <EmptyTitle>No recent activity yet</EmptyTitle>
            </EmptyHeader>
            <EmptyContent>
              <a href='/dashboard/new'>
                <Button>Create your first project</Button>
              </a>
            </EmptyContent>
          </Empty>
        </div>
        // <div className='border border-dashed border-border rounded-xl p-8 text-center'>
        //   <p className='text-sm text-muted-foreground mb-3'>
        //     No recent activity yet.
        //   </p>
        //   <a href='/dashboard/new' className='text-sm text-primary hover:underline'>
        //     Create your first project →
        //   </a>
        // </div>
      )}
    </div>
  );
}
