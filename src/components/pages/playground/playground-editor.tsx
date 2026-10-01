import { useEffect, useMemo, useState } from 'react';
import { useCreateBlockNote } from '@blocknote/react';
import { BlockNoteView } from '@blocknote/shadcn';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogPopup,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/animate-ui/components/base/alert-dialog';
import '@blocknote/shadcn/style.css';

import '@/styles/global.css';

const STORAGE_KEY = 'showcrate-playground-data';

const DEFAULT_CONTENT = [
  {
    type: 'heading',
    content: 'Playground',
  },
  {
    type: 'paragraph',
    content:
      'Content is automatically saved to the local storage and is not lost on page reload',
  },
  {
    type: 'paragraph',
    content:
      'Start typing, use the slash (/) command to add blocks, or drag the handles on the left to reorder them.',
  },
];

export function PlaygroundEditor() {
  const [isMounted, setIsMounted] = useState(false);

  const initialContent = useMemo(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.error('Playground storage parse error:', e);
      localStorage.removeItem(STORAGE_KEY); // Clear corrupted data
    }
    return DEFAULT_CONTENT;
  }, []);

  const editor = useCreateBlockNote({ initialContent });

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return (
      <div className='flex-1 flex items-center justify-center min-h-[60vh]'>
        <p className='text-muted-foreground animate-pulse font-mono text-sm'>
          Loading editor...
        </p>
      </div>
    );
  }

  return (
    <div className='flex mx-[1em]'>
      <div className='fixed bottom-2 right-2'>
        <AlertDialog>
          <AlertDialogTrigger>
            <Button variant='destructive' size='lg' className='relative'>
              Reset
            </Button>
          </AlertDialogTrigger>
          <AlertDialogPopup>
            <AlertDialogHeader>
              <AlertDialogTitle>Reset the playground?</AlertDialogTitle>
              <AlertDialogDescription>
                This deletes everything you've written here from local storage. This can't be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  localStorage.removeItem(STORAGE_KEY);
                  window.location.reload();
                }}
              >
                Reset
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogPopup>
        </AlertDialog>
      </div>

      <div className='bg-background rounded-lg border border-border shadow-sm flex-1 overflow-hidden'>
        <BlockNoteView
          editor={editor}
          theme='dark'
          onChange={() => {
            try {
              localStorage.setItem(
                STORAGE_KEY,
                JSON.stringify(editor.document),
              );
            } catch (e) {
              console.error('Failed to save to local storage', e);
            }
          }}
        />
      </div>
    </div>
  );
}