import { useEffect, useMemo, useState } from "react";
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/shadcn";
import "@blocknote/shadcn/style.css";

const STORAGE_KEY = "showcrate-playground-content";

const DEFAULT_CONTENT = [
  {
    type: "heading",
    content: "Showcrate Playground",
  },
  {
    type: "paragraph",
    content: "Start typing, use the slash (/) command to add blocks, or drag the handles on the left to reorder them.",
  },
];

export function PlaygroundEditor() {
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
      console.error("Playground storage parse error:", e);
      localStorage.removeItem(STORAGE_KEY); // Clear corrupted data
    }
    return DEFAULT_CONTENT;
  }, []);

  const editor = useCreateBlockNote({ initialContent });

  // 2. Prevent hydration mismatches by deferring the render
  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[60vh]">
        <p className="text-muted-foreground animate-pulse font-mono text-sm">
          Loading editor...
        </p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-5xl mx-auto py-12 px-4 sm:px-6 lg:px-8 flex-1 flex flex-col">
      <div className="mb-8 border-b border-border pb-4 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight mb-2 text-foreground">Playground</h1>
          <p className="text-muted-foreground text-sm flex items-center gap-2 font-medium">
            <span 
              className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]" 
              aria-hidden="true" 
            />
            Changes are saved locally to your browser
          </p>
        </div>
        <button 
          onClick={() => {
            if (confirm("Are you sure you want to clear the playground?")) {
              localStorage.removeItem(STORAGE_KEY);
              window.location.reload();
            }
          }}
          className="text-xs font-mono uppercase tracking-wider text-muted-foreground hover:text-destructive transition-colors px-3 py-1.5 rounded-md border border-border/50 hover:border-destructive/30 hover:bg-destructive/10 cursor-pointer"
        >
          Reset
        </button>
      </div>
      
      {/* 3. The BlockNote editing surface */}
      <div className="bg-background rounded-xl border border-border shadow-sm flex-1 py-8 sm:px-4 overflow-hidden">
        <BlockNoteView
          editor={editor}
          theme="dark"
          onChange={() => {
            try {
              localStorage.setItem(STORAGE_KEY, JSON.stringify(editor.document));
            } catch (e) {
              console.error("Failed to save to local storage", e);
            }
          }}
        />
      </div>
    </div>
  );
}