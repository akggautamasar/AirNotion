'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  PenLine,
  Search,
  FileText,
  Star,
  Archive,
  Settings,
  Plus,
  ChevronDown,
  ChevronRight,
  FolderPlus,
  Trash2,
  Pencil,
  RefreshCw,
  CheckCircle,
  XCircle,
  Loader,
  X,
  Hash,
  Send,
} from 'lucide-react';
import { useNotesStore } from '@/store/notesStore';
import { cn, formatRelativeTime, formatBytes } from '@/lib/utils';
import { storage } from '@/lib/storage';
import toast from 'react-hot-toast';

interface SidebarProps {
  onClose?: () => void;
}

export default function Sidebar({ onClose }: SidebarProps) {
  const {
    notes,
    folders,
    tags,
    settings,
    selectedFolder,
    selectedTag,
    createNote,
    createFolder,
    updateFolder,
    deleteFolder,
    setSelectedFolder,
    setSelectedTag,
    setActiveNote,
    syncWithTelegram,
    openSettings,
    openSearch,
    setSettings,
  } = useNotesStore();

  const [foldersExpanded, setFoldersExpanded] = useState(true);
  const [tagsExpanded, setTagsExpanded] = useState(true);
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [editingFolderName, setEditingFolderName] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);

  const activeNoteCount = notes.filter((n) => !n.archived).length;
  const pinnedCount = notes.filter((n) => n.pinned && !n.archived).length;
  const archivedCount = notes.filter((n) => n.archived).length;
  const storageSize = storage.getStorageSize();

  const handleNewNote = useCallback(async () => {
    const note = await createNote();
    setActiveNote(note.id);
    onClose?.();
    toast.success('New note created');
  }, [createNote, setActiveNote, onClose]);

  const handleNewFolder = useCallback(() => {
    const name = prompt('Folder name:');
    if (name?.trim()) {
      createFolder(name.trim());
      toast.success(`Folder "${name.trim()}" created`);
    }
  }, [createFolder]);

  const handleSync = useCallback(async () => {
    if (!settings.telegramBotToken || !settings.telegramChatId) {
      toast.error('Configure Telegram in Settings first');
      openSettings();
      return;
    }
    setIsSyncing(true);
    try {
      await syncWithTelegram();
      toast.success('Synced with Telegram');
    } catch {
      toast.error('Sync failed');
    } finally {
      setIsSyncing(false);
    }
  }, [settings, syncWithTelegram, openSettings]);

  const startEditFolder = (id: string, name: string) => {
    setEditingFolderId(id);
    setEditingFolderName(name);
  };

  const saveEditFolder = () => {
    if (editingFolderId && editingFolderName.trim()) {
      updateFolder(editingFolderId, { name: editingFolderName.trim() });
    }
    setEditingFolderId(null);
  };

  const handleDeleteFolder = (id: string, name: string) => {
    if (confirm(`Delete folder "${name}"? Notes inside will be moved to All Notes.`)) {
      deleteFolder(id);
      toast.success('Folder deleted');
    }
  };

  const navItems = [
    { id: 'all',      icon: <FileText size={15} />, label: 'All Notes',     count: activeNoteCount },
    { id: 'starred',  icon: <Star size={15} />,     label: 'Starred',       count: pinnedCount     },
    { id: 'archived', icon: <Archive size={15} />,  label: 'Archived',      count: archivedCount   },
  ];

  const syncStatusIcon = () => {
    if (isSyncing || settings.syncStatus === 'syncing') return <Loader size={12} className="animate-spin text-blue-400" />;
    if (settings.syncStatus === 'success') return <CheckCircle size={12} className="text-green-400" />;
    if (settings.syncStatus === 'error') return <XCircle size={12} className="text-red-400" />;
    return null;
  };

  return (
    <aside className="flex flex-col h-full bg-surface-50 dark:bg-surface-900 border-r border-surface-200 dark:border-surface-800 w-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-surface-200 dark:border-surface-800">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-gradient-to-br from-brand-500 to-accent-500 rounded-lg flex items-center justify-center">
            <Send size={14} className="text-white -rotate-45" />
          </div>
          <span className="font-bold text-surface-900 dark:text-white text-base tracking-tight">AirNotion</span>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1 rounded-md text-surface-400 hover:text-surface-600 hover:bg-surface-200 dark:hover:bg-surface-800 transition-colors lg:hidden"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* New Note + Search */}
      <div className="px-3 pt-3 pb-2 space-y-2">
        <button
          onClick={handleNewNote}
          className="w-full flex items-center gap-2 px-3 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-lg text-sm font-medium transition-colors"
        >
          <PenLine size={15} />
          New Note
        </button>
        <button
          onClick={openSearch}
          className="w-full flex items-center gap-2 px-3 py-2 bg-surface-100 dark:bg-surface-800 hover:bg-surface-200 dark:hover:bg-surface-700 text-surface-600 dark:text-surface-400 rounded-lg text-sm transition-colors"
        >
          <Search size={14} />
          <span className="flex-1 text-left">Search notes...</span>
          <kbd className="text-xs bg-surface-200 dark:bg-surface-700 px-1.5 py-0.5 rounded text-surface-400">⌘K</kbd>
        </button>
      </div>

      {/* Scrollable nav */}
      <nav className="flex-1 overflow-y-auto px-2 pb-2 space-y-0.5">
        {/* Main nav */}
        {navItems.map((item) => (
          <NavItem
            key={item.id}
            icon={item.icon}
            label={item.label}
            count={item.count}
            active={selectedFolder === item.id && !selectedTag}
            onClick={() => { setSelectedFolder(item.id); setSelectedTag(null); onClose?.(); }}
          />
        ))}

        <div className="my-2 border-t border-surface-200 dark:border-surface-800" />

        {/* Folders */}
        <div>
          <button
            onClick={() => setFoldersExpanded(!foldersExpanded)}
            className="w-full flex items-center justify-between px-2 py-1 text-xs font-semibold text-surface-400 dark:text-surface-500 uppercase tracking-wider hover:text-surface-600 dark:hover:text-surface-300 transition-colors group"
          >
            <div className="flex items-center gap-1">
              {foldersExpanded ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
              Folders
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); handleNewFolder(); }}
              className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-surface-200 dark:hover:bg-surface-700 transition-all"
              title="New Folder"
            >
              <FolderPlus size={12} />
            </button>
          </button>

          <AnimatePresence>
            {foldersExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="overflow-hidden"
              >
                {folders.length === 0 ? (
                  <button
                    onClick={handleNewFolder}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-surface-400 hover:text-surface-600 dark:hover:text-surface-300 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
                  >
                    <Plus size={12} />
                    Add a folder
                  </button>
                ) : (
                  folders.map((folder) => (
                    <div key={folder.id} className="group">
                      {editingFolderId === folder.id ? (
                        <div className="flex items-center gap-1 px-2 py-1">
                          <input
                            autoFocus
                            value={editingFolderName}
                            onChange={(e) => setEditingFolderName(e.target.value)}
                            onBlur={saveEditFolder}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') saveEditFolder();
                              if (e.key === 'Escape') setEditingFolderId(null);
                            }}
                            className="flex-1 text-sm bg-white dark:bg-surface-800 border border-brand-500 rounded px-2 py-0.5 outline-none text-surface-900 dark:text-white"
                          />
                        </div>
                      ) : (
                        <div
                          className={cn(
                            'flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer transition-colors',
                            selectedFolder === folder.id && !selectedTag
                              ? 'bg-brand-500/10 text-brand-600 dark:text-brand-400'
                              : 'text-surface-700 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-800'
                          )}
                          onClick={() => { setSelectedFolder(folder.id); setSelectedTag(null); onClose?.(); }}
                        >
                          <span className="text-base flex-shrink-0" style={{ fontSize: '14px' }}>
                            {folder.icon}
                          </span>
                          <span className="flex-1 text-sm truncate">{folder.name}</span>
                          <span className="text-xs text-surface-400 flex-shrink-0">
                            {notes.filter(n => !n.archived && n.folder === folder.id).length}
                          </span>
                          <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 flex-shrink-0">
                            <button
                              onClick={(e) => { e.stopPropagation(); startEditFolder(folder.id, folder.name); }}
                              className="p-0.5 rounded hover:bg-surface-200 dark:hover:bg-surface-700"
                            >
                              <Pencil size={11} />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleDeleteFolder(folder.id, folder.name); }}
                              className="p-0.5 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-red-400"
                            >
                              <Trash2 size={11} />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Tags */}
        {tags.length > 0 && (
          <>
            <div className="my-2 border-t border-surface-200 dark:border-surface-800" />
            <div>
              <button
                onClick={() => setTagsExpanded(!tagsExpanded)}
                className="w-full flex items-center gap-1 px-2 py-1 text-xs font-semibold text-surface-400 dark:text-surface-500 uppercase tracking-wider hover:text-surface-600 dark:hover:text-surface-300 transition-colors"
              >
                {tagsExpanded ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
                Tags
              </button>

              <AnimatePresence>
                {tagsExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="overflow-hidden"
                  >
                    <div className="flex flex-wrap gap-1.5 px-2 py-1">
                      {tags.map((tag) => (
                        <button
                          key={tag.id}
                          onClick={() => { setSelectedTag(selectedTag === tag.name ? null : tag.name); onClose?.(); }}
                          className={cn(
                            'flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium transition-colors',
                            selectedTag === tag.name
                              ? 'bg-brand-500 text-white'
                              : 'bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-400 hover:bg-surface-200 dark:hover:bg-surface-700'
                          )}
                          style={selectedTag !== tag.name ? { borderLeft: `2px solid ${tag.color}` } : {}}
                        >
                          <Hash size={9} />
                          {tag.name}
                          <span className="opacity-60">{tag.count}</span>
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </>
        )}
      </nav>

      {/* Footer */}
      <div className="px-3 pb-3 pt-2 border-t border-surface-200 dark:border-surface-800 space-y-1">
        {/* Sync status */}
        <button
          onClick={handleSync}
          disabled={isSyncing || settings.syncStatus === 'syncing'}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-surface-600 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors disabled:opacity-60"
        >
          <RefreshCw size={13} className={cn(isSyncing && 'animate-spin')} />
          <span className="flex-1 text-left text-xs">
            {settings.telegramBotToken
              ? settings.lastSynced
                ? `Synced ${formatRelativeTime(settings.lastSynced)}`
                : 'Sync to Telegram'
              : 'Configure Telegram'}
          </span>
          {syncStatusIcon()}
        </button>

        {/* Storage */}
        <div className="flex items-center justify-between px-3 py-1">
          <span className="text-xs text-surface-400">{formatBytes(storageSize)} used</span>
          <span className="text-xs text-surface-400">{activeNoteCount} notes</span>
        </div>

        {/* Settings */}
        <button
          onClick={openSettings}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-surface-600 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
        >
          <Settings size={14} />
          Settings
        </button>
      </div>
    </aside>
  );
}

// ─── NavItem ──────────────────────────────────────────────────────────────────

function NavItem({
  icon,
  label,
  count,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  count?: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
        active
          ? 'bg-brand-500/10 text-brand-600 dark:text-brand-400'
          : 'text-surface-700 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-800'
      )}
    >
      <span className={cn('flex-shrink-0', active ? 'text-brand-500' : 'text-surface-400')}>
        {icon}
      </span>
      <span className="flex-1 text-left">{label}</span>
      {count !== undefined && count > 0 && (
        <span className={cn(
          'text-xs px-1.5 py-0.5 rounded-full font-medium flex-shrink-0',
          active
            ? 'bg-brand-500/20 text-brand-600 dark:text-brand-400'
            : 'bg-surface-100 dark:bg-surface-700 text-surface-400 dark:text-surface-500'
        )}>
          {count}
        </span>
      )}
    </button>
  );
}
