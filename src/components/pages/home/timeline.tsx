import * as React from 'react';

interface ChangelogItem {
  version: string;
  date: string;
  title: string;
  changes: string[];
}

const CHANGELOG_ITEMS: ChangelogItem[] = [
  {
    version: 'v0.2.0',
    date: 'November 2026',
    title: 'Modern Architecture & Performance Overhaul',
    changes: [
      'Refactored documentation previews with native CSS design system tokens',
      'Optimized block renderer for BlockNote document trees',
      'Enhanced project navigation and editor loading reliability',
      'Removed unnecessary public editing controls for viewer privacy',
    ],
  },
  {
    version: 'v0.1.0',
    date: 'October 2026',
    title: 'Initial Alpha Release',
    changes: [
      'Interactive BlockNote documentation editor with multi-revision support',
      'Hierarchical page tree organization with drag-and-drop',
      'Public showcase and reader views',
      'Supabase-powered authentication and storage integration',
    ],
  },
];

export function Timeline() {
  return (
    <div className="relative border-l border-border/60 ml-4 sm:ml-8 pl-6 sm:pl-8 space-y-12">
      {CHANGELOG_ITEMS.map((item, idx) => (
        <div key={idx} className="relative group">
          {/* Dot */}
          <div className="absolute -left-[31px] sm:-left-[39px] top-1.5 h-3.5 w-3.5 rounded-full border-2 border-accent bg-background" />

          {/* Header */}
          <div className="flex flex-wrap items-baseline gap-2.5 mb-2">
            <span className="font-mono text-xs font-semibold px-2.5 py-0.5 rounded-full bg-accent/10 text-accent border border-accent/20">
              {item.version}
            </span>
            <span className="text-xs font-mono text-text-muted">{item.date}</span>
          </div>

          <h3 className="font-display text-xl font-bold text-foreground mb-3">
            {item.title}
          </h3>

          <ul className="space-y-2 text-sm text-text-secondary list-disc pl-4">
            {item.changes.map((change, cIdx) => (
              <li key={cIdx} className="leading-relaxed">
                {change}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
