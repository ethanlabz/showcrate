import { useEffect, useRef, useState } from "react";
import DOMPurify from "isomorphic-dompurify";

const markdownSource = `# Showcrate

The fastest way to build **live** docs.

> "Just like a README, but interactive."

## Snippets become Workspaces

\`\`\`javascript
import { serve } from "showcrate";

serve(() => new Response("Hello!"));
\`\`\``;

function renderMarkdown(text: string): string {
  const codeBlocks: string[] = [];
  let processedText = text.replace(
    /```[a-z]*\n([\s\S]*?)\n```/gim,
    (_match, code) => {
      codeBlocks.push(code.replace(/</g, "&lt;").replace(/>/g, "&gt;"));
      return `__CODEBLOCK_${codeBlocks.length - 1}__`;
    },
  );

  processedText = processedText
    .replace(
      /^### (.*$)/gim,
      '<h3 class="text-xl font-bold mt-6 mb-2 text-foreground">$1</h3>',
    )
    .replace(
      /^## (.*$)/gim,
      '<h2 class="text-2xl font-bold mt-6 mb-3 text-foreground border-b border-border/30 pb-2">$1</h2>',
    )
    .replace(
      /^# (.*$)/gim,
      '<h1 class="text-3xl sm:text-4xl font-extrabold bg-clip-text text-transparent bg-linear-to-br from-primary to-secondary mb-6 tracking-tight">$1</h1>',
    )
    .replace(
      /^> (.*$)/gim,
      '<blockquote class="border-l-4 border-primary pl-4 py-2 italic text-muted-foreground my-4 bg-primary/10 rounded-r-md">$1</blockquote>',
    )
    .replace(
      /\*\*(.*?)\*\*/gim,
      '<strong class="text-foreground font-bold">$1</strong>',
    )
    .replace(
      /`(.*?)`/gim,
      '<code class="bg-muted px-1.5 py-0.5 rounded text-primary font-mono text-sm border border-border/50">$1</code>',
    )
    .replace(/\n\n/g, '<div class="h-4"></div>')
    .replace(/\n/g, "<br/>");

  processedText = processedText
    .replace(/<\/h([1-6])><br\/>/g, "</h$1>")
    .replace(/<\/blockquote><br\/>/g, "</blockquote>")
    .replace(/<\/div><br\/>/g, "</div>");

  codeBlocks.forEach((code, index) => {
    processedText = processedText.replace(
      `__CODEBLOCK_${index}__`,
      `<pre class="bg-[#0d1117] text-[#c9d1d9] p-4 rounded-xl border border-border mt-4 mb-6 overflow-x-auto text-xs sm:text-sm font-mono shadow-inner leading-relaxed"><code>${code}</code></pre>`,
    );
  });

  return DOMPurify.sanitize(processedText);
}

export function InteractiveEditor() {
  const editorRef = useRef<HTMLTextAreaElement | null>(null);
  const previewRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const tabCodeRef = useRef<HTMLButtonElement | null>(null);
  const tabPreviewRef = useRef<HTMLButtonElement | null>(null);
  const paneCodeRef = useRef<HTMLDivElement | null>(null);
  const panePreviewRef = useRef<HTMLDivElement | null>(null);

  const [previewHtml, setPreviewHtml] = useState("");

  useEffect(() => {
    const editor = editorRef.current;
    const container = containerRef.current;
    if (!editor || !container) return;

    let userTookControl = false;
    let typeWriter: ReturnType<typeof setInterval> | null = null;

    editor.value = "";
    setPreviewHtml(renderMarkdown(""));

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !userTookControl) {
          let i = 0;
          const speed = Math.max(20, Math.floor(4000 / markdownSource.length));

          typeWriter = setInterval(() => {
            if (userTookControl || i >= markdownSource.length) {
              if (typeWriter) clearInterval(typeWriter);
              return;
            }
            const nextValue = markdownSource.substring(0, i + 1);
            editor.value = nextValue;
            editor.scrollTop = editor.scrollHeight;
            setPreviewHtml(renderMarkdown(nextValue));
            i++;
          }, speed);

          observer.disconnect();
        }
      },
      { threshold: 0.4 },
    );

    observer.observe(container);

    const handleFocus = (e: FocusEvent) => {
      if (!e.isTrusted) return;
      userTookControl = true;
    };

    const handleInput = (e: Event) => {
      if (!(e instanceof InputEvent) || !e.isTrusted) return;
      userTookControl = true;
      setPreviewHtml(renderMarkdown((e.target as HTMLTextAreaElement).value));
    };

    editor.addEventListener("focus", handleFocus);
    editor.addEventListener("input", handleInput);

    return () => {
      observer.disconnect();
      if (typeWriter) clearInterval(typeWriter);
      editor.removeEventListener("focus", handleFocus);
      editor.removeEventListener("input", handleInput);
    };
  }, []);

  useEffect(() => {
    const tabCode = tabCodeRef.current;
    const tabPreview = tabPreviewRef.current;
    const paneCode = paneCodeRef.current;
    const panePreview = panePreviewRef.current;

    if (!tabCode || !tabPreview || !paneCode || !panePreview) return;

    const showCode = () => {
      paneCode.classList.remove("hidden");
      paneCode.classList.add("flex");
      panePreview.classList.add("hidden");
      panePreview.classList.remove("flex");

      tabCode.classList.replace("border-transparent", "border-primary");
      tabCode.classList.replace("text-muted-foreground", "text-foreground");
      tabPreview.classList.replace("border-primary", "border-transparent");
      tabPreview.classList.replace("text-foreground", "text-muted-foreground");
    };

    const showPreview = () => {
      panePreview.classList.remove("hidden");
      panePreview.classList.add("flex");
      paneCode.classList.add("hidden");
      paneCode.classList.remove("flex");

      tabPreview.classList.replace("border-transparent", "border-primary");
      tabPreview.classList.replace("text-muted-foreground", "text-foreground");
      tabCode.classList.replace("border-primary", "border-transparent");
      tabCode.classList.replace("text-foreground", "text-muted-foreground");
    };

    tabCode.addEventListener("click", showCode);
    tabPreview.addEventListener("click", showPreview);

    return () => {
      tabCode.removeEventListener("click", showCode);
      tabPreview.removeEventListener("click", showPreview);
    };
  }, []);

  return (
    <div className="w-full max-w-7xl 2xl:max-w-[1700px] mx-auto px-4 sm:px-6 lg:px-8">
      <div
        ref={containerRef}
        id="editor-mockup-container"
        className="editor-window opacity-0 translate-y-12 scale-95 relative w-full max-w-6xl mx-auto"
      >
        <div className="absolute inset-0 bg-linear-to-r from-primary to-secondary blur-3xl opacity-20 rounded-full"></div>
        <div className="relative rounded-2xl border border-border bg-background/80 backdrop-blur-xl shadow-2xl overflow-hidden flex flex-col group hover:border-primary/50 transition-colors duration-500">
          {/* Window Header */}
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/80 bg-muted/20 backdrop-blur-md">
            <div className="flex items-center gap-4">
              <div className="flex gap-1.5 sm:gap-2">
                <div className="h-2.5 w-2.5 sm:h-3 sm:w-3 rounded-full bg-[#FF5F56] border border-[#E0443E]"></div>
                <div className="h-2.5 w-2.5 sm:h-3 sm:w-3 rounded-full bg-[#FFBD2E] border border-[#DEA123]"></div>
                <div className="h-2.5 w-2.5 sm:h-3 sm:w-3 rounded-full bg-[#27C93F] border border-[#1AAB29]"></div>
              </div>

              <div className="hidden sm:flex items-center text-[11px] text-muted-foreground font-mono bg-background/50 px-2 py-1 rounded-md border border-border/50 shadow-inner select-none">
                <svg
                  className="w-3 h-3 mr-1.5 text-primary"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
                  ></path>
                </svg>
                showcrate<span className="mx-1.5 text-border">/</span>
                <span className="text-foreground">README.md</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] font-bold tracking-wide uppercase text-success bg-success/10 border border-success/20 px-2.5 py-1 rounded-full select-none">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-success"></span>
                </span>
                Live
              </div> */}
              <a
                href="/playground"
                className="flex relative z-50 items-center gap-1.5 h-6 px-2.5 rounded-md bg-primary/10 hover:bg-primary/20 text-primary transition-colors cursor-pointer group"
                title="Open in Playground"
              >
                <span className="text-[10px] font-bold uppercase tracking-wider group-hover:text-primary transition-colors">
                  Open in Playground
                </span>
                <svg
                  className="w-3.5 h-3.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                  ></path>
                </svg>
              </a>
            </div>
          </div>

          {/* Mobile Tabs */}
          <div className="sm:hidden flex border-b border-border/80 bg-card">
            <button
              ref={tabCodeRef}
              type="button"
              className="flex-1 py-3 text-xs font-bold border-b-2 border-primary text-foreground transition-colors uppercase tracking-widest"
            >
              Editor
            </button>
            <button
              ref={tabPreviewRef}
              type="button"
              className="flex-1 py-3 text-xs font-bold border-b-2 border-transparent text-muted-foreground transition-colors uppercase tracking-widest"
            >
              Preview
            </button>
          </div>

          {/* Split Content */}
          <div className="grid grid-cols-1 sm:grid-cols-5 divide-y sm:divide-y-0 sm:divide-x divide-border/80">
            {/* Left: Editor Pane */}
            <div
              ref={paneCodeRef}
              className="sm:col-span-3 bg-card/40 p-0 overflow-hidden min-h-62.5 sm:min-h-87.5 flex flex-col font-mono text-sm relative group/editor border-r border-transparent focus-within:border-primary/50 transition-colors"
            >
              <textarea
                ref={editorRef}
                className="w-full h-full min-h-62.5 sm:min-h-87.5 p-4 sm:p-6 bg-transparent text-primary/80 focus:text-primary whitespace-pre-wrap leading-relaxed outline-none resize-none z-10 font-mono placeholder:text-muted-foreground/50 transition-colors"
                spellCheck="false"
                placeholder="Type some markdown here..."
              ></textarea>
              <div className="absolute top-4 right-4 bg-primary/20 text-primary text-[10px] uppercase font-bold px-2 py-1 rounded opacity-50 group-focus-within/editor:opacity-100 transition-opacity pointer-events-none z-20">
                Editable
              </div>
            </div>

            {/* Right: Preview Pane */}
            <div
              ref={panePreviewRef}
              className="hidden sm:flex sm:col-span-2 bg-background flex-col items-center justify-center p-6 min-h-62.5 sm:min-h-87.5 relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-size-[12px_12px]"></div>

              <div
                ref={previewRef}
                className="relative z-10 text-left flex flex-col w-full h-full border border-dashed border-primary/20 rounded-lg bg-card/30 p-4 overflow-y-auto"
                dangerouslySetInnerHTML={{ __html: previewHtml }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
