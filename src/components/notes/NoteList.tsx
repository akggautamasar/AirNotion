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
} from 'lucide-react';
import { useNotesStore } from '@/store/notesStore';
import { cn } from '@/lib/utils';
import NoteCard from './NoteCard';
import KanbanView from './KanbanView';
import CalendarView from './CalendarView';
import type { ViewMode } from '@/lib/types';

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
  } = useNotesStore();

  const [showSort, setShowSort] = useState(false);

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

  if (viewMode === 'kanban') {
    return (
      <div className="flex flex-col h-full">
        <ListHeader
          title={getHeaderTitle()}
          count={totalCount}
          viewMode={viewMode}
          setViewMode={setViewMode}
          showSort={showSort}
          setShowSort={setShowSort}
          settings={settings}
          setSettings={setSettings}
          isSearchOpen={isSearchOpen}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          openSearch={openSearch}
          closeSearch={closeSearch}
        />
        <div className="flex-1 overflow-auto">
          <KanbanView />
        </div>
      </div>
    );
  }

  if (viewMode === 'calendar') {
    return (
      <div className="flex flex-col h-full">
        <ListHeader
          title={getHeaderTitle()}
          count={totalCount}
          viewMode={viewMode}
          setViewMode={setViewMode}
          showSort={showSort}
          setShowSort={setShowSort}
          settings={settings}
          setSettings={setSettings}
          isSearchOpen={isSearchOpen}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          openSearch={openSearch}
          closeSearch={closeSearch}
        />
        <div className="flex-1 overflow-auto">
          <CalendarView />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <ListHeader
        title={getHeaderTitle()}
        count={totalCount}
        viewMode={viewMode}
        setViewMode={setViewMode}
        showSort={showSort}
        setShowSort={setShowSort}
        settings={settings}
        setSettings={setSettings}
        isSearchOpen={isSearchOpen}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        openSearch={openSearch}
        closeSearch={closeSearch}
      />

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
                    />
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>
        )}
      </div>
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
}: ListHeaderProps) {
  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 sticky top-0 z-10">
      <div className="flex items-center gap-2 min-w-0">
        <h2 className="font-semibold text-surface-900 dark:text-surface-100 truncate text-sm">{title}</h2>
        <span className="text-xs text-surface-400 flex-shrink-0">{count}</span>
      </div>

      <div className="flex items-center gap-1">
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
