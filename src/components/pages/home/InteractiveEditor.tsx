import { memo, useEffect, useRef, useState } from "react";
import { motion, Reorder } from "framer-motion";

/**
 * Static script for the intro "reveal" animation.
 * Mirrors the real v1 block set (schema.ts): heading, paragraph,
 * callout, code, bulleted list.
 */
type Segment = { text: string; bold?: boolean };

type Block =
  | { id: string; type: "heading"; segments: Segment[] }
  | { id: string; type: "paragraph"; segments: Segment[] }
  | { id: string; type: "callout"; tone: "tip"; segments: Segment[] }
  | { id: string; type: "bulleted"; items: string[] }
  | { id: string; type: "code"; language: "javascript"; lines: CodeToken[][] };

type CodeToken = { text: string; className?: string };

const INITIAL_BLOCKS: Block[] = [
  {
    id: "b1",
    type: "heading",
    segments: [{ text: "Showcrate" }],
  },
  {
    id: "b2",
    type: "paragraph",
    segments: [
      { text: "The fastest way to build " },
      { text: "live", bold: true },
      { text: " docs." },
    ],
  },
  {
    id: "b3",
    type: "callout",
    tone: "tip",
    segments: [
      {
        text: "Drag the handle to reorder blocks. No markup to write.",
      },
    ],
  },
  {
    id: "b4",
    type: "code",
    language: "javascript",
    lines: [
      [
        { text: "import", className: "text-[#ff7b72]" },
        { text: " { serve } " },
        { text: "from", className: "text-[#ff7b72]" },
        { text: ' "showcrate"' + ";", className: "text-[#a5d6ff]" },
      ],
      [{ text: "" }],
      [
        { text: "serve", className: "text-[#d2a8ff]" },
        { text: "(() => " },
        { text: "new", className: "text-[#ff7b72]" },
        { text: " Response(" },
        { text: '"Hello!"', className: "text-[#a5d6ff]" },
        { text: "));" },
      ],
    ],
  },
  {
    id: "b5",
    type: "bulleted",
    items: ["Live autosave", "No build step", "Version history built in"],
  },
];

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

function segmentsToVisibleText(segments: Segment[], visibleChars: number) {
  let remaining = visibleChars;
  return segments.map((seg) => {
    const take = Math.max(0, Math.min(seg.text.length, remaining));
    remaining -= take;
    return { ...seg, text: seg.text.slice(0, take) };
  });
}

function totalChars(segments: Segment[]) {
  return segments.reduce((sum, s) => sum + s.text.length, 0);
}

/** Uncontrolled contentEditable — never touches innerHTML. */
const EditableText = memo(function EditableText({
  value,
  onCommit,
  as: Tag = "span",
  className,
  singleLine = false,
}: {
  value: string;
  onCommit: (next: string) => void;
  as?: "span" | "h1" | "p";
  className?: string;
  singleLine?: boolean;
}) {
  const ref = useRef<HTMLElement | null>(null);
  const mountedValue = useRef(value);

  useEffect(() => {
    if (ref.current && ref.current.textContent !== value) {
      ref.current.textContent = value;
    }
  }, [value]);

  return (
    <Tag
      ref={ref as never}
      contentEditable
      suppressContentEditableWarning
      className={className}
      onBlur={(e) => {
        const next = (e.currentTarget.textContent ?? "").trim();
        if (next !== mountedValue.current) {
          mountedValue.current = next;
          onCommit(next || value);
        }
      }}
      onKeyDown={(e) => {
        if (singleLine && e.key === "Enter") {
          e.preventDefault();
          (e.currentTarget as HTMLElement).blur();
        }
      }}
    >
      {value}
    </Tag>
  );
});

function BlockChrome({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="group/block relative flex items-start gap-1 px-1 py-1 rounded-md hover:bg-muted/30 transition-colors">
      <div className="flex items-center gap-0.5 pt-1 opacity-0 group-hover/block:opacity-100 transition-opacity shrink-0 select-none">
        <button
          type="button"
          aria-label="Add block"
          className="h-5 w-5 rounded hover:bg-muted flex items-center justify-center text-muted-foreground transition-colors"
        >
          <span className="text-xs leading-none">+</span>
        </button>
        <button
          type="button"
          aria-label="Drag to reorder"
          className="h-5 w-5 rounded hover:bg-muted flex items-center justify-center text-muted-foreground cursor-grab transition-colors"
        >
          <span className="text-xs leading-none">⠿</span>
        </button>
      </div>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

const HeadingBlock = memo(function HeadingBlock({
  text,
  onCommit,
}: {
  text: string;
  onCommit: (v: string) => void;
}) {
  return (
    <BlockChrome>
      <EditableText
        as="h1"
        value={text}
        onCommit={onCommit}
        singleLine
        className="text-3xl sm:text-4xl font-extrabold bg-clip-text text-transparent bg-linear-to-br from-primary to-secondary tracking-tight outline-none"
      />
    </BlockChrome>
  );
});

const ParagraphBlock = memo(function ParagraphBlock({
  segments,
  onCommit,
}: {
  segments: Segment[];
  onCommit: (v: string) => void;
}) {
  const flat = segments.map((s) => s.text).join("");
  return (
    <BlockChrome>
      <p className="text-base sm:text-lg text-foreground leading-relaxed outline-none">
        <EditableText value={flat} onCommit={onCommit} className="outline-none" />
      </p>
    </BlockChrome>
  );
});

const CalloutBlock = memo(function CalloutBlock({
  text,
  onCommit,
}: {
  text: string;
  onCommit: (v: string) => void;
}) {
  return (
    <BlockChrome>
      <div className="flex gap-2 items-start rounded-lg border border-primary/20 bg-primary/10 px-3 py-2.5">
        <span className="text-primary text-sm mt-0.5" aria-hidden>
          💡
        </span>
        <EditableText
          value={text}
          onCommit={onCommit}
          className="text-sm text-foreground/90 leading-relaxed outline-none flex-1"
        />
      </div>
    </BlockChrome>
  );
});

const BulletedListBlock = memo(function BulletedListBlock({
  items,
  onCommitItem,
}: {
  items: string[];
  onCommitItem: (index: number, v: string) => void;
}) {
  return (
    <BlockChrome>
      <ul className="space-y-1.5">
        {items.map((item, i) => (
          <li key={i} className="flex gap-2 items-start text-sm text-foreground/90">
            <span className="text-primary mt-0.5" aria-hidden>
              •
            </span>
            <EditableText
              value={item}
              onCommit={(v) => onCommitItem(i, v)}
              singleLine
              className="outline-none flex-1"
            />
          </li>
        ))}
      </ul>
    </BlockChrome>
  );
});

const CodeBlockBlock = memo(function CodeBlockBlock({ lines }: { lines: CodeToken[][] }) {
  return (
    <BlockChrome>
      <pre className="bg-[#0d1117] text-[#c9d1d9] p-4 rounded-xl border border-border overflow-x-auto text-xs sm:text-sm font-mono shadow-inner leading-relaxed">
        <code>
          {lines.map((line, i) => (
            <div key={i}>
              {line.length === 0 || (line.length === 1 && line[0].text === "") ? (
                <br />
              ) : (
                line.map((tok, j) => (
                  <span key={j} className={tok.className}>
                    {tok.text}
                  </span>
                ))
              )}
            </div>
          ))}
        </code>
      </pre>
    </BlockChrome>
  );
});

export function InteractiveEditor() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [blocks, setBlocks] = useState<Block[]>(INITIAL_BLOCKS);
  const [revealedCount, setRevealedCount] = useState(0);
  const [typedChars, setTypedChars] = useState(0);
  const [interactive, setInteractive] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  // Single robust effect handling both SSR-safe media queries and the observer
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const isReduced = window.matchMedia(REDUCED_MOTION_QUERY).matches;
    setReducedMotion(isReduced);

    if (isReduced) {
      setRevealedCount(blocks.length);
      setTypedChars(Infinity);
      setInteractive(true);
      return;
    }

    let cancelled = false;
    const timers: ReturnType<typeof setTimeout>[] = [];

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0].isIntersecting || cancelled) return;
        observer.disconnect();
        playIntro();
      },
      { threshold: 0.1 },
    );
    observer.observe(container);

    function playIntro() {
      blocks.forEach((_, i) => {
        timers.push(
          setTimeout(() => {
            if (cancelled) return;
            setRevealedCount(i + 1);
          }, i * 420),
        );
      });

      const paragraph = blocks.find((b) => b.type === "paragraph");
      const paragraphChars = paragraph ? totalChars((paragraph as any).segments) : 0;
      const paragraphStart = 420; // when block b2 becomes visible
      let i = 0;
      const tick = () => {
        if (cancelled) return;
        i++;
        setTypedChars(i);
        if (i < paragraphChars) {
          timers.push(setTimeout(tick, 22));
        }
      };
      timers.push(setTimeout(tick, paragraphStart));

      timers.push(
        setTimeout(() => {
          if (!cancelled) setInteractive(true);
        }, blocks.length * 420 + 300),
      );
    }

    return () => {
      cancelled = true;
      observer.disconnect();
      timers.forEach(clearTimeout);
    };
  }, []);

  function updateBlock(id: string, updater: (b: Block) => Block) {
    setBlocks((prev) => prev.map((b) => (b.id === id ? updater(b) : b)));
  }

  return (
    <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* 
        FIX 1: Removed `editor-window opacity-0 translate-y-12 scale-95` 
        This prevents GSAP's inline styles from conflicting with React's hydration 
      */}
      <div ref={containerRef} className="relative w-full">
        <div className="absolute inset-0 bg-linear-to-r from-primary to-secondary blur-3xl opacity-20 rounded-full" />
        <div className="relative rounded-2xl border border-border bg-background/80 backdrop-blur-xl shadow-2xl overflow-hidden flex flex-col group hover:border-primary/50 transition-colors duration-500">
          
          {/* Window chrome */}
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/80 bg-muted/20 backdrop-blur-md">
            <div className="flex items-center gap-4">
              <div className="flex gap-1.5 sm:gap-2">
                <div className="h-2.5 w-2.5 sm:h-3 sm:w-3 rounded-full bg-[#FF5F56] border border-[#E0443E]" />
                <div className="h-2.5 w-2.5 sm:h-3 sm:w-3 rounded-full bg-[#FFBD2E] border border-[#DEA123]" />
                <div className="h-2.5 w-2.5 sm:h-3 sm:w-3 rounded-full bg-[#27C93F] border border-[#1AAB29]" />
              </div>
              <div className="hidden sm:flex items-center text-[11px] text-muted-foreground font-mono bg-background/50 px-2 py-1 rounded-md border border-border/50 shadow-inner select-none">
                <svg
                  className="w-3 h-3 mr-1.5 text-primary"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
                  />
                </svg>
                overview<span className="mx-1.5 text-border">/</span>
                <span className="text-foreground">index</span>
              </div>
            </div>
            <a
              href="/playground"
              className="flex items-center gap-1.5 h-6 px-2.5 rounded-md bg-primary/10 hover:bg-primary/20 text-primary transition-colors group"
              title="Open in Playground"
            >
              <span className="text-[10px] font-bold uppercase tracking-wider">
                Open in Playground
              </span>
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                />
              </svg>
            </a>
          </div>

          {/* 
            FIX 2: Replaced min-h-87.5 with min-h-[22rem] to ensure standard height support
          */}
          <div className="bg-background p-4 sm:p-8 min-h-88 flex flex-col gap-1 overflow-hidden">
            {blocks.slice(0, interactive ? blocks.length : revealedCount).map((block, i) => {
              const isRevealing = !interactive && i === revealedCount - 1;
              let blockContent = null;

              // Construct the inner block content
              switch (block.type) {
                case "heading":
                  blockContent = (
                    <HeadingBlock
                      text={block.segments[0].text}
                      onCommit={(v) =>
                        updateBlock(block.id, (b) =>
                          b.type === "heading" ? { ...b, segments: [{ text: v }] } : b,
                        )
                      }
                    />
                  );
                  break;
                case "paragraph": {
                  const visible =
                    isRevealing && typedChars !== Infinity
                      ? segmentsToVisibleText(block.segments, typedChars)
                      : block.segments;
                  blockContent = (
                    <ParagraphBlock
                      segments={visible}
                      onCommit={(v) =>
                        updateBlock(block.id, (b) =>
                          b.type === "paragraph" ? { ...b, segments: [{ text: v }] } : b,
                        )
                      }
                    />
                  );
                  break;
                }
                case "callout":
                  blockContent = (
                    <CalloutBlock
                      text={block.segments[0].text}
                      onCommit={(v) =>
                        updateBlock(block.id, (b) =>
                          b.type === "callout" ? { ...b, segments: [{ text: v }] } : b,
                        )
                      }
                    />
                  );
                  break;
                case "bulleted":
                  blockContent = (
                    <BulletedListBlock
                      items={block.items}
                      onCommitItem={(idx, v) =>
                        updateBlock(block.id, (b) => {
                          if (b.type !== "bulleted") return b;
                          const items = [...b.items];
                          items[idx] = v;
                          return { ...b, items };
                        })
                      }
                    />
                  );
                  break;
                case "code":
                  blockContent = <CodeBlockBlock lines={block.lines} />;
                  break;
              }

              // FIX 3: Replaced the manual Tailwind transition string logic with Motion's layout animations
              return (
                <motion.div
                  layout // This tells Motion to automatically animate any layout shifts (like adding/reordering blocks)
                  key={block.id}
                  initial={reducedMotion ? false : { opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                >
                  {blockContent}
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}