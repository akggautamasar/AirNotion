'use client';

import { useEffect, useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PanelLeftClose, PanelLeftOpen, ArrowLeft, Plus } from 'lucide-react';
import { useNotesStore } from '@/store/notesStore';
import { cn } from '@/lib/utils';
import Sidebar from '@/components/sidebar/Sidebar';
import NoteList from '@/components/notes/NoteList';
import Editor from '@/components/editor/Editor';
import CommandPalette from '@/components/ui/CommandPalette';
import SettingsModal from '@/components/ui/SettingsModal';

type MobileView = 'list' | 'editor';

export default function AppLayout() {
  const {
    settings,
    setSettings,
    activeNoteId,
    notes,
    isCommandPaletteOpen,
    openCommandPalette,
    openSearch,
    createNote,
    setActiveNote,
  } = useNotesStore();

  const [sidebarOpen, setSidebarOpen] = useState(settings.sidebarOpen);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [mobileView, setMobileView] = useState<MobileView>('list');

  // Breakpoints: mobile < 768, tablet 768-1024, desktop >= 1024
  const [screenWidth, setScreenWidth] = useState(
    typeof window !== 'undefined' ? window.innerWidth : 1280
  );

  useEffect(() => {
    const check = () => setScreenWidth(window.innerWidth);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const isMobile = screenWidth < 768;
  const isTablet = screenWidth >= 768 && screenWidth < 1024;
  const isDesktop = screenWidth >= 1024;

  // When a note is selected on mobile/tablet, switch to editor view
  useEffect(() => {
    if (activeNoteId && (isMobile || isTablet)) {
      setMobileView('editor');
    }
  }, [activeNoteId, isMobile, isTablet]);

  // Keep the Render free-tier instance alive while a browser tab is open.
  // Pings the lightweight health endpoint every 8 minutes (well under the
  // 15-minute idle spin-down threshold). No-ops when the tab is hidden.
  useEffect(() => {
    const ping = () => {
      if (document.visibilityState === 'visible') {
        fetch('/api/config').catch(() => {/* ignore — just keeping the dyno warm */});
      }
    };
    const id = setInterval(ping, 8 * 60 * 1000);
    return () => clearInterval(id);
  }, []);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().includes('MAC');
      const mod = isMac ? e.metaKey : e.ctrlKey;

      if (mod && e.key === 'k') {
        e.preventDefault();
        openCommandPalette();
        return;
      }
      if (mod && e.key === 'n') {
        e.preventDefault();
        createNote().then((note) => setActiveNote(note.id));
        return;
      }
      if (mod && e.key === 'f') {
        e.preventDefault();
        openSearch();
        return;
      }
      if (mod && e.key === '\\') {
        e.preventDefault();
        setSidebarOpen((s) => {
          setSettings({ sidebarOpen: !s });
          return !s;
        });
        return;
      }
      if (mod && e.key === ',') {
        e.preventDefault();
        useNotesStore.getState().openSettings();
        return;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [openCommandPalette, openSearch, createNote, setActiveNote, setSettings]);

  const activeNote = activeNoteId ? notes.find((n) => n.id === activeNoteId) : null;

  const toggleSidebar = useCallback(() => {
    if (isMobile || isTablet) {
      setMobileSidebarOpen((v) => !v);
    } else {
      setSidebarOpen((v) => {
        setSettings({ sidebarOpen: !v });
        return !v;
      });
    }
  }, [isMobile, isTablet, setSettings]);

  const handleBack = useCallback(() => {
    setMobileView('list');
    setActiveNote(null);
  }, [setActiveNote]);

  const handleNewNote = useCallback(async () => {
    const note = await createNote();
    setActiveNote(note.id);
  }, [createNote, setActiveNote]);

  // ── Mobile Layout (< 768px) ──────────────────────────────────────────────────
  if (isMobile) {
    return (
      <div className="flex flex-col h-screen overflow-hidden bg-white dark:bg-surface-900">
        {/* Mobile sidebar drawer */}
        <AnimatePresence>
          {mobileSidebarOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-30 bg-black/40"
                onClick={() => setMobileSidebarOpen(false)}
              />
              <motion.div
                initial={{ x: '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className="fixed left-0 top-0 h-full w-72 z-40"
              >
                <Sidebar
                  onClose={() => setMobileSidebarOpen(false)}
                  onNavigate={() => { setMobileSidebarOpen(false); setMobileView('list'); }}
                />
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Main content: list or editor */}
        <div className="flex-1 min-h-0 overflow-hidden">
          {mobileView === 'list' ? (
            <div className="flex flex-col h-full">
              {/* Top bar */}
              <div className="flex items-center h-12 px-3 border-b border-surface-200 dark:border-surface-800 flex-shrink-0 bg-white dark:bg-surface-900">
                <button
                  onClick={toggleSidebar}
                  className="p-2 rounded-lg text-surface-500 hover:text-surface-700 dark:hover:text-surface-200 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
                  aria-label="Open sidebar"
                >
                  <PanelLeftOpen size={18} />
                </button>
                <span className="flex-1 text-center text-sm font-semibold text-surface-800 dark:text-surface-200">
                  Notes
                </span>
                <button
                  onClick={handleNewNote}
                  className="p-2 rounded-lg bg-brand-500 text-white hover:bg-brand-600 transition-colors"
                  aria-label="New note"
                >
                  <Plus size={18} />
                </button>
              </div>
              {/* Note list */}
              <div className="flex-1 overflow-hidden">
                <NoteList />
              </div>
            </div>
          ) : (
            <div className="flex flex-col h-full">
              {/* Editor top bar */}
              <div className="flex items-center h-12 px-3 border-b border-surface-200 dark:border-surface-800 flex-shrink-0 bg-white dark:bg-surface-900">
                <button
                  onClick={handleBack}
                  className="flex items-center gap-1.5 p-2 rounded-lg text-surface-500 hover:text-surface-700 dark:hover:text-surface-200 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
                  aria-label="Back to notes"
                >
                  <ArrowLeft size={18} />
                  <span className="text-sm">Notes</span>
                </button>
                <div className="flex-1 text-center">
                  <span className="text-sm font-medium text-surface-600 dark:text-surface-400 truncate max-w-xs inline-block">
                    {activeNote?.title || 'Untitled'}
                  </span>
                </div>
                <div className="w-16" /> {/* spacer */}
              </div>
              {/* Editor */}
              <div className="flex-1 min-h-0 overflow-hidden">
                {activeNote ? (
                  <Editor key={activeNote.id} note={activeNote} />
                ) : (
                  <div className="flex items-center justify-center h-full text-surface-400 text-sm">
                    No note selected
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Global Modals */}
        <CommandPalette />
        <SettingsModal />
      </div>
    );
  }

  // ── Tablet Layout (768px - 1024px) ───────────────────────────────────────────
  if (isTablet) {
    return (
      <div className="flex h-screen overflow-hidden bg-white dark:bg-surface-900">
        {/* Tablet sidebar drawer */}
        <AnimatePresence>
          {mobileSidebarOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-30 bg-black/40"
                onClick={() => setMobileSidebarOpen(false)}
              />
              <motion.div
                initial={{ x: '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className="fixed left-0 top-0 h-full w-72 z-40"
              >
                <Sidebar
                  onClose={() => setMobileSidebarOpen(false)}
                  onNavigate={() => { setMobileSidebarOpen(false); setMobileView('list'); }}
                />
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Two-panel layout */}
        <div className="flex flex-1 min-w-0 overflow-hidden">
          {/* Note list panel - always 280px */}
          <div
            className={cn(
              'flex flex-col border-r border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900 flex-shrink-0',
              mobileView === 'editor' ? 'hidden' : (activeNote ? 'w-72' : 'w-full')
            )}
          >
            <div className="flex items-center h-10 px-2 border-b border-surface-200 dark:border-surface-800 flex-shrink-0">
              <button
                onClick={toggleSidebar}
                className="p-1.5 rounded-lg text-surface-400 hover:text-surface-700 dark:hover:text-surface-200 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
              >
                <PanelLeftOpen size={16} />
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <NoteList />
            </div>
          </div>

          {/* Editor panel */}
          {activeNote && (
            <div className="flex-1 min-w-0 overflow-hidden">
              {/* Back button row for tablet */}
              <div className="flex items-center h-10 px-3 border-b border-surface-200 dark:border-surface-800 flex-shrink-0 bg-white dark:bg-surface-900">
                <button
                  onClick={handleBack}
                  className="flex items-center gap-1.5 text-sm text-surface-500 hover:text-surface-700 dark:hover:text-surface-300 transition-colors"
                >
                  <ArrowLeft size={14} />
                  <span>All Notes</span>
                </button>
              </div>
              <Editor key={activeNote.id} note={activeNote} />
            </div>
          )}
          {!activeNote && (
            <div className="flex-1 min-w-0 hidden md:flex items-center justify-center bg-surface-50 dark:bg-surface-950">
              <EmptyEditorState />
            </div>
          )}
        </div>

        <CommandPalette />
        <SettingsModal />
      </div>
    );
  }

  // ── Desktop Layout (>= 1024px) ───────────────────────────────────────────────
  return (
    <div className="flex h-screen overflow-hidden bg-white dark:bg-surface-900">
      {/* Desktop Sidebar */}
      <AnimatePresence initial={false}>
        {sidebarOpen && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 280, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="flex-shrink-0 overflow-hidden"
          >
            <Sidebar />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="flex flex-1 min-w-0 overflow-hidden">
        {/* Sidebar toggle + Note List column */}
        <div className={cn(
          'flex flex-col border-r border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900',
          activeNote ? 'w-72 xl:w-80 flex-shrink-0' : 'flex-1'
        )}>
          {/* Top bar */}
          <div className="flex items-center h-10 px-2 border-b border-surface-200 dark:border-surface-800 flex-shrink-0">
            <button
              onClick={toggleSidebar}
              className="p-1.5 rounded-lg text-surface-400 hover:text-surface-700 dark:hover:text-surface-200 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
              title="Toggle sidebar (⌘\\)"
            >
              {sidebarOpen ? <PanelLeftClose size={16} /> : <PanelLeftOpen size={16} />}
            </button>
          </div>

          {/* Note list */}
          <div className="flex-1 overflow-hidden">
            <NoteList />
          </div>
        </div>

        {/* Editor panel */}
        {activeNote ? (
          <div className="flex-1 min-w-0 overflow-hidden">
            <Editor key={activeNote.id} note={activeNote} />
          </div>
        ) : (
          <div className="flex-1 min-w-0 hidden lg:flex items-center justify-center bg-surface-50 dark:bg-surface-950">
            <EmptyEditorState />
          </div>
        )}
      </div>

      {/* Global Modals */}
      <CommandPalette />
      <SettingsModal />
    </div>
  );
}

// ─── Empty editor state ────────────────────────────────────────────────────────

function EmptyEditorState() {
  const { createNote, setActiveNote } = useNotesStore();

  return (
    <div className="text-center p-8">
      <div className="w-16 h-16 bg-surface-100 dark:bg-surface-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
        <span className="text-3xl">✈️</span>
      </div>
      <h3 className="text-lg font-semibold text-surface-700 dark:text-surface-300 mb-2">
        Select a note to edit
      </h3>
      <p className="text-sm text-surface-400 dark:text-surface-500 mb-4 max-w-xs">
        Choose a note from the list or create a new one to get started.
      </p>
      <div className="flex flex-col items-center gap-2">
        <button
          onClick={async () => {
            const note = await createNote();
            setActiveNote(note.id);
          }}
          className="px-4 py-2 bg-brand-500 text-white rounded-lg text-sm font-medium hover:bg-brand-600 transition-colors"
        >
          Create new note
        </button>
        <p className="text-xs text-surface-400">
          or press{' '}
          <kbd className="bg-surface-200 dark:bg-surface-700 px-1.5 py-0.5 rounded text-surface-500 font-mono">
            ⌘N
          </kbd>
        </p>
      </div>
    </div>
  );
}
