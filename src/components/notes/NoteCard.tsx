'use client';

import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Pin,
  Archive,
  Trash2,
  Copy,
  Palette,
  MoreHorizontal,
  Star,
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
  const { pinNote, archiveNote, deleteNote, duplicateNote, setNoteColor } = useNotesStore();
  const [showActions, setShowActions] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);

  const colors = noteColorToClass(note.color);

  const handlePin = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    await pinNote(note.id);
    toast.success(note.pinned ? 'Unpinned' : 'Pinned');
  }, [pinNote, note.id, note.pinned]);

  const handleArchive = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    await archiveNote(note.id);
    toast.success('Archived');
  }, [archiveNote, note.id]);

  const handleDelete = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Delete this note?')) {
      await deleteNote(note.id);
      toast.success('Deleted');
    }
  }, [deleteNote, note.id]);

  const handleDuplicate = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    await duplicateNote(note.id);
    toast.success('Duplicated');
  }, [duplicateNote, note.id]);

  const handleColorChange = useCallback(async (color: NoteColor) => {
    await setNoteColor(note.id, color);
    setShowColorPicker(false);
  }, [setNoteColor, note.id]);

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
        onMouseEnter={() => setShowActions(true)}
        onMouseLeave={() => { setShowActions(false); setShowColorPicker(false); }}
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

        {/* Actions — always visible on mobile, hover-only on desktop */}
        <div className={cn(
          'flex items-center gap-0.5 flex-shrink-0 transition-opacity',
          'opacity-100 md:opacity-0 md:group-hover:opacity-100'
        )}>
          <ActionBtn onClick={handlePin} title={note.pinned ? 'Unpin' : 'Pin'}>
            <Star size={13} className={cn(note.pinned && 'fill-yellow-500 text-yellow-500')} />
          </ActionBtn>
          <ActionBtn onClick={handleArchive} title="Archive"><Archive size={13} /></ActionBtn>
          <ActionBtn onClick={handleDelete} title="Delete" danger><Trash2 size={13} /></ActionBtn>
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
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => { setShowActions(false); setShowColorPicker(false); }}
    >
      {/* Pin badge */}
      {note.pinned && (
        <div className="absolute top-2 right-2">
          <Star size={13} className="text-yellow-500 fill-yellow-500" />
        </div>
      )}

      {/* Icon / emoji */}
      {note.icon && (
        <div className="text-2xl mb-2 leading-none">{note.icon}</div>
      )}

      {/* Title */}
      <h3 className={cn(
        'font-semibold text-sm leading-snug mb-1.5',
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

      {/* Hover actions */}
      <AnimatedActions visible={showActions}>
        <ActionBtn onClick={handlePin} title={note.pinned ? 'Unpin' : 'Pin'}>
          <Star size={13} className={cn(note.pinned && 'fill-yellow-500 text-yellow-500')} />
        </ActionBtn>
        <div className="relative">
          <ActionBtn onClick={(e) => { e.stopPropagation(); setShowColorPicker(!showColorPicker); }} title="Color">
            <Palette size={13} />
          </ActionBtn>
          {showColorPicker && (
            <div
              className="absolute right-0 top-full mt-1 z-20 bg-white dark:bg-surface-800 rounded-xl shadow-dropdown border border-surface-200 dark:border-surface-700 p-2"
              onClick={(e) => e.stopPropagation()}
            >
              <ColorPicker value={note.color} onChange={handleColorChange} />
            </div>
          )}
        </div>
        <ActionBtn onClick={handleDuplicate} title="Duplicate"><Copy size={13} /></ActionBtn>
        <ActionBtn onClick={handleArchive} title="Archive"><Archive size={13} /></ActionBtn>
        <ActionBtn onClick={handleDelete} title="Delete" danger><Trash2 size={13} /></ActionBtn>
      </AnimatedActions>
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
