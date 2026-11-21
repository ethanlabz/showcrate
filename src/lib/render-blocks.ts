/**
 * render-blocks.ts — Server-side BlockNote JSON → HTML renderer
 *
 * Converts the BlockNote block array stored in doc_pages.content (JSONB)
 * into safe HTML for the public docs renderer.
 *
 * Rules:
 * - All text is escaped. No user-supplied string reaches set:html / innerHTML.
 * - Styling props map to a fixed class allowlist — never inline styles.
 * - Link hrefs are limited to http / https / mailto.
 * - Image srcs must start with the Supabase storage URL or be data-less.
 * - Shiki code highlighting is applied server-side for code blocks.
 * - Unknown block types are silently skipped (never error on bad data).
 */

import { createHighlighter, type Highlighter } from 'shiki';

// ── Singleton highlighter ──────────────────────────────────────────────────
let _highlighter: Highlighter | null = null;

async function getShiki(): Promise<Highlighter> {
  if (_highlighter) return _highlighter;
  _highlighter = await createHighlighter({
    themes: ['github-dark', 'github-light'],
    langs: [
      'javascript', 'typescript', 'tsx', 'jsx', 'html', 'css', 'json',
      'bash', 'shell', 'python', 'rust', 'go', 'sql', 'markdown', 'yaml',
      'toml', 'diff', 'plaintext',
    ],
  });
  return _highlighter!;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function esc(str: unknown): string {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const ALLOWED_SCHEMES = /^(https?:|mailto:)/i;
const STORAGE_HOST_PATTERN = /supabase\.co\/storage/i;

function safeHref(url: unknown): string {
  if (typeof url !== 'string') return '';
  const trimmed = url.trim();
  if (!ALLOWED_SCHEMES.test(trimmed)) return '';
  return esc(trimmed);
}

function safeImageSrc(url: unknown): string {
  if (typeof url !== 'string') return '';
  const trimmed = url.trim();
  if (!STORAGE_HOST_PATTERN.test(trimmed) && !trimmed.startsWith('/')) return '';
  return esc(trimmed);
}

// Text colour → Tailwind class allowlist
const TEXT_COLOUR_MAP: Record<string, string> = {
  default: '',
  gray: 'text-text-muted',
  brown: 'text-amber-800 dark:text-amber-400',
  orange: 'text-orange-600 dark:text-orange-400',
  yellow: 'text-yellow-600 dark:text-yellow-400',
  green: 'text-emerald-600 dark:text-emerald-400',
  blue: 'text-blue-600 dark:text-blue-400',
  purple: 'text-purple-600 dark:text-purple-400',
  pink: 'text-pink-600 dark:text-pink-400',
  red: 'text-red-600 dark:text-red-400',
};

// Background colour → Tailwind class allowlist
const BG_COLOUR_MAP: Record<string, string> = {
  default: '',
  gray: 'bg-surface-raised',
  brown: 'bg-amber-100 dark:bg-amber-900/30',
  orange: 'bg-orange-100 dark:bg-orange-900/30',
  yellow: 'bg-yellow-100 dark:bg-yellow-900/30',
  green: 'bg-emerald-100 dark:bg-emerald-900/30',
  blue: 'bg-blue-100 dark:bg-blue-900/30',
  purple: 'bg-purple-100 dark:bg-purple-900/30',
  pink: 'bg-pink-100 dark:bg-pink-900/30',
  red: 'bg-red-100 dark:bg-red-900/30',
};

// Text alignment → Tailwind class allowlist
const ALIGN_MAP: Record<string, string> = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right',
};

function getTextClass(colour: unknown): string {
  return TEXT_COLOUR_MAP[String(colour)] ?? '';
}
function getBgClass(colour: unknown): string {
  return BG_COLOUR_MAP[String(colour)] ?? '';
}
function getAlignClass(align: unknown): string {
  return ALIGN_MAP[String(align)] ?? 'text-left';
}

// ── Inline content renderer ────────────────────────────────────────────────

type InlineContent = {
  type: string;
  text?: string;
  styles?: {
    bold?: boolean;
    italic?: boolean;
    underline?: boolean;
    strikethrough?: boolean;
    code?: boolean;
    textColor?: string;
    backgroundColor?: string;
  };
  href?: string;
  content?: InlineContent[];
};

function renderInline(content: unknown[]): string {
  if (!Array.isArray(content)) return '';
  return content
    .map((item) => {
      if (!item || typeof item !== 'object') return '';
      const ic = item as InlineContent;

      if (ic.type === 'link') {
        const href = safeHref(ic.href);
        if (!href) return renderInline(ic.content ?? []);
        return `<a href="${href}" rel="nofollow ugc noopener noreferrer" class="text-link hover:text-link-hover underline underline-offset-2 transition-colors">${renderInline(ic.content ?? [])}</a>`;
      }

      if (ic.type === 'text' || !ic.type) {
        let html = esc(ic.text ?? '');
        if (!html) return '';

        const s = ic.styles ?? {};
        const colourClass = getTextClass(s.textColor);
        const bgClass = getBgClass(s.backgroundColor);

        if (s.bold) html = `<strong class="font-semibold">${html}</strong>`;
        if (s.italic) html = `<em class="italic">${html}</em>`;
        if (s.underline) html = `<span class="underline">${html}</span>`;
        if (s.strikethrough) html = `<s class="line-through opacity-70">${html}</s>`;
        if (s.code) html = `<code class="font-mono text-[0.875em] bg-surface-raised border border-border/60 px-1.5 py-0.5 rounded text-accent">${html}</code>`;
        if (colourClass || bgClass) {
          html = `<span class="${[colourClass, bgClass].filter(Boolean).join(' ')}">${html}</span>`;
        }

        return html;
      }

      return '';
    })
    .join('');
}

// ── Block renderer ─────────────────────────────────────────────────────────

type Block = {
  id?: string;
  type: string;
  props?: Record<string, unknown>;
  content?: unknown;
  children?: Block[];
};

async function renderBlock(block: Block, shiki: Highlighter): Promise<string> {
  if (!block || typeof block !== 'object') return '';

  const type = block.type ?? '';
  const props = block.props ?? {};
  const content = Array.isArray(block.content) ? block.content : [];
  const children = Array.isArray(block.children) ? block.children : [];

  const alignClass = getAlignClass(props.textAlignment);
  const colourClass = getTextClass(props.textColor);

  // Render children blocks (nested)
  const childrenHtml = children.length
    ? `<div class="pl-5 mt-1 space-y-1 border-l-2 border-border/40">${(await Promise.all(children.map((c) => renderBlock(c, shiki)))).join('')}</div>`
    : '';

  switch (type) {
    // ── Paragraph ──
    case 'paragraph': {
      const inner = renderInline(content);
      if (!inner && !children.length) return '<p class="min-h-[1.5em]"></p>';
      return `<p class="${[alignClass, colourClass, 'leading-7'].filter(Boolean).join(' ')}">${inner}</p>${childrenHtml}`;
    }

    // ── Headings ──
    case 'heading': {
      const level = Number(props.level) || 1;
      const inner = renderInline(content);
      const tag = `h${Math.min(Math.max(level, 1), 6)}`;
      const headingClasses: Record<number, string> = {
        1: 'font-display text-3xl sm:text-4xl font-bold tracking-tight text-foreground mt-10 mb-4',
        2: 'font-display text-2xl font-bold tracking-tight text-foreground mt-8 mb-3',
        3: 'font-display text-xl font-semibold text-foreground mt-6 mb-2',
        4: 'font-display text-lg font-semibold text-foreground mt-4 mb-1',
        5: 'font-display text-base font-semibold text-foreground mt-3 mb-1',
        6: 'font-display text-sm font-semibold text-muted-foreground uppercase tracking-widest mt-3 mb-1',
      };
      return `<${tag} class="${headingClasses[level] ?? headingClasses[1]} ${alignClass}">${inner}</${tag}>${childrenHtml}`;
    }

    // ── Bullet list ──
    case 'bulletListItem': {
      const inner = renderInline(content);
      return `<li class="${[alignClass, colourClass, 'leading-7 pl-1'].filter(Boolean).join(' ')}">${inner}${childrenHtml}</li>`;
    }

    // ── Numbered list ──
    case 'numberedListItem': {
      const inner = renderInline(content);
      return `<li class="${[alignClass, colourClass, 'leading-7 pl-1'].filter(Boolean).join(' ')}">${inner}${childrenHtml}</li>`;
    }

    // ── Check list item ──
    case 'checkListItem': {
      const checked = props.checked === true;
      const inner = renderInline(content);
      const checkIcon = checked
        ? `<span class="inline-flex h-4 w-4 items-center justify-center rounded border border-accent bg-accent/10 mr-2 shrink-0"><svg class="h-2.5 w-2.5 text-accent" fill="none" viewBox="0 0 12 12"><path d="M2 6l3 3 5-5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg></span>`
        : `<span class="inline-flex h-4 w-4 items-center justify-center rounded border border-border mr-2 shrink-0"></span>`;
      return `<li class="flex items-start gap-0 leading-7 ${checked ? 'opacity-60' : ''}"><span class="mt-1.5">${checkIcon}</span><span class="${checked ? 'line-through' : ''}">${inner}</span>${childrenHtml}</li>`;
    }

    // ── Quote ──
    case 'quote': {
      const inner = renderInline(content);
      return `<blockquote class="border-l-4 border-accent/50 pl-4 py-1 my-2 text-text-secondary italic">${inner}${childrenHtml}</blockquote>`;
    }

    // ── Code block ──
    case 'codeBlock': {
      const lang = typeof props.language === 'string' && props.language ? props.language : 'plaintext';
      // content for codeBlock is an array of text items
      const rawCode = content
        .filter((c): c is { type: string; text?: string } => typeof c === 'object' && c !== null)
        .map((c) => (c as any).text ?? '')
        .join('');

      try {
        const highlighted = shiki.codeToHtml(rawCode, {
          lang,
          theme: 'github-dark',
        });
        // Wrap in a container that overrides Shiki's inline background with our surface
        return `<div class="my-4 rounded-lg overflow-hidden border border-border/60 text-sm [&_pre]:p-4 [&_pre]:overflow-x-auto [&_pre]:m-0 [&_.shiki]:bg-surface!">${highlighted}</div>`;
      } catch {
        return `<pre class="my-4 p-4 rounded-lg bg-surface border border-border/60 overflow-x-auto text-sm font-mono"><code>${esc(rawCode)}</code></pre>`;
      }
    }

    // ── Image ──
    case 'image': {
      const src = safeImageSrc(props.url);
      const alt = esc(props.caption ?? props.name ?? '');
      const caption = typeof props.caption === 'string' && props.caption ? props.caption : '';
      if (!src) return '';
      return `<figure class="my-6">
  <img src="${src}" alt="${alt}" class="rounded-lg border border-border/40 max-w-full h-auto mx-auto" loading="lazy" />
  ${caption ? `<figcaption class="text-center text-xs text-muted-foreground mt-2">${esc(caption)}</figcaption>` : ''}
</figure>`;
    }

    // ── Divider / horizontal rule ──
    case 'divider':
    case 'horizontalRule': {
      return `<hr class="my-6 border-border/50" />`;
    }

    // ── Table ──
    case 'table': {
      if (!Array.isArray(block.content)) return '';
      const rows = block.content as Array<{ cells: unknown[][] }>;
      const [headerRow, ...bodyRows] = rows;
      const renderCell = (cell: unknown[], tag: 'th' | 'td') => {
        const cls =
          tag === 'th'
            ? 'px-4 py-2 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide border-b border-border/60'
            : 'px-4 py-2 text-sm border-b border-border/40';
        return `<${tag} class="${cls}">${renderInline(cell)}</${tag}>`;
      };
      const thead = headerRow
        ? `<thead><tr>${(headerRow.cells ?? []).map((c) => renderCell(c, 'th')).join('')}</tr></thead>`
        : '';
      const tbody = bodyRows.length
        ? `<tbody>${bodyRows.map((row) => `<tr class="hover:bg-surface/50 transition-colors">${(row.cells ?? []).map((c) => renderCell(c, 'td')).join('')}</tr>`).join('')}</tbody>`
        : '';
      return `<div class="my-4 overflow-x-auto rounded-lg border border-border/60"><table class="w-full border-collapse text-sm">${thead}${tbody}</table></div>`;
    }

    // ── Callout (custom block) ──
    case 'callout': {
      const kind = String(props.kind ?? props.type ?? 'note');
      const emojiMap: Record<string, string> = { note: 'ℹ️', tip: '💡', warning: '⚠️', danger: '🚨' };
      const colourMapCallout: Record<string, string> = {
        note: 'bg-info-bg border-info/30 text-foreground',
        tip: 'bg-success-bg border-success/30 text-foreground',
        warning: 'bg-warning-bg border-warning/30 text-foreground',
        danger: 'bg-error-bg border-error/30 text-foreground',
      };
      const emoji = emojiMap[kind] ?? 'ℹ️';
      const cls = colourMapCallout[kind] ?? colourMapCallout.note;
      const inner = renderInline(content);
      return `<div class="my-4 flex gap-3 rounded-lg border px-4 py-3 ${cls}">
  <span class="shrink-0 mt-0.5 text-base">${emoji}</span>
  <div class="leading-7 text-sm">${inner}</div>
</div>${childrenHtml}`;
    }

    default:
      // Unknown block type — skip silently, never error
      return '';
  }
}

// ── List grouping helper ───────────────────────────────────────────────────
// Wraps consecutive bullet/numbered/check list items in <ul>/<ol>/<ul> tags.

type ListGroup = {
  listType: 'ul' | 'ol';
  items: string[];
  checkList?: boolean;
};

function groupListItems(htmlParts: { type: string; html: string }[]): string {
  const output: string[] = [];
  let currentGroup: ListGroup | null = null;

  const flushGroup = () => {
    if (!currentGroup) return;
    const tag = currentGroup.listType;
    const cls =
      currentGroup.listType === 'ul'
        ? currentGroup.checkList
          ? 'my-3 space-y-1.5 list-none pl-0'
          : 'my-3 space-y-1 list-disc pl-6 marker:text-accent'
        : 'my-3 space-y-1 list-decimal pl-6 marker:text-accent';
    output.push(`<${tag} class="${cls}">${currentGroup.items.join('')}</${tag}>`);
    currentGroup = null;
  };

  for (const part of htmlParts) {
    if (part.type === 'bulletListItem' || part.type === 'checkListItem') {
      if (!currentGroup || currentGroup.listType !== 'ul') {
        flushGroup();
        currentGroup = { listType: 'ul', items: [], checkList: part.type === 'checkListItem' };
      }
      currentGroup.items.push(part.html);
    } else if (part.type === 'numberedListItem') {
      if (!currentGroup || currentGroup.listType !== 'ol') {
        flushGroup();
        currentGroup = { listType: 'ol', items: [] };
      }
      currentGroup.items.push(part.html);
    } else {
      flushGroup();
      output.push(part.html);
    }
  }

  flushGroup();
  return output.join('\n');
}

// ── Main export ────────────────────────────────────────────────────────────

export async function renderBlocks(contentJson: string): Promise<string> {
  if (!contentJson || contentJson === '[]' || contentJson === 'null') {
    return '';
  }

  let blocks: Block[];
  try {
    const parsed = JSON.parse(contentJson);
    if (!Array.isArray(parsed)) return '';
    blocks = parsed;
  } catch {
    // Not valid JSON — return nothing, never expose raw content
    return '';
  }

  const shiki = await getShiki();

  const parts = await Promise.all(
    blocks.map(async (block) => ({
      type: block.type ?? '',
      html: await renderBlock(block, shiki),
    }))
  );

  return groupListItems(parts);
}
