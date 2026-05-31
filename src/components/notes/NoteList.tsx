'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutGrid,
  List,
  Columns,
  Calendar,
  SlidersHorizontal,
  ChevronDown,
  Search,
  X,
  MousePointer2,
  Trash2,
  Archive,
  CheckSquare,
  LayoutTemplate,
  FolderOpen,
  Check,
} from 'lucide-react';
import { useNotesStore } from '@/store/notesStore';
import { cn } from '@/lib/utils';
import NoteCard from './NoteCard';
import KanbanView from './KanbanView';
import CalendarView from './CalendarView';
import TemplateModal from '@/components/ui/TemplateModal';
import type { ViewMode } from '@/lib/types';
import toast from 'react-hot-toast';

const VIEW_ICONS: Record<ViewMode, React.ReactNode> = {
  grid:     <LayoutGrid size={15} />,
  list:     <List size={15} />,
  kanban:   <Columns size={15} />,
  calendar: <Calendar size={15} />,
};

const SORT_OPTIONS = [
  { value: 'updatedAt', label: 'Last modified' },
  { value: 'createdAt', label: 'Created date' },
  { value: 'title',    label: 'Title' },
  { value: 'size',     label: 'Size' },
];

export default function NoteList() {
  const {
    viewMode,
    setViewMode,
    getFilteredNotes,
    activeNoteId,
    setActiveNote,
    settings,
    setSettings,
    searchQuery,
    setSearchQuery,
    searchResults,
    isSearchOpen,
    openSearch,
    closeSearch,
    selectedFolder,
    selectedTag,
    notes,
    deleteNote,
    archiveNote,
    moveNoteToFolder,
    folders,
    createNote,
    updateNote,
  } = useNotesStore();

  const [showSort, setShowSort] = useState(false);
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showTemplates, setShowTemplates] = useState(false);
  const [showBulkFolderMenu, setShowBulkFolderMenu] = useState(false);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const exitSelect = useCallback(() => {
    setIsSelecting(false);
    setSelectedIds(new Set());
    setShowBulkFolderMenu(false);
  }, []);

  const handleBulkDelete = useCallback(async () => {
    if (selectedIds.size === 0) return;
    for (const id of Array.from(selectedIds)) await deleteNote(id);
    toast.success(`Deleted ${selectedIds.size} note${selectedIds.size > 1 ? 's' : ''}`);
    exitSelect();
  }, [selectedIds, deleteNote, exitSelect]);

  const handleBulkArchive = useCallback(async () => {
    if (selectedIds.size === 0) return;
    for (const id of Array.from(selectedIds)) await archiveNote(id);
    toast.success(`Archived ${selectedIds.size} note${selectedIds.size > 1 ? 's' : ''}`);
    exitSelect();
  }, [selectedIds, archiveNote, exitSelect]);

  const handleBulkMove = useCallback(async (folderId: string) => {
    if (selectedIds.size === 0) return;
    for (const id of Array.from(selectedIds)) await moveNoteToFolder(id, folderId);
    toast.success(`Moved ${selectedIds.size} note${selectedIds.size > 1 ? 's' : ''}`);
    exitSelect();
  }, [selectedIds, moveNoteToFolder, exitSelect]);

  const handleCreateFromTemplate = useCallback(async (title: string, content: string, icon: string) => {
    const note = await createNote();
    await updateNote(note.id, { title, content, icon });
    setActiveNote(note.id);
  }, [createNote, updateNote, setActiveNote]);

  const filteredNotes = getFilteredNotes();
  const pinnedNotes = filteredNotes.filter((n) => n.pinned);
  const unpinnedNotes = filteredNotes.filter((n) => !n.pinned);

  const displayNotes = isSearchOpen && searchQuery
    ? searchResults.map((r) => r.note)
    : filteredNotes;

  const displayPinned = isSearchOpen ? [] : pinnedNotes;
  const displayUnpinned = isSearchOpen && searchQuery
    ? searchResults.map((r) => r.note)
    : unpinnedNotes;

  const handleNoteClick = useCallback((id: string) => {
    setActiveNote(id);
  }, [setActiveNote]);

  const getHeaderTitle = () => {
    if (selectedTag) return `#${selectedTag}`;
    if (selectedFolder === 'starred') return 'Starred';
    if (selectedFolder === 'archived') return 'Archived';
    if (selectedFolder === 'all') return 'All Notes';
    return 'Notes';
  };

  const totalCount = isSearchOpen && searchQuery
    ? searchResults.length
    : filteredNotes.length;

  const sharedHeaderProps = {
    title: getHeaderTitle(),
    count: totalCount,
    viewMode,
    setViewMode,
    showSort,
    setShowSort,
    settings,
    setSettings,
    isSearchOpen,
    searchQuery,
    setSearchQuery,
    openSearch,
    closeSearch,
    isSelecting,
    selectedCount: selectedIds.size,
    onToggleSelect: () => { setIsSelecting((v) => !v); setSelectedIds(new Set()); },
    onShowTemplates: () => setShowTemplates(true),
  };

  if (viewMode === 'kanban') {
    return (
      <div className="flex flex-col h-full">
        <ListHeader {...sharedHeaderProps} />
        <div className="flex-1 overflow-auto">
          <KanbanView />
        </div>
        <TemplateModal isOpen={showTemplates} onClose={() => setShowTemplates(false)} onCreate={handleCreateFromTemplate} />
      </div>
    );
  }

  if (viewMode === 'calendar') {
    return (
      <div className="flex flex-col h-full">
        <ListHeader {...sharedHeaderProps} />
        <div className="flex-1 overflow-auto">
          <CalendarView />
        </div>
        <TemplateModal isOpen={showTemplates} onClose={() => setShowTemplates(false)} onCreate={handleCreateFromTemplate} />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <ListHeader {...sharedHeaderProps} />

      {/* Search bar */}
      <AnimatePresence>
        {isSearchOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-b border-surface-200 dark:border-surface-700"
          >
            <div className="flex items-center gap-2 px-4 py-2">
              <Search size={14} className="text-surface-400 flex-shrink-0" />
              <input
                autoFocus
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search notes..."
                className="flex-1 text-sm bg-transparent text-surface-900 dark:text-surface-100 placeholder-surface-400 outline-none"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="text-surface-400 hover:text-surface-600">
                  <X size={14} />
                </button>
              )}
              <button onClick={closeSearch} className="text-surface-400 hover:text-surface-600">
                <X size={14} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bulk action bar */}
      <AnimatePresence>
        {isSelecting && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-b border-surface-200 dark:border-surface-700 bg-brand-50 dark:bg-brand-900/20 flex-shrink-0"
          >
            <div className="flex items-center gap-2 px-3 py-2 flex-wrap">
              <span className="text-xs font-semibold text-brand-600 dark:text-brand-400 flex-shrink-0">
                {selectedIds.size} selected
              </span>
              <button
                onClick={() => {
                  const allIds = new Set(displayNotes.map((n) => n.id));
                  setSelectedIds((prev) => prev.size === allIds.size ? new Set() : allIds);
                }}
                className="flex items-center gap-1 text-xs text-surface-600 dark:text-surface-300 px-2 py-1 rounded-lg bg-white/60 dark:bg-surface-700/60 hover:bg-white dark:hover:bg-surface-700 transition-colors"
              >
                <CheckSquare size={12} />
                {selectedIds.size === displayNotes.length ? 'Deselect all' : 'Select all'}
              </button>

              {selectedIds.size > 0 && (
                <>
                  <button
                    onClick={handleBulkArchive}
                    className="flex items-center gap-1 text-xs text-surface-600 dark:text-surface-300 px-2 py-1 rounded-lg bg-white/60 dark:bg-surface-700/60 hover:bg-white dark:hover:bg-surface-700 transition-colors"
                  >
                    <Archive size={12} /> Archive
                  </button>

                  {folders.length > 0 && (
                    <div className="relative">
                      <button
                        onClick={() => setShowBulkFolderMenu((v) => !v)}
                        className="flex items-center gap-1 text-xs text-surface-600 dark:text-surface-300 px-2 py-1 rounded-lg bg-white/60 dark:bg-surface-700/60 hover:bg-white dark:hover:bg-surface-700 transition-colors"
                      >
                        <FolderOpen size={12} /> Move ›
                      </button>
                      <AnimatePresence>
                        {showBulkFolderMenu && (
                          <motion.div
                            initial={{ opacity: 0, y: -4, scale: 0.96 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -4, scale: 0.96 }}
                            className="absolute top-full left-0 mt-1 w-44 bg-white dark:bg-surface-800 rounded-xl shadow-dropdown border border-surface-200 dark:border-surface-700 z-20 py-1 overflow-hidden"
                          >
                            {folders.map((f) => (
                              <button
                                key={f.id}
                                onClick={() => { handleBulkMove(f.id); setShowBulkFolderMenu(false); }}
                                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-surface-700 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-700 transition-colors"
                              >
                                <span>{f.icon}</span>
                                <span className="truncate">{f.name}</span>
                              </button>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}

                  <button
                    onClick={handleBulkDelete}
                    className="flex items-center gap-1 text-xs text-red-600 dark:text-red-400 px-2 py-1 rounded-lg bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
                  >
                    <Trash2 size={12} /> Delete
                  </button>
                </>
              )}

              <button onClick={exitSelect} className="ml-auto text-xs text-surface-400 hover:text-surface-600 p-1">
                <X size={14} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Note list */}
      <div className="flex-1 overflow-y-auto">
        {displayNotes.length === 0 ? (
          <EmptyState searchQuery={searchQuery} isSearchOpen={isSearchOpen} selectedFolder={selectedFolder} />
        ) : viewMode === 'grid' ? (
          <div className="p-3 space-y-3">
            {/* Pinned section */}
            {displayPinned.length > 0 && !isSearchOpen && (
              <div>
                <p className="text-xs font-semibold text-surface-400 uppercase tracking-wider px-1 mb-2">Pinned</p>
                <div className="grid grid-cols-2 gap-2.5">
                  <AnimatePresence>
                    {displayPinned.map((note) => (
                      <NoteCard
                        key={note.id}
                        note={note}
                        view="grid"
                        isActive={activeNoteId === note.id}
                        onClick={() => handleNoteClick(note.id)}
                        isSelecting={isSelecting}
                        isSelected={selectedIds.has(note.id)}
                        onSelect={toggleSelect}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            )}
            {/* Other notes */}
            {displayUnpinned.length > 0 && (
              <div>
                {displayPinned.length > 0 && !isSearchOpen && (
                  <p className="text-xs font-semibold text-surface-400 uppercase tracking-wider px-1 mb-2">Notes</p>
                )}
                <div className="grid grid-cols-2 gap-2.5">
                  <AnimatePresence>
                    {displayUnpinned.map((note) => (
                      <NoteCard
                        key={note.id}
                        note={note}
                        view="grid"
                        isActive={activeNoteId === note.id}
                        onClick={() => handleNoteClick(note.id)}
                        isSelecting={isSelecting}
                        isSelected={selectedIds.has(note.id)}
                        onSelect={toggleSelect}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            )}
          </div>
        ) : (
          // List view
          <div>
            {displayPinned.length > 0 && !isSearchOpen && (
              <div>
                <p className="text-xs font-semibold text-surface-400 uppercase tracking-wider px-4 py-2">Pinned</p>
                <AnimatePresence>
                  {displayPinned.map((note) => (
                    <NoteCard
                      key={note.id}
                      note={note}
                      view="list"
                      isActive={activeNoteId === note.id}
                      onClick={() => handleNoteClick(note.id)}
                      isSelecting={isSelecting}
                      isSelected={selectedIds.has(note.id)}
                      onSelect={toggleSelect}
                    />
                  ))}
                </AnimatePresence>
              </div>
            )}
            {displayUnpinned.length > 0 && (
              <div>
                {displayPinned.length > 0 && !isSearchOpen && (
                  <p className="text-xs font-semibold text-surface-400 uppercase tracking-wider px-4 py-2">Notes</p>
                )}
                <AnimatePresence>
                  {displayUnpinned.map((note) => (
                    <NoteCard
                      key={note.id}
                      note={note}
                      view="list"
                      isActive={activeNoteId === note.id}
                      onClick={() => handleNoteClick(note.id)}
                      isSelecting={isSelecting}
                      isSelected={selectedIds.has(note.id)}
                      onSelect={toggleSelect}
                    />
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>
        )}
      </div>

      <TemplateModal isOpen={showTemplates} onClose={() => setShowTemplates(false)} onCreate={handleCreateFromTemplate} />
    </div>
  );
}

// ─── Header ───────────────────────────────────────────────────────────────────

interface ListHeaderProps {
  title: string;
  count: number;
  viewMode: ViewMode;
  setViewMode: (v: ViewMode) => void;
  showSort: boolean;
  setShowSort: (v: boolean) => void;
  settings: { sortBy: string; sortOrder: string };
  setSettings: (updates: object) => void;
  isSearchOpen: boolean;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  openSearch: () => void;
  closeSearch: () => void;
  isSelecting: boolean;
  selectedCount: number;
  onToggleSelect: () => void;
  onShowTemplates: () => void;
}

function ListHeader({
  title,
  count,
  viewMode,
  setViewMode,
  showSort,
  setShowSort,
  settings,
  setSettings,
  isSearchOpen,
  openSearch,
  isSelecting,
  onToggleSelect,
  onShowTemplates,
}: ListHeaderProps) {
  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 sticky top-0 z-10">
      <div className="flex items-center gap-2 min-w-0">
        <h2 className="font-semibold text-surface-900 dark:text-surface-100 truncate text-sm">{title}</h2>
        <span className="text-xs text-surface-400 flex-shrink-0">{count}</span>
      </div>

      <div className="flex items-center gap-1">
        {/* Templates */}
        <button
          onClick={onShowTemplates}
          title="Create from template"
          className="p-1.5 rounded-lg transition-colors text-surface-400 hover:text-surface-600 hover:bg-surface-100 dark:hover:bg-surface-800"
        >
          <LayoutTemplate size={14} />
        </button>

        {/* Multi-select */}
        <button
          onClick={onToggleSelect}
          title="Select notes"
          className={cn(
            'p-1.5 rounded-lg transition-colors',
            isSelecting
              ? 'bg-brand-500/10 text-brand-500'
              : 'text-surface-400 hover:text-surface-600 hover:bg-surface-100 dark:hover:bg-surface-800'
          )}
        >
          <MousePointer2 size={14} />
        </button>

        {/* Search */}
        <button
          onClick={openSearch}
          className={cn(
            'p-1.5 rounded-lg transition-colors',
            isSearchOpen
              ? 'bg-brand-500/10 text-brand-500'
              : 'text-surface-400 hover:text-surface-600 hover:bg-surface-100 dark:hover:bg-surface-800'
          )}
        >
          <Search size={14} />
        </button>

        {/* Sort */}
        <div className="relative">
          <button
            onClick={() => setShowSort(!showSort)}
            className={cn(
              'flex items-center gap-1 p-1.5 rounded-lg transition-colors',
              showSort
                ? 'bg-brand-500/10 text-brand-500'
                : 'text-surface-400 hover:text-surface-600 hover:bg-surface-100 dark:hover:bg-surface-800'
            )}
          >
            <SlidersHorizontal size={14} />
          </button>

          <AnimatePresence>
            {showSort && (
              <motion.div
                initial={{ opacity: 0, scale: 0.96, y: -4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: -4 }}
                transition={{ duration: 0.1 }}
                className="absolute right-0 top-full mt-1.5 w-48 bg-white dark:bg-surface-800 rounded-xl shadow-dropdown border border-surface-200 dark:border-surface-700 z-20 py-1.5"
              >
                <p className="text-xs font-semibold text-surface-400 uppercase tracking-wider px-3 py-1">Sort by</p>
                {SORT_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => { setSettings({ sortBy: opt.value }); setShowSort(false); }}
                    className={cn(
                      'w-full text-left px-3 py-2 text-sm transition-colors',
                      settings.sortBy === opt.value
                        ? 'text-brand-600 dark:text-brand-400 bg-brand-500/5'
                        : 'text-surface-700 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-700'
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
                <div className="border-t border-surface-200 dark:border-surface-700 mt-1 pt-1">
                  <button
                    onClick={() => { setSettings({ sortOrder: settings.sortOrder === 'asc' ? 'desc' : 'asc' }); setShowSort(false); }}
                    className="w-full text-left px-3 py-2 text-sm text-surface-700 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-700 flex items-center gap-2"
                  >
                    <ChevronDown size={13} className={cn(settings.sortOrder === 'asc' && 'rotate-180')} />
                    {settings.sortOrder === 'desc' ? 'Descending' : 'Ascending'}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* View mode */}
        <div className="flex items-center bg-surface-100 dark:bg-surface-800 rounded-lg p-0.5 gap-0.5">
          {(Object.keys(VIEW_ICONS) as ViewMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              title={mode}
              className={cn(
                'p-1.5 rounded-md transition-colors',
                viewMode === mode
                  ? 'bg-white dark:bg-surface-700 text-brand-500 shadow-sm'
                  : 'text-surface-400 hover:text-surface-600 dark:hover:text-surface-300'
              )}
            >
              {VIEW_ICONS[mode]}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState({
  searchQuery,
  isSearchOpen,
  selectedFolder,
}: {
  searchQuery: string;
  isSearchOpen: boolean;
  selectedFolder: string;
}) {
  const { createNote, setActiveNote } = useNotesStore();

  const handleCreate = async () => {
    const note = await createNote();
    setActiveNote(note.id);
  };

  if (isSearchOpen && searchQuery) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
        <Search size={32} className="text-surface-300 dark:text-surface-600 mb-3" />
        <p className="text-sm font-medium text-surface-500 dark:text-surface-400">No results</p>
        <p className="text-xs text-surface-400 dark:text-surface-500 mt-1">
          No notes match &quot;{searchQuery}&quot;
        </p>
      </div>
    );
  }

  if (selectedFolder === 'starred') {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
        <div className="w-12 h-12 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl flex items-center justify-center mb-3">
          <span className="text-2xl">⭐</span>
        </div>
        <p className="text-sm font-medium text-surface-600 dark:text-surface-400">No starred notes</p>
        <p className="text-xs text-surface-400 dark:text-surface-500 mt-1 max-w-xs">
          Pin notes to star them. Use the pin button on any note card to add it here.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-12 h-12 bg-surface-100 dark:bg-surface-800 rounded-xl flex items-center justify-center mb-3">
        <span className="text-2xl">📝</span>
      </div>
      <p className="text-sm font-medium text-surface-600 dark:text-surface-400">
        {selectedFolder === 'archived' ? 'No archived notes' : 'No notes yet'}
      </p>
      {selectedFolder !== 'archived' && (
        <button
          onClick={handleCreate}
          className="mt-3 px-3 py-1.5 text-xs font-medium rounded-lg bg-brand-500 text-white hover:bg-brand-600 transition-colors"
        >
          Create first note
        </button>
      )}
    </div>
  );
}
