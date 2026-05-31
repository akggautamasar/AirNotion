'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  FileText,
  Plus,
  Sun,
  Moon,
  FolderPlus,
  Archive,
  Star,
  Settings,
  X,
  Clock,
  Hash,
} from 'lucide-react';
import { useNotesStore } from '@/store/notesStore';
import { cn, formatRelativeTime } from '@/lib/utils';
import toast from 'react-hot-toast';

interface CommandItem {
  id: string;
  label: string;
  description?: string;
  icon: React.ReactNode;
  action: () => void;
  category: 'action' | 'note' | 'navigation';
  keywords?: string[];
}

export default function CommandPalette() {
  const {
    isCommandPaletteOpen,
    closeCommandPalette,
    notes,
    createNote,
    setActiveNote,
    settings,
    setSettings,
    createFolder,
    openSettings,
    setSelectedFolder,
  } = useNotesStore();

  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Focus input when opened
  useEffect(() => {
    if (isCommandPaletteOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isCommandPaletteOpen]);

  const handleCreateNote = useCallback(async () => {
    closeCommandPalette();
    const note = await createNote();
    setActiveNote(note.id);
    toast.success('New note created');
  }, [closeCommandPalette, createNote, setActiveNote]);

  const handleToggleTheme = useCallback(() => {
    closeCommandPalette();
    setSettings({ theme: settings.theme === 'dark' ? 'light' : 'dark' });
    toast.success(`Switched to ${settings.theme === 'dark' ? 'light' : 'dark'} mode`);
  }, [closeCommandPalette, setSettings, settings.theme]);

  const handleCreateFolder = useCallback(() => {
    closeCommandPalette();
    const name = prompt('Folder name:');
    if (name?.trim()) {
      createFolder(name.trim());
      toast.success(`Folder "${name}" created`);
    }
  }, [closeCommandPalette, createFolder]);

  // Build commands list
  const staticCommands: CommandItem[] = [
    {
      id: 'new-note',
      label: 'New Note',
      description: 'Create a blank note',
      icon: <Plus size={16} />,
      action: handleCreateNote,
      category: 'action',
      keywords: ['create', 'add', 'write'],
    },
    {
      id: 'new-folder',
      label: 'New Folder',
      description: 'Create a new folder',
      icon: <FolderPlus size={16} />,
      action: handleCreateFolder,
      category: 'action',
      keywords: ['create', 'directory'],
    },
    {
      id: 'toggle-theme',
      label: `Switch to ${settings.theme === 'dark' ? 'Light' : 'Dark'} Mode`,
      description: 'Toggle color theme',
      icon: settings.theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />,
      action: handleToggleTheme,
      category: 'action',
      keywords: ['theme', 'dark', 'light', 'appearance'],
    },
    {
      id: 'open-settings',
      label: 'Open Settings',
      description: 'Configure AirNotion',
      icon: <Settings size={16} />,
      action: () => { closeCommandPalette(); openSettings(); },
      category: 'action',
      keywords: ['config', 'preferences', 'telegram'],
    },
    {
      id: 'go-all-notes',
      label: 'All Notes',
      description: 'Navigate to all notes',
      icon: <FileText size={16} />,
      action: () => { closeCommandPalette(); setSelectedFolder('all'); },
      category: 'navigation',
      keywords: ['home', 'notes'],
    },
    {
      id: 'go-starred',
      label: 'Starred Notes',
      description: 'View starred notes',
      icon: <Star size={16} />,
      action: () => { closeCommandPalette(); setSelectedFolder('starred'); },
      category: 'navigation',
      keywords: ['pinned', 'favorite'],
    },
    {
      id: 'go-archived',
      label: 'Archived Notes',
      description: 'View archived notes',
      icon: <Archive size={16} />,
      action: () => { closeCommandPalette(); setSelectedFolder('archived'); },
      category: 'navigation',
      keywords: ['trash'],
    },
  ];

  // Note commands from recent/matching notes
  const noteCommands: CommandItem[] = notes
    .filter((n) => !n.archived)
    .slice(0, 20)
    .map((note) => ({
      id: `note-${note.id}`,
      label: note.title || 'Untitled',
      description: formatRelativeTime(note.updatedAt),
      icon: <FileText size={16} />,
      action: () => {
        closeCommandPalette();
        setActiveNote(note.id);
      },
      category: 'note' as const,
      keywords: [note.plainText.slice(0, 100), ...note.tags],
    }));

  const allCommands = [...staticCommands, ...noteCommands];

  // Filter by query
  const filteredCommands = query
    ? allCommands.filter((cmd) => {
        const q = query.toLowerCase();
        return (
          cmd.label.toLowerCase().includes(q) ||
          cmd.description?.toLowerCase().includes(q) ||
          cmd.keywords?.some((k) => k.toLowerCase().includes(q))
        );
      })
    : allCommands;

  // Group by category
  const grouped = {
    action: filteredCommands.filter((c) => c.category === 'action'),
    navigation: filteredCommands.filter((c) => c.category === 'navigation'),
    note: filteredCommands.filter((c) => c.category === 'note'),
  };

  const flatList = [
    ...grouped.action,
    ...grouped.navigation,
    ...grouped.note,
  ];

  // Keyboard navigation
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (!isCommandPaletteOpen) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, flatList.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const selected = flatList[selectedIndex];
        if (selected) selected.action();
      } else if (e.key === 'Escape') {
        closeCommandPalette();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isCommandPaletteOpen, flatList, selectedIndex, closeCommandPalette]);

  // Reset selection when query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Scroll selected into view
  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-index="${selectedIndex}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  if (!isCommandPaletteOpen) return null;

  const renderGroup = (
    label: string,
    icon: React.ReactNode,
    items: CommandItem[],
    offset: number
  ) => {
    if (items.length === 0) return null;
    return (
      <div key={label}>
        <div className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-surface-400 dark:text-surface-500 uppercase tracking-wider">
          {icon}
          {label}
        </div>
        {items.map((cmd, i) => {
          const index = offset + i;
          return (
            <button
              key={cmd.id}
              data-index={index}
              onClick={cmd.action}
              onMouseEnter={() => setSelectedIndex(index)}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors duration-75',
                index === selectedIndex
                  ? 'bg-brand-500/10 text-brand-600 dark:text-brand-400'
                  : 'text-surface-700 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-800'
              )}
            >
              <span className={cn(
                'flex-shrink-0 w-7 h-7 rounded-md flex items-center justify-center',
                index === selectedIndex
                  ? 'bg-brand-500/20 text-brand-600 dark:text-brand-400'
                  : 'bg-surface-100 dark:bg-surface-800 text-surface-500'
              )}>
                {cmd.icon}
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{cmd.label}</div>
                {cmd.description && (
                  <div className="text-xs text-surface-400 dark:text-surface-500 truncate">
                    {cmd.description}
                  </div>
                )}
              </div>
              {index === selectedIndex && (
                <kbd className="flex-shrink-0 text-xs bg-surface-100 dark:bg-surface-700 text-surface-400 px-1.5 py-0.5 rounded border border-surface-200 dark:border-surface-600">
                  ↵
                </kbd>
              )}
            </button>
          );
        })}
      </div>
    );
  };

  const actionOffset = 0;
  const navOffset = grouped.action.length;
  const noteOffset = navOffset + grouped.navigation.length;

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]"
        onClick={(e) => {
          if (e.target === e.currentTarget) closeCommandPalette();
        }}
      >
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        />

        {/* Panel */}
        <motion.div
          initial={{ opacity: 0, scale: 0.97, y: -8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.97, y: -8 }}
          transition={{ duration: 0.15 }}
          className="relative w-full max-w-lg mx-4 bg-white dark:bg-surface-900 rounded-xl shadow-modal border border-surface-200 dark:border-surface-700 overflow-hidden"
        >
          {/* Search input */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-surface-200 dark:border-surface-700">
            <Search size={16} className="text-surface-400 flex-shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search notes or run a command..."
              className="flex-1 bg-transparent text-sm text-surface-900 dark:text-surface-100 placeholder-surface-400 outline-none"
            />
            {query && (
              <button onClick={() => setQuery('')} className="text-surface-400 hover:text-surface-600 dark:hover:text-surface-200">
                <X size={14} />
              </button>
            )}
            <kbd className="text-xs bg-surface-100 dark:bg-surface-800 text-surface-400 px-1.5 py-0.5 rounded border border-surface-200 dark:border-surface-700">
              Esc
            </kbd>
          </div>

          {/* Results */}
          <div ref={listRef} className="max-h-80 overflow-y-auto py-1">
            {flatList.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-surface-400">
                <Search size={24} className="mb-2 opacity-50" />
                <p className="text-sm">No results for "{query}"</p>
              </div>
            ) : (
              <>
                {renderGroup('Actions', <Hash size={10} />, grouped.action, actionOffset)}
                {renderGroup('Navigate', <Hash size={10} />, grouped.navigation, navOffset)}
                {renderGroup('Notes', <Clock size={10} />, grouped.note, noteOffset)}
              </>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-4 py-2 border-t border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-900/50">
            <div className="flex items-center gap-3 text-xs text-surface-400">
              <span className="flex items-center gap-1">
                <kbd className="bg-surface-200 dark:bg-surface-700 px-1 rounded">↑↓</kbd> navigate
              </span>
              <span className="flex items-center gap-1">
                <kbd className="bg-surface-200 dark:bg-surface-700 px-1 rounded">↵</kbd> select
              </span>
            </div>
            <span className="text-xs text-surface-400">{flatList.length} results</span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
