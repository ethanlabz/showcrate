'use client';

import * as React from 'react';
import { useCreateBlockNote } from '@blocknote/react';
import '@blocknote/shadcn/style.css';

const BlockNoteView = React.lazy(() =>
  import('@blocknote/shadcn').then((mod) => ({ default: mod.BlockNoteView }))
);

import {
  Folder,
  FileText,
  ChevronRight,
  ChevronDown,
  Plus,
  Trash2,
  RotateCcw,
  MoveRight,
  Edit2,
  ArrowLeft,
  Settings,
  History,
  ExternalLink,
  Menu,
  X,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Clock,
  User as UserIcon,
  Globe,
  Lock,
  Trash,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

export interface DocTreeNode {
  id: string;
  parent_id: string | null;
  kind: 'page' | 'folder';
  title: string;
  slug: string | null;
  order_index: number;
  is_index: boolean;
  children?: DocTreeNode[];
}

export interface TrashNode {
  id: string;
  title: string;
  kind: 'page' | 'folder';
  deleted_at: string;
}

export interface PageVersionItem {
  id: string;
  title?: string;
  content?: string;
  revision?: number;
  created_at: string;
  saved_by?: {
    username?: string;
    display_name?: string;
  };
}

export interface EditorWorkspaceProps {
  project: {
    id: string;
    name: string;
    slug: string;
    username: string;
    published: boolean;
    tagline?: string | null;
    visibility?: string;
  };
  tree: DocTreeNode[];
  treeRevision: number;
  initialPage: {
    id: string;
    title: string;
    content: string;
    revision: number;
    schema_version: number;
    is_index?: boolean;
    slug?: string | null;
  };
}

function formatRelativeTime(dateStr: string) {
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const diffSec = Math.floor((now.getTime() - d.getTime()) / 1000);
    if (diffSec < 60) return 'Just now';
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

export function EditorWorkspace({
  project: initialProject,
  tree: initialTree,
  treeRevision: initialTreeRev,
  initialPage,
}: EditorWorkspaceProps) {
  // Project state
  const [projectName, setProjectName] = React.useState(initialProject.name);
  const [projectSlug, setProjectSlug] = React.useState(initialProject.slug);
  const [projectTagline, setProjectTagline] = React.useState(initialProject.tagline ?? '');
  const [projectVisibility, setProjectVisibility] = React.useState(initialProject.visibility ?? 'public');
  const [projectPublished, setProjectPublished] = React.useState(initialProject.published);

  // Tree state
  const [treeNodes, setTreeNodes] = React.useState<DocTreeNode[]>(initialTree);
  const [treeRevision, setTreeRevision] = React.useState(initialTreeRev);
  const [expandedFolders, setExpandedFolders] = React.useState<Set<string>>(() => {
    const set = new Set<string>();
    for (const node of initialTree) {
      if (node.kind === 'folder') set.add(node.id);
    }
    return set;
  });

  // Active page state
  const [activePageId, setActivePageId] = React.useState(initialPage.id);
  const [pageTitle, setPageTitle] = React.useState(initialPage.title);
  const [pageSlug, setPageSlug] = React.useState(initialPage.slug ?? '');
  const [pageRevision, setPageRevision] = React.useState(initialPage.revision);

  // Save states: 'idle' | 'saving' | 'saved' | 'failed' | 'conflict'
  const [saveState, setSaveState] = React.useState<'idle' | 'saving' | 'saved' | 'failed' | 'conflict'>('saved');
  const [saveError, setSaveError] = React.useState<string | null>(null);

  // Side panels: 'none' | 'versions' | 'settings'
  const [activePanel, setActivePanel] = React.useState<'none' | 'versions' | 'settings'>('none');

  // Versions state
  const [versions, setVersions] = React.useState<PageVersionItem[]>([]);
  const [versionsLoading, setVersionsLoading] = React.useState(false);

  // Settings save state
  const [settingsSaving, setSettingsSaving] = React.useState(false);
  const [settingsSuccess, setSettingsSuccess] = React.useState(false);
  const [settingsError, setSettingsError] = React.useState<string | null>(null);

  // Explorer UI state
  const [sidebarOpen, setSidebarOpen] = React.useState(true);
  const [mobileDrawerOpen, setMobileDrawerOpen] = React.useState(false);
  const [sidebarWidth, setSidebarWidth] = React.useState(280);

  // Dynamic Theme state for BlockNote
  const [editorTheme, setEditorTheme] = React.useState<'dark' | 'light'>('dark');

  React.useEffect(() => {
    const updateTheme = () => {
      const isDark = document.documentElement.classList.contains('dark');
      setEditorTheme(isDark ? 'dark' : 'light');
    };
    updateTheme();
    const observer = new MutationObserver(updateTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  // Check URL query param ?panel=versions or ?panel=settings
  React.useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const panel = params.get('panel');
      if (panel === 'versions' || panel === 'settings') {
        setActivePanel(panel);
      }
    } catch {
      // ignore
    }
  }, []);

  // Modal dialog states
  const [createModal, setCreateModal] = React.useState<{
    open: boolean;
    parentId: string | null;
    kind: 'page' | 'folder';
    title: string;
  }>({ open: false, parentId: null, kind: 'page', title: '' });

  const [renameModal, setRenameModal] = React.useState<{
    open: boolean;
    nodeId: string | null;
    currentTitle: string;
    newTitle: string;
  }>({ open: false, nodeId: null, currentTitle: '', newTitle: '' });

  const [moveToModal, setMoveToModal] = React.useState<{
    open: boolean;
    nodeId: string | null;
    targetParentId: string | null;
  }>({ open: false, nodeId: null, targetParentId: null });

  const [trashModal, setTrashModal] = React.useState<{
    open: boolean;
    items: TrashNode[];
    loading: boolean;
  }>({ open: false, items: [], loading: false });

  const [conflictModal, setConflictModal] = React.useState<{
    open: boolean;
    serverContent: string | null;
  }>({ open: false, serverContent: null });

  // BlockNote initial parsed content
  const parsedContent = React.useMemo(() => {
    try {
      if (!initialPage.content || initialPage.content === '[]') return undefined;
      const parsed = JSON.parse(initialPage.content);
      return Array.isArray(parsed) && parsed.length > 0 ? parsed : undefined;
    } catch {
      return undefined;
    }
  }, [initialPage.id]);

  const editor = useCreateBlockNote({
    initialContent: parsedContent as any,
  });

  // Track unsaved changes
  const dirtyRef = React.useRef(false);
  const isSavingRef = React.useRef(false);
  const pendingSaveRef = React.useRef(false);
  const saveTimeoutRef = React.useRef<any>(null);
  const pageRevisionRef = React.useRef(pageRevision);

  React.useEffect(() => {
    pageRevisionRef.current = pageRevision;
  }, [pageRevision]);

  // Hierarchy builder
  const nestedTree = React.useMemo(() => {
    const map = new Map<string, DocTreeNode>();
    const roots: DocTreeNode[] = [];

    for (const n of treeNodes) {
      map.set(n.id, { ...n, children: [] });
    }

    for (const n of treeNodes) {
      const item = map.get(n.id)!;
      if (n.parent_id && map.has(n.parent_id)) {
        map.get(n.parent_id)!.children!.push(item);
      } else {
        roots.push(item);
      }
    }

    const sortFn = (list: DocTreeNode[]) => {
      list.sort((a, b) => a.order_index - b.order_index);
      for (const i of list) {
        if (i.children && i.children.length > 0) sortFn(i.children);
      }
    };

    sortFn(roots);
    return roots;
  }, [treeNodes]);

  // Flush page save
  const flushSave = React.useCallback(
    async (overrideTitle?: string): Promise<boolean> => {
      if (!editor) return true;

      // In-flight mutex protection: prevent overlapping saves
      if (isSavingRef.current) {
        pendingSaveRef.current = true;
        return false;
      }
      isSavingRef.current = true;
      pendingSaveRef.current = false;

      const currentBlocks = editor.document;
      const contentStr = JSON.stringify(currentBlocks);
      const titleToSave = (overrideTitle ?? pageTitle).trim() || 'Untitled';
      const baseRev = typeof pageRevisionRef.current === 'number' ? pageRevisionRef.current : 0;

      setSaveState('saving');
      setSaveError(null);

      try {
        const res = await fetch(`/api/editor/pages/${activePageId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: titleToSave,
            content: contentStr,
            base_revision: baseRev,
          }),
        });

        if (res.status === 409) {
          const rawErr = await res.json().catch(() => ({}));
          const errData = rawErr.data ?? rawErr;
          setSaveState('conflict');
          setSaveError('Stale revision conflict.');
          setConflictModal({
            open: true,
            serverContent: errData.current_content ?? null,
          });
          return false;
        }

        if (!res.ok) {
          const rawErr = await res.json().catch(() => ({}));
          const errMsg = rawErr.error?.message || rawErr.error || rawErr.message || 'Failed to save';
          setSaveState('failed');
          setSaveError(typeof errMsg === 'string' ? errMsg : 'Failed to save');
          return false;
        }

        const resJson = await res.json();
        const data = resJson.data ?? resJson;
        const newRev = typeof data.revision === 'number' ? data.revision : baseRev + 1;
        setPageRevision(newRev);
        pageRevisionRef.current = newRev;
        setSaveState('saved');
        dirtyRef.current = false;
        return true;
      } catch (err: any) {
        setSaveState('failed');
        setSaveError(err.message || 'Network error');
        return false;
      } finally {
        isSavingRef.current = false;
        if (pendingSaveRef.current) {
          pendingSaveRef.current = false;
          setTimeout(() => {
            flushSave();
          }, 150);
        }
      }
    },
    [editor, activePageId, pageTitle],
  );

  // Autosave: debounced by 1000ms
  React.useEffect(() => {
    if (!editor) return;

    const unsubscribe = editor.onChange(() => {
      dirtyRef.current = true;
      setSaveState('saving');

      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      saveTimeoutRef.current = setTimeout(() => {
        flushSave();
      }, 1000);
    });

    return () => {
      unsubscribe();
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [editor, flushSave]);

  // Keyboard shortcut: Cmd+S / Ctrl+S to save immediately, Escape to close panels
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        flushSave();
      } else if (e.key === 'Escape' && activePanel !== 'none') {
        setActivePanel('none');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [flushSave, activePanel]);

  // Fetch versions when panel is opened
  const fetchVersions = React.useCallback(async () => {
    setVersionsLoading(true);
    try {
      const res = await fetch(`/api/projects/${initialProject.id}/versions/${activePageId}?limit=30`);
      if (res.ok) {
        const raw = await res.json();
        const data = raw.data ?? raw;
        setVersions(data.versions || (Array.isArray(data) ? data : []));
      }
    } catch {
      // ignore
    } finally {
      setVersionsLoading(false);
    }
  }, [initialProject.id, activePageId]);

  React.useEffect(() => {
    if (activePanel === 'versions') {
      fetchVersions();
    }
  }, [activePanel, fetchVersions]);

  // Switch to another page
  const handleSelectPage = async (pageId: string) => {
    if (pageId === activePageId) return;

    if (dirtyRef.current) {
      const ok = await flushSave();
      if (!ok) return;
    }

    try {
      const res = await fetch(`/api/editor/pages/${pageId}`);
      if (!res.ok) {
        alert('Could not load page.');
        return;
      }
      const rawRes = await res.json();
      const pageData = rawRes.data ?? rawRes;

      setActivePageId(pageData.id);
      setPageTitle(pageData.title);
      const rev = typeof pageData.revision === 'number' ? pageData.revision : 0;
      setPageRevision(rev);
      pageRevisionRef.current = rev;

      const targetNode = treeNodes.find((n) => n.id === pageId);
      setPageSlug(targetNode?.slug ?? '');

      if (editor) {
        let newBlocks: any[] = [];
        try {
          if (pageData.content && pageData.content !== '[]') {
            newBlocks = JSON.parse(pageData.content);
          }
        } catch {
          newBlocks = [];
        }
        if (newBlocks.length > 0) {
          editor.replaceBlocks(editor.document, newBlocks);
        } else {
          editor.replaceBlocks(editor.document, [
            { type: 'paragraph', content: '' },
          ]);
        }
      }

      window.history.replaceState(null, '', `/editor/${initialProject.id}/${pageId}`);
      setSaveState('saved');
      dirtyRef.current = false;
      setMobileDrawerOpen(false);
    } catch (e) {
      console.error('Failed to switch page:', e);
    }
  };

  // Tree mutation dispatcher
  const dispatchTreeAction = async (payload: any) => {
    try {
      const res = await fetch('/api/editor/tree', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...payload,
          projectId: initialProject.id,
          base_tree_revision: treeRevision,
        }),
      });

      if (res.status === 409) {
        const conflictData = await res.json();
        alert('The structure was modified elsewhere. Syncing latest tree...');
        if (conflictData.tree) setTreeNodes(conflictData.tree);
        if (conflictData.tree_revision !== undefined) setTreeRevision(conflictData.tree_revision);
        return false;
      }

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        alert(errData.error || 'Tree action failed');
        return false;
      }

      const resData = await res.json();
      setTreeRevision(resData.tree_revision);

      if (payload.action === 'create') {
        const newNode = resData.affected_nodes?.[0];
        if (newNode) {
          setTreeNodes((prev) => [...prev, newNode]);
          if (newNode.kind === 'page') {
            handleSelectPage(newNode.id);
          }
        }
      } else if (payload.action === 'rename') {
        setTreeNodes((prev) =>
          prev.map((n) => (n.id === payload.nodeId ? { ...n, title: payload.title } : n)),
        );
        if (payload.nodeId === activePageId) {
          setPageTitle(payload.title);
        }
      } else if (payload.action === 'delete') {
        setTreeNodes((prev) => prev.filter((n) => n.id !== payload.nodeId));
        if (payload.nodeId === activePageId) {
          const remainingPages = treeNodes.filter(
            (n) => n.kind === 'page' && n.id !== payload.nodeId,
          );
          if (remainingPages.length > 0) {
            handleSelectPage(remainingPages[0].id);
          }
        }
      } else if (payload.action === 'move') {
        setTreeNodes((prev) =>
          prev.map((n) => (n.id === payload.nodeId ? { ...n, parent_id: payload.targetParentId } : n)),
        );
      }

      return true;
    } catch (err: any) {
      alert(err.message || 'Network error performing tree action');
      return false;
    }
  };

  // Save project settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSettingsSaving(true);
    setSettingsSuccess(false);
    setSettingsError(null);

    try {
      const res = await fetch(`/api/projects/${initialProject.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: projectName.trim(),
          tagline: projectTagline.trim() || null,
          visibility: projectVisibility,
          published: projectPublished,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to update settings');
      }

      setSettingsSuccess(true);
      setTimeout(() => setSettingsSuccess(false), 3000);
    } catch (err: any) {
      setSettingsError(err.message || 'Failed to save settings');
    } finally {
      setSettingsSaving(false);
    }
  };

  // Delete project
  const handleDeleteProject = async () => {
    if (!confirm('Are you sure you want to permanently delete this project? This action cannot be undone.')) {
      return;
    }

    try {
      const res = await fetch(`/api/projects/${initialProject.id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        throw new Error('Failed to delete project');
      }
      window.location.href = '/dashboard';
    } catch (err: any) {
      alert(err.message || 'Error deleting project');
    }
  };

  // Restore revision
  const handleRestoreVersion = async (v: PageVersionItem) => {
    if (!editor || !v.content) return;
    if (!confirm('Restore this version to the editor? Any unsaved edits will be replaced.')) return;

    try {
      const blocks = JSON.parse(v.content);
      editor.replaceBlocks(editor.document, blocks);
      dirtyRef.current = true;
      await flushSave();
      setActivePanel('none');
    } catch {
      alert('Could not restore this revision format.');
    }
  };

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden bg-background text-foreground font-sans">
      {/* ── 1. Top Header Bar ─────────────────────────────────────────────── */}
      <header className="h-14 border-b border-border/50 bg-background/95 px-4 flex items-center justify-between shrink-0 select-none backdrop-blur z-20">
        <div className="flex items-center gap-3 min-w-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen((v) => !v)}
            className="md:flex hidden text-muted-foreground hover:text-foreground h-8 w-8"
            title="Toggle Explorer"
          >
            <Menu className="h-4 w-4" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileDrawerOpen(true)}
            className="md:hidden flex text-muted-foreground hover:text-foreground h-8 w-8"
            title="Open Explorer"
          >
            <Menu className="h-4 w-4" />
          </Button>

          <a
            href="/dashboard"
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors pr-2 border-r border-border/40"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Dashboard</span>
          </a>

          <div className="flex items-center gap-2 truncate">
            <span className="font-display font-bold text-sm text-foreground truncate">
              {projectName}
            </span>
            <span className="text-muted-foreground/30">•</span>
            <span className="text-xs text-muted-foreground truncate hidden sm:inline">
              {pageTitle}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Save status badge */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-mono border border-border/40">
            {saveState === 'saving' && (
              <>
                <Loader2 className="h-3 w-3 animate-spin text-accent" />
                <span className="text-accent">Saving...</span>
              </>
            )}
            {saveState === 'saved' && (
              <>
                <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                <span className="text-muted-foreground">Saved</span>
              </>
            )}
            {(saveState === 'failed' || saveState === 'conflict') && (
              <>
                <AlertCircle className="h-3 w-3 text-destructive" />
                <span className="text-destructive font-semibold">
                  {saveState === 'conflict' ? 'Conflict (409)' : 'Save failed'}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => flushSave()}
                  className="h-5 px-1.5 text-[10px] ml-1 cursor-pointer"
                >
                  Retry
                </Button>
              </>
            )}
          </div>

          {/* Versions Trigger */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setActivePanel((prev) => (prev === 'versions' ? 'none' : 'versions'))}
            className={`h-8 gap-1.5 text-xs transition-colors cursor-pointer ${
              activePanel === 'versions'
                ? 'bg-surface-raised text-accent font-medium'
                : 'text-muted-foreground hover:text-foreground hover:bg-surface-raised'
            }`}
          >
            <History className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Versions</span>
          </Button>

          {/* Settings Trigger */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setActivePanel((prev) => (prev === 'settings' ? 'none' : 'settings'))}
            className={`h-8 gap-1.5 text-xs transition-colors cursor-pointer ${
              activePanel === 'settings'
                ? 'bg-surface-raised text-accent font-medium'
                : 'text-muted-foreground hover:text-foreground hover:bg-surface-raised'
            }`}
          >
            <Settings className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Settings</span>
          </Button>

          {/* Public Preview Button */}
          <a
            href={`/${initialProject.username}/${projectSlug}`}
            target="_blank"
            rel="noreferrer"
          >
            <Button size="sm" className="h-8 gap-1 text-xs bg-accent text-accent-foreground hover:bg-accent-hover font-medium cursor-pointer">
              <span>Preview</span>
              <ExternalLink className="h-3 w-3" />
            </Button>
          </a>
        </div>
      </header>

      {/* ── 2. Workspace Body: Left Explorer + Center Editor ────────────────── */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Desktop Left Explorer */}
        {sidebarOpen && (
          <aside
            style={{ width: `${sidebarWidth}px` }}
            className="hidden md:flex flex-col border-r border-border/50 bg-surface/40 shrink-0 select-none overflow-hidden"
          >
            <div className="h-10 border-b border-border/40 px-3 flex items-center justify-between text-xs text-muted-foreground">
              <span className="font-mono text-[10px] uppercase tracking-wider font-semibold">
                Explorer
              </span>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() =>
                    setCreateModal({
                      open: true,
                      parentId: null,
                      kind: 'page',
                      title: '',
                    })
                  }
                  title="New Page"
                  className="h-6 w-6 text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() =>
                    setCreateModal({
                      open: true,
                      parentId: null,
                      kind: 'folder',
                      title: '',
                    })
                  }
                  title="New Folder"
                  className="h-6 w-6 text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  <Folder className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            {/* Tree Navigation */}
            <div role="tree" className="flex-1 p-2 overflow-y-auto space-y-0.5">
              {nestedTree.map(function renderTreeNode(node: DocTreeNode) {
                const isFolder = node.kind === 'folder';
                const isExpanded = expandedFolders.has(node.id);
                const isSelected = node.id === activePageId;

                return (
                  <div key={node.id} role="treeitem" aria-expanded={isFolder ? isExpanded : undefined}>
                    <div
                      onClick={() => {
                        if (isFolder) {
                          setExpandedFolders((prev) => {
                            const next = new Set(prev);
                            if (next.has(node.id)) next.delete(node.id);
                            else next.add(node.id);
                            return next;
                          });
                        } else {
                          handleSelectPage(node.id);
                        }
                      }}
                      className={`group flex items-center justify-between px-2 py-1.5 rounded-md text-xs cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-surface-raised text-accent font-medium'
                          : 'text-foreground hover:bg-surface-raised/60'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        {isFolder ? (
                          <>
                            {isExpanded ? (
                              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            ) : (
                              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            )}
                            <Folder className="h-3.5 w-3.5 text-accent shrink-0" />
                          </>
                        ) : (
                          <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        )}
                        <span className="truncate">{node.title}</span>
                      </div>

                      {/* Tree Actions Menu */}
                      <div
                        className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 transition-opacity"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {isFolder && (
                          <button
                            type="button"
                            onClick={() =>
                              setCreateModal({
                                open: true,
                                parentId: node.id,
                                kind: 'page',
                                title: '',
                              })
                            }
                            className="p-1 hover:text-foreground text-muted-foreground rounded"
                            title="Add Page to Folder"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() =>
                            setRenameModal({
                              open: true,
                              nodeId: node.id,
                              currentTitle: node.title,
                              newTitle: node.title,
                            })
                          }
                          className="p-1 hover:text-foreground text-muted-foreground rounded"
                          title="Rename"
                        >
                          <Edit2 className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setMoveToModal({
                              open: true,
                              nodeId: node.id,
                              targetParentId: node.parent_id,
                            })
                          }
                          className="p-1 hover:text-foreground text-muted-foreground rounded"
                          title="Move to..."
                        >
                          <MoveRight className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm(`Move "${node.title}" to trash?`)) {
                              dispatchTreeAction({ action: 'delete', nodeId: node.id });
                            }
                          }}
                          className="p-1 hover:text-destructive text-muted-foreground rounded"
                          title="Delete"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>

                    {isFolder && isExpanded && node.children && node.children.length > 0 && (
                      <div className="pl-4 border-l border-border/30 ml-2 mt-0.5 space-y-0.5">
                        {node.children.map((child) => renderTreeNode(child))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Trash Footer */}
            <div className="p-2 border-t border-border/40">
              <Button
                variant="ghost"
                size="sm"
                onClick={async () => {
                  setTrashModal({ open: true, items: [], loading: true });
                  try {
                    const res = await fetch(`/api/editor/trash?projectId=${initialProject.id}`);
                    if (res.ok) {
                      const data = await res.json();
                      setTrashModal({ open: true, items: data.trash || [], loading: false });
                    }
                  } catch {
                    setTrashModal({ open: true, items: [], loading: false });
                  }
                }}
                className="w-full justify-start gap-2 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Trash</span>
              </Button>
            </div>
          </aside>
        )}

        {/* Center Editor Content */}
        <main className="flex-1 bg-background overflow-y-auto flex justify-center p-6 sm:p-10 lg:p-12">
          <div className="w-full max-w-3xl">
            {/* Editable Title */}
            <div className="mb-6">
              <input
                type="text"
                value={pageTitle}
                onChange={(e) => {
                  setPageTitle(e.target.value);
                  dirtyRef.current = true;
                }}
                onBlur={() => {
                  if (dirtyRef.current) flushSave();
                }}
                placeholder="Page Title"
                className="w-full bg-transparent font-display text-3xl sm:text-4xl font-bold tracking-tight text-foreground placeholder:text-muted-foreground/30 focus:outline-none border-b border-transparent focus:border-border/40 pb-2 transition-colors"
              />
            </div>

            {/* BlockNote editor container without heavy borders */}
            <div className="min-h-[500px] py-2">
              <React.Suspense
                fallback={
                  <div className="flex flex-col gap-3.5 py-6 animate-pulse opacity-60">
                    <div className="h-4 bg-surface-raised rounded w-3/4" />
                    <div className="h-4 bg-surface-raised rounded w-full" />
                    <div className="h-4 bg-surface-raised rounded w-5/6" />
                    <div className="h-4 bg-surface-raised rounded w-2/3" />
                  </div>
                }
              >
                <BlockNoteView editor={editor} theme={editorTheme} />
              </React.Suspense>
            </div>
          </div>
        </main>

        {/* ── 3. Sliding Right Drawer: Versions / Settings ─────────────────────── */}
        {activePanel !== 'none' && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-40 bg-black/50 backdrop-blur-xs animate-in fade-in-0 duration-200"
              onClick={() => setActivePanel('none')}
            />

            {/* Slide-out Sidebar */}
            <aside className="fixed inset-y-0 right-0 z-50 w-full sm:w-[440px] bg-surface border-l border-border/60 shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
              {/* Header */}
              <div className="h-14 border-b border-border/40 px-5 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2.5">
                  {activePanel === 'versions' ? (
                    <History className="h-4 w-4 text-accent" />
                  ) : (
                    <Settings className="h-4 w-4 text-accent" />
                  )}
                  <h2 className="font-display font-bold text-sm text-foreground">
                    {activePanel === 'versions' ? 'Version History' : 'Project Settings'}
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={() => setActivePanel('none')}
                  className="h-8 w-8 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-surface-raised transition-colors cursor-pointer"
                  aria-label="Close panel"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Panel Content */}
              <div className="flex-1 overflow-y-auto p-5">
                {activePanel === 'versions' ? (
                  /* VERSIONS PANEL */
                  <div className="space-y-4">
                    <p className="text-xs text-muted-foreground">
                      History of revisions and automatic snapshots saved for this page.
                    </p>

                    {versionsLoading ? (
                      <div className="flex items-center justify-center py-12 text-muted-foreground gap-2 text-xs">
                        <Loader2 className="h-4 w-4 animate-spin text-accent" />
                        <span>Loading versions...</span>
                      </div>
                    ) : versions.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-border/60 p-8 text-center bg-surface/20">
                        <History className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
                        <h4 className="font-display font-semibold text-foreground text-xs mb-1">
                          No version history yet
                        </h4>
                        <p className="text-[11px] text-muted-foreground max-w-xs mx-auto">
                          As you make and save revisions in the editor, snapshots will appear here.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {versions.map((v, idx) => (
                          <div
                            key={v.id || idx}
                            className="p-3.5 rounded-lg border border-border/40 bg-surface/40 hover:bg-surface-raised/60 transition-colors flex items-start justify-between gap-3"
                          >
                            <div className="space-y-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-accent/10 text-accent font-semibold">
                                  #{v.revision ?? versions.length - idx}
                                </span>
                                <span className="font-display font-semibold text-xs text-foreground truncate">
                                  {v.title || pageTitle}
                                </span>
                              </div>
                              <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <UserIcon className="h-3 w-3" />
                                  <span>{v.saved_by?.display_name || v.saved_by?.username || 'You'}</span>
                                </span>
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  <span>{formatRelativeTime(v.created_at)}</span>
                                </span>
                              </div>
                            </div>

                            {v.content && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleRestoreVersion(v)}
                                className="h-7 px-2 text-[11px] shrink-0 hover:bg-accent hover:text-accent-foreground cursor-pointer"
                              >
                                Restore
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  /* SETTINGS PANEL */
                  <form onSubmit={handleSaveSettings} className="space-y-5">
                    {settingsSuccess && (
                      <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/30 p-3 text-xs text-emerald-400 flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 shrink-0" />
                        <span>Project settings saved successfully.</span>
                      </div>
                    )}

                    {settingsError && (
                      <div className="rounded-lg bg-destructive/10 border border-destructive/30 p-3 text-xs text-destructive">
                        {settingsError}
                      </div>
                    )}

                    {/* Project Name */}
                    <div className="space-y-1.5">
                      <Label htmlFor="panelProjectName" className="text-xs font-medium text-foreground">
                        Project Name
                      </Label>
                      <Input
                        id="panelProjectName"
                        value={projectName}
                        onChange={(e) => setProjectName(e.target.value)}
                        placeholder="My Documentation"
                        className="h-8 text-xs bg-surface border-border/60"
                        required
                      />
                    </div>

                    {/* URL Slug */}
                    <div className="space-y-1.5">
                      <Label htmlFor="panelProjectSlug" className="text-xs font-medium text-foreground">
                        URL Slug
                      </Label>
                      <div className="flex items-center gap-1 text-xs font-mono text-muted-foreground bg-surface-raised/40 border border-border/40 rounded-md px-2.5 h-8">
                        <span>/{initialProject.username}/</span>
                        <input
                          id="panelProjectSlug"
                          value={projectSlug}
                          onChange={(e) => setProjectSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-_]/g, ''))}
                          className="bg-transparent text-foreground focus:outline-none flex-1 font-mono text-xs"
                          placeholder="slug"
                          disabled
                        />
                      </div>
                      <p className="text-[10px] text-muted-foreground">
                        Slugs are set during creation.
                      </p>
                    </div>

                    {/* Tagline */}
                    <div className="space-y-1.5">
                      <Label htmlFor="panelProjectTagline" className="text-xs font-medium text-foreground">
                        Tagline / Summary
                      </Label>
                      <Textarea
                        id="panelProjectTagline"
                        value={projectTagline}
                        onChange={(e) => setProjectTagline(e.target.value)}
                        placeholder="Short summary of what this project documents..."
                        rows={3}
                        maxLength={200}
                        className="text-xs bg-surface border-border/60 resize-none"
                      />
                    </div>

                    {/* Visibility */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-foreground">
                        Visibility
                      </Label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setProjectVisibility('public')}
                          className={`flex items-center gap-2 p-2.5 rounded-lg border text-xs transition-colors cursor-pointer ${
                            projectVisibility === 'public'
                              ? 'border-accent bg-accent/10 text-accent font-medium'
                              : 'border-border/50 bg-surface/50 text-muted-foreground hover:bg-surface-raised'
                          }`}
                        >
                          <Globe className="h-3.5 w-3.5" />
                          <span>Public</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setProjectVisibility('private')}
                          className={`flex items-center gap-2 p-2.5 rounded-lg border text-xs transition-colors cursor-pointer ${
                            projectVisibility === 'private'
                              ? 'border-accent bg-accent/10 text-accent font-medium'
                              : 'border-border/50 bg-surface/50 text-muted-foreground hover:bg-surface-raised'
                          }`}
                        >
                          <Lock className="h-3.5 w-3.5" />
                          <span>Private</span>
                        </button>
                      </div>
                    </div>

                    {/* Publishing Status */}
                    <div className="space-y-1.5 pt-2 border-t border-border/40">
                      <div className="flex items-center justify-between">
                        <div>
                          <Label className="text-xs font-medium text-foreground">
                            Published Status
                          </Label>
                          <p className="text-[11px] text-muted-foreground">
                            {projectPublished
                              ? 'Project is visible on your public showcase'
                              : 'Project is currently draft mode'}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => setProjectPublished((p) => !p)}
                          className={`px-3 py-1 rounded text-xs font-medium border transition-colors cursor-pointer ${
                            projectPublished
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                              : 'bg-surface-raised text-muted-foreground border-border/50'
                          }`}
                        >
                          {projectPublished ? 'Published' : 'Draft'}
                        </button>
                      </div>
                    </div>

                    {/* Save Button */}
                    <div className="pt-3">
                      <Button
                        type="submit"
                        disabled={settingsSaving}
                        className="w-full bg-accent text-accent-foreground hover:bg-accent-hover font-medium text-xs h-9 cursor-pointer"
                      >
                        {settingsSaving ? (
                          <>
                            <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                            <span>Saving settings...</span>
                          </>
                        ) : (
                          <span>Save Settings</span>
                        )}
                      </Button>
                    </div>

                    {/* Danger Zone */}
                    <div className="pt-5 border-t border-destructive/20 space-y-2">
                      <h4 className="text-xs font-semibold text-destructive uppercase tracking-wider">
                        Danger Zone
                      </h4>
                      <p className="text-[11px] text-muted-foreground">
                        Permanently delete this project, pages, and version history.
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleDeleteProject}
                        className="w-full border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive text-xs h-8 cursor-pointer gap-1.5"
                      >
                        <Trash className="h-3.5 w-3.5" />
                        <span>Delete Project</span>
                      </Button>
                    </div>
                  </form>
                )}
              </div>
            </aside>
          </>
        )}
      </div>

      {/* ── 4. Modals: Create, Rename, Move, Trash, Conflict ───────────────── */}

      {/* Create Modal */}
      {createModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs px-4">
          <div className="bg-surface border border-border/60 rounded-xl p-5 w-full max-w-sm shadow-2xl">
            <h3 className="font-display font-bold text-base text-foreground mb-3">
              New {createModal.kind === 'page' ? 'Page' : 'Folder'}
            </h3>
            <input
              type="text"
              autoFocus
              value={createModal.title}
              onChange={(e) =>
                setCreateModal((prev) => ({ ...prev, title: e.target.value }))
              }
              onKeyDown={(e) => {
                if (e.key === 'Enter' && createModal.title.trim()) {
                  dispatchTreeAction({
                    action: 'create',
                    parentId: createModal.parentId,
                    kind: createModal.kind,
                    title: createModal.title.trim(),
                  });
                  setCreateModal((prev) => ({ ...prev, open: false }));
                }
              }}
              placeholder="Title"
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground mb-4 focus:outline-none focus:border-accent"
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCreateModal((prev) => ({ ...prev, open: false }))}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={!createModal.title.trim()}
                onClick={() => {
                  dispatchTreeAction({
                    action: 'create',
                    parentId: createModal.parentId,
                    kind: createModal.kind,
                    title: createModal.title.trim(),
                  });
                  setCreateModal((prev) => ({ ...prev, open: false }));
                }}
                className="bg-accent text-accent-foreground hover:bg-accent-hover font-medium"
              >
                Create
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Rename Modal */}
      {renameModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs px-4">
          <div className="bg-surface border border-border/60 rounded-xl p-5 w-full max-w-sm shadow-2xl">
            <h3 className="font-display font-bold text-base text-foreground mb-3">
              Rename Item
            </h3>
            <input
              type="text"
              autoFocus
              value={renameModal.newTitle}
              onChange={(e) =>
                setRenameModal((prev) => ({ ...prev, newTitle: e.target.value }))
              }
              onKeyDown={(e) => {
                if (e.key === 'Enter' && renameModal.newTitle.trim()) {
                  dispatchTreeAction({
                    action: 'rename',
                    nodeId: renameModal.nodeId,
                    title: renameModal.newTitle.trim(),
                  });
                  setRenameModal((prev) => ({ ...prev, open: false }));
                }
              }}
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground mb-4 focus:outline-none focus:border-accent"
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setRenameModal((prev) => ({ ...prev, open: false }))}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={!renameModal.newTitle.trim()}
                onClick={() => {
                  dispatchTreeAction({
                    action: 'rename',
                    nodeId: renameModal.nodeId,
                    title: renameModal.newTitle.trim(),
                  });
                  setRenameModal((prev) => ({ ...prev, open: false }));
                }}
                className="bg-accent text-accent-foreground hover:bg-accent-hover font-medium"
              >
                Save
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Move To Modal */}
      {moveToModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs px-4">
          <div className="bg-surface border border-border/60 rounded-xl p-5 w-full max-w-sm shadow-2xl">
            <h3 className="font-display font-bold text-base text-foreground mb-3">
              Move to Folder
            </h3>
            <div className="max-h-60 overflow-y-auto mb-4 space-y-1">
              <div
                onClick={() => setMoveToModal((prev) => ({ ...prev, targetParentId: null }))}
                className={`p-2 rounded-lg text-xs cursor-pointer flex items-center gap-2 ${
                  moveToModal.targetParentId === null
                    ? 'bg-accent/10 text-accent font-medium'
                    : 'text-foreground hover:bg-surface-raised'
                }`}
              >
                <Folder className="h-3.5 w-3.5 text-accent" />
                <span>[Root Workspace]</span>
              </div>
              {treeNodes
                .filter((n) => n.kind === 'folder' && n.id !== moveToModal.nodeId)
                .map((folder) => (
                  <div
                    key={folder.id}
                    onClick={() =>
                      setMoveToModal((prev) => ({ ...prev, targetParentId: folder.id }))
                    }
                    className={`p-2 rounded-lg text-xs cursor-pointer flex items-center gap-2 ${
                      moveToModal.targetParentId === folder.id
                        ? 'bg-accent/10 text-accent font-medium'
                        : 'text-foreground hover:bg-surface-raised'
                    }`}
                  >
                    <Folder className="h-3.5 w-3.5 text-accent" />
                    <span>{folder.title}</span>
                  </div>
                ))}
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setMoveToModal((prev) => ({ ...prev, open: false }))}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  dispatchTreeAction({
                    action: 'move',
                    nodeId: moveToModal.nodeId,
                    targetParentId: moveToModal.targetParentId,
                  });
                  setMoveToModal((prev) => ({ ...prev, open: false }));
                }}
                className="bg-accent text-accent-foreground hover:bg-accent-hover font-medium"
              >
                Move
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Trash Modal */}
      {trashModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs px-4">
          <div className="bg-surface border border-border/60 rounded-xl p-5 w-full max-w-md shadow-2xl flex flex-col max-h-[80vh]">
            <div className="flex items-center justify-between mb-3 border-b border-border/40 pb-2">
              <div className="flex items-center gap-2 text-foreground font-display font-bold text-base">
                <Trash2 className="h-4 w-4 text-destructive" />
                <span>Project Trash</span>
              </div>
              <button
                type="button"
                onClick={() => setTrashModal((prev) => ({ ...prev, open: false }))}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 py-2">
              {trashModal.loading ? (
                <div className="text-center py-6 text-xs text-muted-foreground">
                  Loading trash...
                </div>
              ) : trashModal.items.length === 0 ? (
                <div className="text-center py-8 text-xs text-muted-foreground">
                  Trash is empty.
                </div>
              ) : (
                trashModal.items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-2.5 rounded-lg border border-border/40 bg-surface-raised/40 text-xs"
                  >
                    <div className="flex items-center gap-2 truncate">
                      {item.kind === 'folder' ? (
                        <Folder className="h-3.5 w-3.5 text-accent shrink-0" />
                      ) : (
                        <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      )}
                      <span className="truncate text-foreground font-medium">{item.title}</span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 ml-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={async () => {
                          const res = await fetch('/api/editor/trash', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              projectId: initialProject.id,
                              nodeId: item.id,
                              action: 'restore',
                            }),
                          });
                          if (res.ok) {
                            setTrashModal((prev) => ({
                              ...prev,
                              items: prev.items.filter((i) => i.id !== item.id),
                            }));
                            const tRes = await fetch(`/api/editor/tree?projectId=${initialProject.id}`);
                            if (tRes.ok) {
                              const tData = await tRes.json();
                              setTreeNodes(tData.tree || []);
                            }
                          }
                        }}
                        className="h-6 px-2 text-[10px] gap-1 cursor-pointer"
                      >
                        <RotateCcw className="h-2.5 w-2.5" />
                        <span>Restore</span>
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Conflict Modal */}
      {conflictModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs px-4">
          <div className="bg-surface border border-destructive/50 rounded-xl p-6 w-full max-w-lg shadow-2xl">
            <div className="flex items-center gap-2 text-destructive font-display font-bold text-base mb-2">
              <AlertCircle className="h-5 w-5" />
              <span>Version Conflict (409)</span>
            </div>
            <p className="text-xs text-muted-foreground mb-4">
              Another window or collaborator updated this page while you were editing. Choose whether to accept their server version or force overwrite with your current copy.
            </p>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (conflictModal.serverContent && editor) {
                    try {
                      editor.replaceBlocks(editor.document, JSON.parse(conflictModal.serverContent));
                    } catch {
                      // ignore
                    }
                  }
                  setConflictModal({ open: false, serverContent: null });
                  setSaveState('saved');
                }}
                className="text-xs cursor-pointer"
              >
                Accept Server Copy
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  setConflictModal({ open: false, serverContent: null });
                  flushSave();
                }}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90 text-xs cursor-pointer"
              >
                Overwrite Server Copy
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
