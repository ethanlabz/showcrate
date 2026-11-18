import { useEffect, useMemo, useRef, useState } from 'react';
import { useCreateBlockNote } from '@blocknote/react';
import { BlockNoteView } from '@blocknote/shadcn';
import '@blocknote/shadcn/style.css';
import { ArrowUpRight, Check, Folder, Loader2, RotateCcw } from 'lucide-react';

const STORAGE_KEY = 'showcrate-homepage-demo';
const SAVE_DEBOUNCE_MS = 400;

const DEFAULT_CONTENT = [
  { type: 'heading', props: { level: 1 }, content: 'Showcrate' },
  {
    type: 'paragraph',
    content: 'Write your project documentation in blocks. It saves as you type.',
  },
  {
    type: 'paragraph',
    content:
      'Type "/" for commands, or drag the handle on the left to reorder blocks.',
  },
  { type: 'bulletListItem', content: 'Live autosave' },
  { type: 'bulletListItem', content: 'No markup to write' },
  { type: 'bulletListItem', content: 'Edit this text - it is yours to break' },
];

type SaveStatus = 'idle' | 'saving' | 'saved';
type Theme = 'light' | 'dark';

function detectTheme(): Theme {
  if (typeof document === 'undefined') return 'dark';
  const root = document.documentElement;
  return root.classList.contains('dark') || root.dataset.theme === 'dark'
    ? 'dark'
    : 'light';
}

/** Follows the site theme toggle instead of hard-coding dark. */
function useSiteTheme(): Theme {
  const [theme, setTheme] = useState<Theme>(detectTheme);

  useEffect(() => {
    const root = document.documentElement;
    const observer = new MutationObserver(() => setTheme(detectTheme()));
    observer.observe(root, {
      attributes: true,
      attributeFilter: ['class', 'data-theme'],
    });
    return () => observer.disconnect();
  }, []);

  return theme;
}

function loadContent() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.error('Demo storage parse error:', e);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* storage unavailable */
    }
  }
  return DEFAULT_CONTENT;
}

function SaveIndicator({ status }: { status: SaveStatus }) {
  return (
    <span
      aria-live='polite'
      className='hidden sm:flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground select-none min-w-[4.5rem]'
    >
      {status === 'saving' && (
        <>
          <Loader2 className='h-3 w-3 animate-spin' />
          Saving
        </>
      )}
      {status === 'saved' && (
        <>
          <Check className='h-3 w-3 text-primary' />
          Saved
        </>
      )}
    </span>
  );
}

export function InteractiveEditor() {
  const theme = useSiteTheme();
  const [status, setStatus] = useState<SaveStatus>('idle');
  const saveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );

  const initialContent = useMemo(loadContent, []);

  const editor = useCreateBlockNote({
    initialContent: initialContent as any,
    domAttributes: { editor: { spellcheck: 'false' } },
  });

  useEffect(() => () => clearTimeout(saveTimer.current), []);

  const handleChange = () => {
    setStatus('saving');
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(editor.document));
        setStatus('saved');
      } catch (e) {
        console.error('Failed to save to local storage', e);
        setStatus('idle');
      }
    }, SAVE_DEBOUNCE_MS);
  };

  const handleReset = () => {
    editor.replaceBlocks(editor.document, DEFAULT_CONTENT as any);
  };

  return (
    <div className='relative w-full'>
      {/* Soft ambient glow */}
      <div
        aria-hidden='true'
        className='pointer-events-none absolute -inset-x-6 -inset-y-10 rounded-[2rem] bg-primary/10 blur-3xl'
      />

      <div className='relative overflow-hidden rounded-2xl border border-border/70 bg-card/80 shadow-2xl shadow-black/10 backdrop-blur-xl transition-colors duration-500 hover:border-primary/40'>
        {/* Window chrome */}
        <div className='flex items-center justify-between gap-3 border-b border-border/70 bg-muted/30 px-4 py-2.5'>
          <div className='flex items-center gap-4 min-w-0'>
            <div className='flex gap-1.5' aria-hidden='true'>
              <span className='h-2.5 w-2.5 rounded-full bg-foreground/15' />
              <span className='h-2.5 w-2.5 rounded-full bg-foreground/15' />
              <span className='h-2.5 w-2.5 rounded-full bg-foreground/15' />
            </div>
            <div className='hidden sm:flex items-center gap-1.5 truncate font-mono text-[11px] text-muted-foreground select-none'>
              <Folder className='h-3.5 w-3.5 shrink-0' />
              <span>overview</span>
              <span className='text-border'>/</span>
              <span className='text-foreground'>index</span>
            </div>
          </div>

          <div className='flex items-center gap-1.5'>
            <SaveIndicator status={status} />
            <button
              type='button'
              onClick={handleReset}
              aria-label='Reset demo content'
              title='Reset demo content'
              className='flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground'
            >
              <RotateCcw className='h-3.5 w-3.5' />
            </button>
            <a
              href='/playground'
              title='Open in Playground'
              className='group flex h-7 items-center gap-1 rounded-md bg-primary/10 px-2.5 text-primary transition-colors hover:bg-primary/20'
            >
              <span className='text-[11px] font-semibold tracking-wide'>
                Playground
              </span>
              <ArrowUpRight className='h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5' />
            </a>
          </div>
        </div>

        {/* Editor surface */}
        <div className='min-h-[22rem] px-1 py-6 sm:px-4 sm:py-8 [&_.bn-container]:bg-transparent [&_.bn-editor]:bg-transparent'>
          <BlockNoteView
            editor={editor}
            theme={theme}
            onChange={handleChange}
          />
        </div>
      </div>
    </div>
  );
}