import React, { useState, useEffect } from "react";
import { RefreshCw, ExternalLink } from "lucide-react";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import rehypeStringify from "rehype-stringify";
import DOMPurify from "isomorphic-dompurify";

interface LivePreviewProps {
  content: string;
}

export function LivePreview({ content }: LivePreviewProps) {
  const [html, setHtml] = useState("");
  const [isRendering, setIsRendering] = useState(false);

  useEffect(() => {
    let isMounted = true;
    
    const renderMarkdown = async () => {
      setIsRendering(true);
      try {
        const file = await unified()
          .use(remarkParse)
          .use(remarkRehype)
          .use(rehypeStringify)
          .process(content);
          
        if (isMounted) {
          // Sanitize the output before rendering (important for user-generated content)
          const cleanHtml = DOMPurify.sanitize(String(file));
          setHtml(cleanHtml);
        }
      } catch (error) {
        console.error("Error rendering markdown:", error);
      } finally {
        if (isMounted) {
          setIsRendering(false);
        }
      }
    };

    // Debounce rendering slightly for performance
    const timeoutId = setTimeout(renderMarkdown, 100);
    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
  }, [content]);

  return (
    <div className="flex h-full w-full flex-col bg-background relative">
      {/* Preview Content Area */}
      <div className="flex-1 overflow-auto relative bg-white dark:bg-zinc-950 p-6 md:p-12">
        {/* Subtle grid background for the preview wrapper */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:12px_12px] pointer-events-none"></div>
        
        <div className="relative z-10 w-full max-w-4xl mx-auto flex flex-col">
          {/* Rendered HTML Container */}
          {/* We use prose classes from tailwind typography if it was installed, 
              but since it might not be, we'll inject custom base styles. */}
          <div 
            className={`
              prose prose-zinc dark:prose-invert max-w-none
              prose-headings:font-bold prose-h1:text-3xl prose-h2:text-2xl
              prose-a:text-primary prose-a:no-underline hover:prose-a:underline
              prose-pre:bg-zinc-900 prose-pre:border prose-pre:border-zinc-800
              ${isRendering ? 'opacity-80' : 'opacity-100'} transition-opacity duration-200
            `}
            dangerouslySetInnerHTML={{ __html: html }}
          />
        </div>
      </div>
    </div>
  );
}
