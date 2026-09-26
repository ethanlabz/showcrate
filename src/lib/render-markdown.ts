import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import rehypeSlug from 'rehype-slug';
import rehypeStringify from 'rehype-stringify';
import DOMPurify from 'isomorphic-dompurify';
import rehypeShiki from '@shikijs/rehype';

export async function renderMarkdown(rawContent: string): Promise<string> {
  // Step 1: markdown text -> HTML string (unsafe, could contain anything)
  const result = await unified()
    .use(remarkParse)        // parse markdown
    .use(remarkRehype)       // markdown AST -> HTML AST
    .use(rehypeSlug)         // add id="..." to headings
    .use(rehypeShiki, { theme: 'github-dark' }) // syntax highlighting
    .use(rehypeStringify)    // HTML AST -> HTML string
    .process(rawContent);

  const unsafeHtml = String(result);

  // Step 2: sanitize. This is not optional. Ever.
  const safeHtml = DOMPurify.sanitize(unsafeHtml, {
    ALLOWED_TAGS: [
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'a', 'ul', 'ol', 'li',
      'blockquote', 'code', 'pre', 'strong', 'em', 'img', 'table',
      'thead', 'tbody', 'tr', 'th', 'td', 'hr', 'br', 'span'
    ],
    ALLOWED_ATTR: ['href', 'src', 'alt', 'id', 'class', 'title', 'style'],
  });

  return safeHtml;
}
