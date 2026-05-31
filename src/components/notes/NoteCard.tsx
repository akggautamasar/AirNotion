'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Pin,
  Archive,
  Trash2,
  Copy,
  Palette,
  MoreHorizontal,
  Star,
  RotateCcw,
  FolderOpen,
  Check,
} from 'lucide-react';
import { useNotesStore } from '@/store/notesStore';
import { cn, noteColorToClass, formatRelativeTime, truncate } from '@/lib/utils';
import ColorPicker from '@/components/ui/ColorPicker';
import type { Note, NoteColor } from '@/lib/types';
import toast from 'react-hot-toast';

interface NoteCardProps {
  note: Note;
  view: 'grid' | 'list';
  isActive?: boolean;
  onClick: () => void;
}

export default function NoteCard({ note, view, isActive, onClick }: NoteCardProps) {
  const { pinNote, archiveNote, restoreNote, deleteNote, duplicateNote, setNoteColor, folders, moveNoteToFolder } = useNotesStore();
  const [showDropdown, setShowDropdown] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showFolderPicker, setShowFolderPicker] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const colors = noteColorToClass(note.color);

  // Close dropdown on outside click
  useEffect(() => {
    if (!showDropdown) return;
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
        setShowColorPicker(false);
        setShowFolderPicker(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showDropdown]);

  const handlePin = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    await pinNote(note.id);
    toast.success(note.pinned ? 'Unpinned' : 'Pinned');
    setShowDropdown(false);
  }, [pinNote, note.id, note.pinned]);

  const handleArchive = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    await archiveNote(note.id);
    toast.success('Archived');
    setShowDropdown(false);
  }, [archiveNote, note.id]);

  const handleRestore = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    await restoreNote(note.id);
    toast.success('Restored');
    setShowDropdown(false);
  }, [restoreNote, note.id]);

  const handleDelete = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    await deleteNote(note.id);
    toast.success('Deleted');
    setShowDropdown(false);
  }, [deleteNote, note.id]);

  const handleDuplicate = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    await duplicateNote(note.id);
    toast.success('Duplicated');
    setShowDropdown(false);
  }, [duplicateNote, note.id]);

  const handleColorChange = useCallback(async (color: NoteColor) => {
    await setNoteColor(note.id, color);
    setShowColorPicker(false);
    setShowDropdown(false);
  }, [setNoteColor, note.id]);

  const handleMoveToFolder = useCallback(async (folderId: string) => {
    await moveNoteToFolder(note.id, folderId);
    toast.success('Moved to folder');
    setShowFolderPicker(false);
    setShowDropdown(false);
  }, [moveNoteToFolder, note.id]);

  const openDropdown = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowDropdown((v) => !v);
    setShowColorPicker(false);
    setShowFolderPicker(false);
  };

  const DropdownMenu = () => (
    <AnimatePresence>
      {showDropdown && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: -4 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -4 }}
          transition={{ duration: 0.1 }}
          className="absolute right-0 top-full mt-1 z-30 w-44 bg-white dark:bg-surface-800 rounded-xl shadow-dropdown border border-surface-200 dark:border-surface-700 py-1 overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Pin/Unpin */}
          <DropdownItem onClick={handlePin} icon={<Star size={13} className={cn(note.pinned && 'fill-yellow-500 text-yellow-500')} />}>
            {note.pinned ? 'Unpin' : 'Pin'}
          </DropdownItem>

          {/* Archive / Restore */}
          {note.archived ? (
            <DropdownItem onClick={handleRestore} icon={<RotateCcw size={13} />}>
              Restore to notes
            </DropdownItem>
          ) : (
            <DropdownItem onClick={handleArchive} icon={<Archive size={13} />}>
              Archive
            </DropdownItem>
          )}

          {/* Move to folder */}
          {folders.length > 0 && (
            <div className="relative">
              <button
                onClick={(e) => { e.stopPropagation(); setShowFolderPicker((v) => !v); setShowColorPicker(false); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-surface-700 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-700 transition-colors"
              >
                <FolderOpen size={13} className="text-surface-400 flex-shrink-0" />
                <span className="flex-1 text-left">Move to folder</span>
                <span className="text-surface-300 dark:text-surface-500">›</span>
              </button>
              <AnimatePresence>
                {showFolderPicker && (
                  <motion.div
                    initial={{ opacity: 0, x: -4 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -4 }}
                    transition={{ duration: 0.1 }}
                    className="absolute right-full top-0 mr-1 w-44 bg-white dark:bg-surface-800 rounded-xl shadow-dropdown border border-surface-200 dark:border-surface-700 py-1 z-40"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      onClick={() => handleMoveToFolder('all')}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs text-surface-700 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-700 transition-colors"
                    >
                      <span>📋</span>
                      <span className="flex-1 text-left">All Notes</span>
                      {note.folder === 'all' && <Check size={11} className="text-brand-500" />}
                    </button>
                    {folders.map((folder) => (
                      <button
                        key={folder.id}
                        onClick={() => handleMoveToFolder(folder.id)}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-surface-700 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-700 transition-colors"
                      >
                        <span>{folder.icon}</span>
                        <span className="flex-1 text-left truncate">{folder.name}</span>
                        {note.folder === folder.id && <Check size={11} className="text-brand-500" />}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Duplicate */}
          <DropdownItem onClick={handleDuplicate} icon={<Copy size={13} />}>
            Duplicate
          </DropdownItem>

          {/* Color */}
          <div className="relative">
            <button
              onClick={(e) => { e.stopPropagation(); setShowColorPicker((v) => !v); setShowFolderPicker(false); }}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs text-surface-700 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-700 transition-colors"
            >
              <Palette size={13} className="text-surface-400 flex-shrink-0" />
              <span className="flex-1 text-left">Color</span>
              <span className="text-surface-300 dark:text-surface-500">›</span>
            </button>
            <AnimatePresence>
              {showColorPicker && (
                <motion.div
                  initial={{ opacity: 0, x: -4 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -4 }}
                  transition={{ duration: 0.1 }}
                  className="absolute right-full top-0 mr-1 bg-white dark:bg-surface-800 rounded-xl shadow-dropdown border border-surface-200 dark:border-surface-700 p-2 z-40"
                  onClick={(e) => e.stopPropagation()}
                >
                  <ColorPicker value={note.color} onChange={handleColorChange} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="my-1 border-t border-surface-100 dark:border-surface-700" />

          {/* Delete */}
          <button
            onClick={handleDelete}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          >
            <Trash2 size={13} className="flex-shrink-0" />
            <span>Delete</span>
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );

  if (view === 'list') {
    return (
      <motion.div
        layout
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -4 }}
        onClick={onClick}
        className={cn(
          'group flex items-center gap-3 px-4 py-3 md:py-3 cursor-pointer transition-colors border-b border-surface-100 dark:border-surface-800 min-h-[80px] md:min-h-0',
          isActive
            ? 'bg-brand-500/10 border-l-2 border-l-brand-500'
            : `hover:bg-surface-100 dark:hover:bg-surface-800 active:bg-surface-100 dark:active:bg-surface-800 ${colors.bg} ${colors.bgDark}`
        )}
      >
        {/* Color dot */}
        {note.color !== 'default' && (
          <div className={cn('w-2 h-2 rounded-full flex-shrink-0', noteColorDot(note.color))} />
        )}
        {/* Pin indicator */}
        {note.pinned && <Star size={12} className="flex-shrink-0 text-yellow-500 fill-yellow-500" />}

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm md:text-sm font-medium text-surface-900 dark:text-surface-100 truncate">
              {note.title || <span className="text-surface-400 italic">Untitled</span>}
            </p>
            {note.tags.slice(0, 2).map((tag) => (
              <span key={tag} className="text-xs px-1.5 py-0.5 rounded-full bg-surface-100 dark:bg-surface-700 text-surface-500 dark:text-surface-400 flex-shrink-0 hidden sm:inline">
                #{tag}
              </span>
            ))}
          </div>
          {note.plainText && (
            <p className="text-xs text-surface-500 dark:text-surface-400 truncate mt-0.5">
              {truncate(note.plainText, 80)}
            </p>
          )}
          <p className="text-xs text-surface-400 mt-1 md:hidden">
            {formatRelativeTime(note.updatedAt)}
          </p>
        </div>

        {/* Date — hidden on mobile (shown inline above) */}
        <span className="text-xs text-surface-400 flex-shrink-0 hidden md:block">
          {formatRelativeTime(note.updatedAt)}
        </span>

        {/* Context menu button — always visible on mobile, hover-only on desktop */}
        <div ref={dropdownRef} className="relative flex-shrink-0">
          <button
            onClick={openDropdown}
            title="More options"
            className={cn(
              'p-1.5 rounded-lg transition-colors text-surface-400 hover:text-surface-700 dark:hover:text-surface-200 hover:bg-surface-100 dark:hover:bg-surface-700',
              'opacity-100 md:opacity-0 md:group-hover:opacity-100'
            )}
          >
            <MoreHorizontal size={15} />
          </button>
          <DropdownMenu />
        </div>
      </motion.div>
    );
  }

  // Grid view
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ y: -2 }}
      onClick={onClick}
      className={cn(
        'group relative flex flex-col p-4 rounded-xl cursor-pointer transition-all border shadow-card hover:shadow-card-hover',
        isActive ? 'ring-2 ring-brand-500 ring-offset-2 ring-offset-white dark:ring-offset-surface-900' : '',
        colors.bg, colors.bgDark, colors.border, colors.borderDark
      )}
    >
      {/* Pin badge */}
      {note.pinned && (
        <div className="absolute top-2 left-2">
          <Star size={13} className="text-yellow-500 fill-yellow-500" />
        </div>
      )}

      {/* Icon / emoji */}
      {note.icon && (
        <div className="text-2xl mb-2 leading-none">{note.icon}</div>
      )}

      {/* Title */}
      <h3 className={cn(
        'font-semibold text-sm leading-snug mb-1.5 pr-6',
        note.title ? 'text-surface-900 dark:text-surface-100' : 'text-surface-400 italic'
      )}>
        {note.title || 'Untitled'}
      </h3>

      {/* Preview */}
      {note.plainText && (
        <p className="text-xs text-surface-500 dark:text-surface-400 leading-relaxed truncate-3 flex-1 mb-2">
          {truncate(note.plainText, 120)}
        </p>
      )}

      {/* Tags */}
      {note.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {note.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="text-xs px-1.5 py-0.5 rounded-full bg-white/60 dark:bg-black/20 text-surface-500 dark:text-surface-400 border border-surface-200 dark:border-surface-700"
            >
              #{tag}
            </span>
          ))}
          {note.tags.length > 3 && (
            <span className="text-xs text-surface-400">+{note.tags.length - 3}</span>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between mt-auto">
        <span className="text-xs text-surface-400">{formatRelativeTime(note.updatedAt)}</span>
        {note.wordCount > 0 && (
          <span className="text-xs text-surface-400">{note.wordCount}w</span>
        )}
      </div>

      {/* Archived restore badge */}
      {note.archived && (
        <div className="absolute top-2 right-8">
          <button
            onClick={handleRestore}
            className="text-xs px-1.5 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 font-medium hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors"
          >
            Restore
          </button>
        </div>
      )}

      {/* Context menu button */}
      <div ref={dropdownRef} className="absolute top-2 right-2" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={openDropdown}
          title="More options"
          className={cn(
            'p-1 rounded-lg transition-colors text-surface-400 hover:text-surface-700 dark:hover:text-surface-200 hover:bg-white/80 dark:hover:bg-surface-700',
            'opacity-100 md:opacity-0 md:group-hover:opacity-100'
          )}
        >
          <MoreHorizontal size={14} />
        </button>
        <DropdownMenu />
      </div>
    </motion.div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function noteColorDot(color: string): string {
  const map: Record<string, string> = {
    red: 'bg-red-400', orange: 'bg-orange-400', yellow: 'bg-yellow-400',
    green: 'bg-green-400', teal: 'bg-teal-400', blue: 'bg-blue-400',
    purple: 'bg-purple-400', pink: 'bg-pink-400', brown: 'bg-amber-600', gray: 'bg-gray-400',
  };
  return map[color] || 'bg-surface-300';
}

function ActionBtn({
  children,
  onClick,
  title,
  danger,
}: {
  children: React.ReactNode;
  onClick: (e: React.MouseEvent) => void;
  title?: string;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={cn(
        'p-1.5 rounded-lg transition-colors',
        danger
          ? 'text-surface-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20'
          : 'text-surface-400 hover:text-surface-700 dark:hover:text-surface-200 hover:bg-white/80 dark:hover:bg-surface-700'
      )}
    >
      {children}
    </button>
  );
}

function AnimatedActions({ visible, children }: { visible: boolean; children: React.ReactNode }) {
  return (
    <div
      className={cn(
        'absolute top-2 right-2 flex items-center gap-0.5 bg-white dark:bg-surface-800 rounded-lg shadow-dropdown border border-surface-200 dark:border-surface-700 px-1 py-0.5 transition-all duration-150',
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-1 pointer-events-none'
      )}
    >
      {children}
    </div>
  );
}

function DropdownItem({
  children,
  onClick,
  icon,
}: {
  children: React.ReactNode;
  onClick: (e: React.MouseEvent) => void;
  icon?: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-2 px-3 py-2 text-xs text-surface-700 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-700 transition-colors"
    >
      {icon && <span className="text-surface-400 flex-shrink-0">{icon}</span>}
      <span>{children}</span>
    </button>
  );
}
