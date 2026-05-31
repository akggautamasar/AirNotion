'use client';

import { useEffect, useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PanelLeftClose, PanelLeftOpen, Menu } from 'lucide-react';
import { useNotesStore } from '@/store/notesStore';
import { cn } from '@/lib/utils';
import Sidebar from '@/components/sidebar/Sidebar';
import NoteList from '@/components/notes/NoteList';
import Editor from '@/components/editor/Editor';
import CommandPalette from '@/components/ui/CommandPalette';
import SettingsModal from '@/components/ui/SettingsModal';

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
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 1024);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Global keyboard shortcuts
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
    if (isMobile) {
      setMobileSidebarOpen((v) => !v);
    } else {
      setSidebarOpen((v) => {
        setSettings({ sidebarOpen: !v });
        return !v;
      });
    }
  }, [isMobile, setSettings]);

  return (
    <div className="flex h-screen overflow-hidden bg-white dark:bg-surface-900">
      {/* ── Desktop Sidebar ───────────────────────────────────────────────────── */}
      {!isMobile && (
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
      )}

      {/* ── Mobile Sidebar Drawer ─────────────────────────────────────────────── */}
      {isMobile && (
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
                <Sidebar onClose={() => setMobileSidebarOpen(false)} />
              </motion.div>
            </>
          )}
        </AnimatePresence>
      )}

      {/* ── Main Content ──────────────────────────────────────────────────────── */}
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
              {sidebarOpen && !isMobile ? <PanelLeftClose size={16} /> : <PanelLeftOpen size={16} />}
              {isMobile && <Menu size={16} />}
            </button>
          </div>

          {/* Note list */}
          <div className="flex-1 overflow-hidden">
            <NoteList />
          </div>
        </div>

        {/* ── Editor panel ────────────────────────────────────────────────── */}
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

      {/* ── Global Modals ─────────────────────────────────────────────────────── */}
      <CommandPalette />
      <SettingsModal />
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

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
          or press <kbd className="bg-surface-200 dark:bg-surface-700 px-1.5 py-0.5 rounded text-surface-500 font-mono">⌘N</kbd>
        </p>
      </div>
    </div>
  );
}
