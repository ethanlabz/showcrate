'use client';

import * as React from 'react';
import { useCreateBlockNote } from '@blocknote/react';
import { BlockNoteView } from '@blocknote/shadcn';
import '@blocknote/shadcn/style.css';

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
} from 'lucide-react';
import { Button } from '@/components/ui/button';

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

export interface EditorWorkspaceProps {
  project: {
    id: string;
    name: string;
    slug: string;
    username: string;
    published: boolean;
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

export function EditorWorkspace({
  project,
  tree: initialTree,
  treeRevision: initialTreeRev,
  initialPage,
}: EditorWorkspaceProps) {
  // Tree state
  const [treeNodes, setTreeNodes] = React.useState<DocTreeNode[]>(initialTree);
  const [treeRevision, setTreeRevision] = React.useState(initialTreeRev);
  const [expandedFolders, setExpandedFolders] = React.useState<Set<string>>(() => {
    // Expand all folders by default
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

  // Explorer UI state
  const [sidebarOpen, setSidebarOpen] = React.useState(true);
  const [mobileDrawerOpen, setMobileDrawerOpen] = React.useState(false);
  const [sidebarWidth, setSidebarWidth] = React.useState(280);

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

  // Conflict modal state
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

  // Track unsaved changes in editor
  const dirtyRef = React.useRef(false);
  const saveTimeoutRef = React.useRef<any>(null);

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
      const currentBlocks = editor.document;
      const contentStr = JSON.stringify(currentBlocks);
      const titleToSave = overrideTitle ?? pageTitle;

      setSaveState('saving');
      setSaveError(null);

      try {
        const res = await fetch(`/api/editor/pages/${activePageId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: titleToSave,
            content: contentStr,
            base_revision: pageRevision,
          }),
        });

        if (res.status === 409) {
          const errData = await res.json();
          setSaveState('conflict');
          setSaveError('Stale revision conflict.');
          setConflictModal({
            open: true,
            serverContent: errData.current_content ?? null,
          });
          return false;
        }

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          setSaveState('failed');
          setSaveError(errData.error || 'Failed to save');
          return false;
        }

        const data = await res.json();
        setPageRevision(data.revision);
        setSaveState('saved');
        dirtyRef.current = false;
        return true;
      } catch (err: any) {
        setSaveState('failed');
        setSaveError(err.message || 'Network error');
        return false;
      }
    },
    [editor, activePageId, pageTitle, pageRevision],
  );

  // Autosave trigger on editor change
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
      }, 1500);
    });

    return () => {
      unsubscribe();
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [editor, flushSave]);

  // Switch to another page
  const handleSelectPage = async (pageId: string) => {
    if (pageId === activePageId) return;

    // Flush pending changes before navigating
    if (dirtyRef.current) {
      const ok = await flushSave();
      if (!ok) return; // Block navigation on failure or 409
    }

    try {
      const res = await fetch(`/api/editor/pages/${pageId}`);
      if (!res.ok) {
        alert('Could not load page.');
        return;
      }
      const pageData = await res.json();

      setActivePageId(pageData.id);
      setPageTitle(pageData.title);
      setPageRevision(pageData.revision);

      const targetNode = treeNodes.find((n) => n.id === pageId);
      setPageSlug(targetNode?.slug ?? '');

      // Load new content into editor
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

      // Update URL with history.replaceState
      window.history.replaceState(
        null,
        '',
        `/editor/${project.id}/${pageId}`,
      );

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
          projectId: project.id,
          base_tree_revision: treeRevision,
        }),
      });

      if (res.status === 409) {
        // Stale revision: refetch tree and rollback
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

      // Re-fetch active tree nodes
      const refreshed = await fetch(`/api/editor/tree?projectId=${project.id}`).catch(() => null);
      // Optimistic update of local tree:
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
        setTreeNodes((prev) => prev.filter((n) => n.id !== payload.nodeId && n.parent_id !== payload.nodeId));
        if (payload.nodeId === activePageId) {
          // Switch to first remaining page
          const remainingPage = treeNodes.find((n) => n.kind === 'page' && n.id !== payload.nodeId);
          if (remainingPage) handleSelectPage(remainingPage.id);
        }
      } else if (payload.action === 'move') {
        if (resData.affected_nodes) {
          const map = new Map<string, DocTreeNode>();
          for (const a of resData.affected_nodes) map.set(a.id, a);
          setTreeNodes((prev) => prev.map((n) => map.get(n.id) || n));
        }
      } else if (payload.action === 'restore') {
        // Refresh full tree on restore
        window.location.reload();
      }

      return true;
    } catch (e: any) {
      alert(e.message || 'Operation failed');
      return false;
    }
  };

  // Open trash modal
  const handleOpenTrash = async () => {
    setTrashModal({ open: true, items: [], loading: true });
    try {
      const res = await fetch(`/api/editor/trash?projectId=${project.id}`);
      if (res.ok) {
        const data = await res.json();
        setTrashModal({ open: true, items: data.trash || [], loading: false });
      } else {
        setTrashModal({ open: true, items: [], loading: false });
      }
    } catch {
      setTrashModal({ open: true, items: [], loading: false });
    }
  };

  // Keyboard navigation & shortcuts
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F2') {
        e.preventDefault();
        const activeNode = treeNodes.find((n) => n.id === activePageId);
        if (activeNode) {
          setRenameModal({
            open: true,
            nodeId: activeNode.id,
            currentTitle: activeNode.title,
            newTitle: activeNode.title,
          });
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activePageId, treeNodes]);

  return (
    <div className="h-screen w-screen flex flex-col bg-[#14161B] text-foreground font-sans overflow-hidden">
      {/* ── 1. Top Bar ──────────────────────────────────────────────────────── */}
      <header className="h-13 border-b border-border/40 bg-[#14161B] px-3 sm:px-4 flex items-center justify-between shrink-0 z-30">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen((prev) => !prev)}
            className="hidden md:flex text-muted-foreground hover:text-foreground h-8 w-8"
            aria-label="Toggle explorer"
          >
            <Menu className="h-4 w-4" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileDrawerOpen(true)}
            className="md:hidden text-muted-foreground hover:text-foreground h-8 w-8"
            aria-label="Open mobile explorer"
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
            <span className="font-serif font-bold text-sm text-foreground truncate">
              {project.name}
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
                <Loader2 className="h-3 w-3 animate-spin text-[#C9A96A]" />
                <span className="text-[#C9A96A]">Saving...</span>
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
                  className="h-5 px-1.5 text-[10px] ml-1"
                >
                  Retry
                </Button>
              </>
            )}
          </div>

          <a href={`/dashboard/projects/${project.id}/versions`}>
            <Button variant="ghost" size="sm" className="h-8 gap-1 text-xs text-muted-foreground hover:text-foreground">
              <History className="h-3.5 w-3.5" />
              <span className="hidden lg:inline">Versions</span>
            </Button>
          </a>

          <a href={`/dashboard/projects/${project.id}/settings/general`}>
            <Button variant="ghost" size="sm" className="h-8 gap-1 text-xs text-muted-foreground hover:text-foreground">
              <Settings className="h-3.5 w-3.5" />
              <span className="hidden lg:inline">Settings</span>
            </Button>
          </a>

          {project.published && (
            <a
              href={`/${project.username}/${project.slug}/docs${pageSlug ? `/${pageSlug}` : ''}`}
              target="_blank"
              rel="noreferrer"
            >
              <Button size="sm" className="h-8 gap-1 text-xs bg-[#C9A96A] text-[#14161B] hover:bg-[#C9A96A]/90 font-medium">
                <span>View live</span>
                <ExternalLink className="h-3 w-3" />
              </Button>
            </a>
          )}
        </div>
      </header>

      {/* ── 2. Workspace Body: Left Explorer + Center Editor ────────────────── */}
      <div className="flex-1 flex overflow-hidden">
        {/* Desktop Left Explorer */}
        {sidebarOpen && (
          <aside
            style={{ width: `${sidebarWidth}px` }}
            className="hidden md:flex flex-col border-r border-border/40 bg-[#14161B] shrink-0 select-none overflow-hidden"
          >
            {/* Explorer Header */}
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
                  className="h-6 w-6 text-muted-foreground hover:text-foreground"
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
                  className="h-6 w-6 text-muted-foreground hover:text-foreground"
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
                      className={`group flex items-center justify-between gap-1.5 px-2 py-1.5 rounded-lg text-xs cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-surface-raised text-[#C9A96A] font-semibold border border-[#C9A96A]/20'
                          : 'text-foreground/80 hover:text-foreground hover:bg-surface-raised/50'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 truncate flex-1">
                        {isFolder ? (
                          <>
                            {isExpanded ? (
                              <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground" />
                            )}
                            <Folder className="h-3.5 w-3.5 shrink-0 text-[#C9A96A]/80" />
                          </>
                        ) : (
                          <FileText className={`h-3.5 w-3.5 shrink-0 ${isSelected ? 'text-[#C9A96A]' : 'text-muted-foreground'}`} />
                        )}
                        <span className="truncate">{node.title}</span>
                      </div>

                      {/* Action buttons on hover */}
                      <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 shrink-0">
                        {isFolder && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setCreateModal({
                                open: true,
                                parentId: node.id,
                                kind: 'page',
                                title: '',
                              });
                            }}
                            className="p-1 text-muted-foreground hover:text-foreground"
                            title="Add child page"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setRenameModal({
                              open: true,
                              nodeId: node.id,
                              currentTitle: node.title,
                              newTitle: node.title,
                            });
                          }}
                          className="p-1 text-muted-foreground hover:text-foreground"
                          title="Rename (F2)"
                        >
                          <Edit2 className="h-3 w-3" />
                        </button>
                        {!node.is_index && (
                          <>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setMoveToModal({
                                  open: true,
                                  nodeId: node.id,
                                  targetParentId: null,
                                });
                              }}
                              className="p-1 text-muted-foreground hover:text-foreground"
                              title="Move to..."
                            >
                              <MoveRight className="h-3 w-3" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (confirm(`Delete "${node.title}"?`)) {
                                  dispatchTreeAction({
                                    action: 'delete',
                                    nodeId: node.id,
                                  });
                                }
                              }}
                              className="p-1 text-muted-foreground hover:text-destructive"
                              title="Delete"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Children */}
                    {isFolder && isExpanded && node.children && node.children.length > 0 && (
                      <div className="pl-3 ml-2 border-l border-border/30 space-y-0.5 mt-0.5">
                        {node.children.map(renderTreeNode)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Trash list button footer */}
            <div className="p-2 border-t border-border/40">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleOpenTrash}
                className="w-full justify-start text-xs text-muted-foreground hover:text-foreground gap-2 h-8"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Trash</span>
              </Button>
            </div>
          </aside>
        )}

        {/* Center Editor Content */}
        <main className="flex-1 bg-[#14161B] overflow-y-auto flex justify-center p-6 sm:p-10 lg:p-12">
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
                className="w-full bg-transparent font-serif text-3xl sm:text-4xl font-bold tracking-tight text-foreground placeholder:text-muted-foreground/40 focus:outline-none border-b border-transparent focus:border-border/40 pb-2"
              />
            </div>

            {/* BlockNote editor container */}
            <div className="min-h-[500px] border border-border/30 rounded-xl p-4 bg-surface/20">
              <BlockNoteView editor={editor} theme="dark" />
            </div>
          </div>
        </main>
      </div>

      {/* ── 3. Modals: Create, Rename, Move, Trash, Conflict ───────────────── */}

      {/* Create Modal */}
      {createModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs px-4">
          <div className="bg-[#14161B] border border-border rounded-xl p-5 w-full max-w-sm shadow-2xl">
            <h3 className="font-serif font-bold text-base text-foreground mb-3">
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
              className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-foreground mb-4 focus:outline-none focus:border-[#C9A96A]"
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
                className="bg-[#C9A96A] text-[#14161B] hover:bg-[#C9A96A]/90 font-medium"
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
          <div className="bg-[#14161B] border border-border rounded-xl p-5 w-full max-w-sm shadow-2xl">
            <h3 className="font-serif font-bold text-base text-foreground mb-3">
              Rename
            </h3>
            <input
              type="text"
              autoFocus
              value={renameModal.newTitle}
              onChange={(e) =>
                setRenameModal((prev) => ({ ...prev, newTitle: e.target.value }))
              }
              onKeyDown={(e) => {
                if (e.key === 'Enter' && renameModal.newTitle.trim() && renameModal.nodeId) {
                  dispatchTreeAction({
                    action: 'rename',
                    nodeId: renameModal.nodeId,
                    title: renameModal.newTitle.trim(),
                  });
                  setRenameModal((prev) => ({ ...prev, open: false }));
                }
              }}
              className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-foreground mb-4 focus:outline-none focus:border-[#C9A96A]"
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
                  if (renameModal.nodeId) {
                    dispatchTreeAction({
                      action: 'rename',
                      nodeId: renameModal.nodeId,
                      title: renameModal.newTitle.trim(),
                    });
                    setRenameModal((prev) => ({ ...prev, open: false }));
                  }
                }}
                className="bg-[#C9A96A] text-[#14161B] hover:bg-[#C9A96A]/90 font-medium"
              >
                Rename
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Move To Modal */}
      {moveToModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs px-4">
          <div className="bg-[#14161B] border border-border rounded-xl p-5 w-full max-w-sm shadow-2xl">
            <h3 className="font-serif font-bold text-base text-foreground mb-3">
              Move To...
            </h3>
            <p className="text-xs text-muted-foreground mb-4">
              Select destination folder or Root:
            </p>
            <div className="max-h-48 overflow-y-auto space-y-1 mb-4 border border-border/40 rounded-lg p-2 bg-surface/30">
              <button
                type="button"
                onClick={() => setMoveToModal((prev) => ({ ...prev, targetParentId: null }))}
                className={`w-full text-left px-2.5 py-1.5 rounded text-xs transition-colors ${
                  moveToModal.targetParentId === null
                    ? 'bg-[#C9A96A]/20 text-[#C9A96A] font-semibold'
                    : 'text-foreground hover:bg-surface-raised'
                }`}
              >
                📁 Root (Top level)
              </button>
              {treeNodes
                .filter((n) => n.kind === 'folder' && n.id !== moveToModal.nodeId)
                .map((folder) => (
                  <button
                    key={folder.id}
                    type="button"
                    onClick={() => setMoveToModal((prev) => ({ ...prev, targetParentId: folder.id }))}
                    className={`w-full text-left px-2.5 py-1.5 rounded text-xs transition-colors truncate ${
                      moveToModal.targetParentId === folder.id
                        ? 'bg-[#C9A96A]/20 text-[#C9A96A] font-semibold'
                        : 'text-foreground hover:bg-surface-raised'
                    }`}
                  >
                    📁 {folder.title}
                  </button>
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
                  if (moveToModal.nodeId) {
                    dispatchTreeAction({
                      action: 'move',
                      nodeId: moveToModal.nodeId,
                      newParentId: moveToModal.targetParentId,
                      newIndex: 999, // clamp to end
                    });
                    setMoveToModal((prev) => ({ ...prev, open: false }));
                  }
                }}
                className="bg-[#C9A96A] text-[#14161B] hover:bg-[#C9A96A]/90 font-medium"
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
          <div className="bg-[#14161B] border border-border rounded-xl p-5 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-border/40 mb-3">
              <h3 className="font-serif font-bold text-base text-foreground">
                Trash
              </h3>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setTrashModal((prev) => ({ ...prev, open: false }))}
                className="h-6 w-6 text-muted-foreground"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {trashModal.loading ? (
              <div className="p-8 text-center text-xs text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2 text-[#C9A96A]" />
                Loading deleted items...
              </div>
            ) : trashModal.items.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground">
                Trash is empty.
              </div>
            ) : (
              <div className="max-h-64 overflow-y-auto space-y-2 mb-4">
                {trashModal.items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-2 rounded-lg border border-border/40 bg-surface/20"
                  >
                    <div className="truncate pr-2">
                      <span className="text-xs font-medium text-foreground block truncate">
                        {item.title}
                      </span>
                      <span className="text-[10px] text-muted-foreground font-mono">
                        {item.kind} • deleted {new Date(item.deleted_at).toLocaleDateString()}
                      </span>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={async () => {
                        await dispatchTreeAction({
                          action: 'restore',
                          nodeId: item.id,
                        });
                        setTrashModal((prev) => ({
                          ...prev,
                          items: prev.items.filter((i) => i.id !== item.id),
                        }));
                      }}
                      className="h-7 text-xs border-[#C9A96A]/40 text-[#C9A96A] hover:bg-[#C9A96A]/10 gap-1 shrink-0"
                    >
                      <RotateCcw className="h-3 w-3" />
                      Restore
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Conflict Modal (409) */}
      {conflictModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs px-4">
          <div className="bg-[#14161B] border border-destructive/60 rounded-xl p-6 w-full max-w-lg shadow-2xl">
            <div className="flex items-center gap-2 text-destructive mb-3">
              <AlertCircle className="h-5 w-5" />
              <h3 className="font-serif font-bold text-lg">
                Edit Conflict Detected (409)
              </h3>
            </div>
            <p className="text-xs text-muted-foreground mb-4">
              Another session updated this page while you were editing. To prevent overwriting work, review the changes below or reload the latest content.
            </p>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setConflictModal({ open: false, serverContent: null });
                  window.location.reload();
                }}
              >
                Discard My Edits & Reload
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  // Force save with incremented revision
                  setConflictModal({ open: false, serverContent: null });
                  setPageRevision((prev) => prev + 1);
                  flushSave();
                }}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90 text-xs"
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
