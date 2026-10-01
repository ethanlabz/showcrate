import { useEffect, useMemo, useRef, useState } from 'react';
import { useCreateBlockNote } from '@blocknote/react';
import { BlockNoteView } from '@blocknote/shadcn';
import '@blocknote/shadcn/style.css';
import { Folder, ArrowUpRight, Plus, GripVertical } from 'lucide-react';

const STORAGE_KEY = 'showcrate-homepage-demo';

// Translated the previous static mockup content into standard BlockNote JSON
const DEFAULT_CONTENT = [
  { type: 'heading', props: { level: 1 }, content: 'Showcrate' },
  { type: 'paragraph', content: 'The fastest way to build live docs.' },
  {
    type: 'paragraph',
    content:
      'Drag the handles on the left to reorder blocks. No markup to write.',
  },
  { type: 'bulletListItem', content: 'Live autosave' },
  { type: 'bulletListItem', content: 'No build step' },
  { type: 'bulletListItem', content: 'Version history built in' },
];

function BlockChrome({ children }: { children: React.ReactNode }) {
  return (
    <div className='group/block relative flex items-start gap-1 px-1 py-1 rounded-md hover:bg-muted/30 transition-colors'>
      <div className='flex items-center gap-0.5 pt-1 opacity-0 group-hover/block:opacity-100 transition-opacity shrink-0 select-none'>
        <button
          type='button'
          aria-label='Add block'
          className='h-5 w-5 rounded hover:bg-muted flex items-center justify-center text-muted-foreground transition-colors'
        >
          {/* 2. Use the Plus SVG perfectly sized to 14px (w-3.5) */}
          <Plus className='w-3.5 h-3.5' />
        </button>
        <button
          type='button'
          aria-label='Drag to reorder'
          className='h-5 w-5 rounded hover:bg-muted flex items-center justify-center text-muted-foreground cursor-grab transition-colors'
        >
          {/* 3. Use the GripVertical SVG perfectly sized to 14px (w-3.5) */}
          <GripVertical className='w-3.5 h-3.5' />
        </button>
      </div>
      <div className='min-w-0 flex-1'>{children}</div>
    </div>
  );
}

export function InteractiveEditor() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  // 1. Safe, sanitized initialization from local storage
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
      console.error('Demo storage parse error:', e);
      localStorage.removeItem(STORAGE_KEY); // Clear corrupted data
    }
    return DEFAULT_CONTENT;
  }, []);

  const editor = useCreateBlockNote({ initialContent: initialContent as any, domAttributes: { editor: { spellcheck: "false" } } });

  // 2. Prevent hydration mismatches by deferring the BlockNote render
  useEffect(() => {
    setIsMounted(true);
  }, []);

  return (
    <div className='w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
      <div ref={containerRef} className='relative w-full'>
        <div className='absolute inset-0 bg-linear-to-r from-primary to-secondary blur-3xl opacity-20 rounded-full' />
        <div className='relative rounded-2xl border border-border bg-background/80 backdrop-blur-xl shadow-2xl overflow-hidden flex flex-col group hover:border-primary/50 transition-colors duration-500'>
          {/* Window chrome from the mockup */}
          <div className='flex items-center justify-between px-4 py-2.5 border-b border-border/80 bg-muted/20 backdrop-blur-md'>
            <div className='flex items-center gap-4'>
              <div className='flex gap-1.5 sm:gap-2'>
                <div className='h-2.5 w-2.5 sm:h-3 sm:w-3 rounded-full bg-[#FF5F56] border border-[#E0443E]' />
                <div className='h-2.5 w-2.5 sm:h-3 sm:w-3 rounded-full bg-[#FFBD2E] border border-[#DEA123]' />
                <div className='h-2.5 w-2.5 sm:h-3 sm:w-3 rounded-full bg-[#27C93F] border border-[#1AAB29]' />
              </div>
              <div className='hidden sm:flex items-center text-[11px] text-muted-foreground font-mono bg-background/50 px-2 py-1 rounded-md border border-border/50 shadow-inner select-none'>
                <Folder className='w-3.5 h-3.5' />
                overview<span className='mx-1.5 text-border'>/</span>
                <span className='text-foreground'>index</span>
              </div>
            </div>
            <a
              href='/playground'
              className='flex items-center gap-1.5 h-6 px-2.5 rounded-md bg-primary/10 hover:bg-primary/20 text-primary transition-colors group'
              title='Open in Playground'
            >
              <span className='text-[10px] font-bold uppercase tracking-wider'>
                Open in Playground
              </span>
              <ArrowUpRight className='w-3.5 h-3.5' />
            </a>
          </div>

          {/* Editor Surface */}
          <div className='bg-background min-h-[22rem] flex flex-col overflow-hidden'>
            {!isMounted ?
              <div className='flex-1 flex items-center justify-center min-h-[22rem]'>
                <p className='text-muted-foreground animate-pulse font-mono text-sm'>
                  Loading editor...
                </p>
              </div>
            : <div className='py-8 sm:px-4 flex-1'>
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
            }
          </div>
        </div>
      </div>
    </div>
  );
}
