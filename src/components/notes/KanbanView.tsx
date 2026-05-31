'use client';

import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Plus } from 'lucide-react';
import { useNotesStore } from '@/store/notesStore';
import { cn, truncate, formatRelativeTime } from '@/lib/utils';
import type { Note } from '@/lib/types';
import toast from 'react-hot-toast';

type Status = 'todo' | 'in-progress' | 'done';

const COLUMNS: { id: Status; label: string; color: string; bg: string; bgDark: string }[] = [
  { id: 'todo',        label: 'To Do',       color: 'text-slate-500',    bg: 'bg-slate-100',  bgDark: 'dark:bg-slate-800/50'   },
  { id: 'in-progress', label: 'In Progress', color: 'text-blue-500',     bg: 'bg-blue-50',    bgDark: 'dark:bg-blue-950/30'    },
  { id: 'done',        label: 'Done',        color: 'text-green-500',    bg: 'bg-green-50',   bgDark: 'dark:bg-green-950/30'   },
];

export default function KanbanView() {
  const { getFilteredNotes, setNoteStatus, setActiveNote, createNote } = useNotesStore();
  const notes = getFilteredNotes();
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<Status | null>(null);

  const getNotesByStatus = (status: Status) =>
    notes.filter((n) => (n.status ?? 'todo') === status);

  const handleDragStart = (noteId: string) => {
    setDraggingId(noteId);
  };

  const handleDragOver = (e: React.DragEvent, status: Status) => {
    e.preventDefault();
    setDragOverColumn(status);
  };

  const handleDrop = useCallback(async (status: Status) => {
    if (!draggingId) return;
    await setNoteStatus(draggingId, status);
    setDraggingId(null);
    setDragOverColumn(null);
    toast.success(`Moved to ${COLUMNS.find(c => c.id === status)?.label}`);
  }, [draggingId, setNoteStatus]);

  const handleDragEnd = () => {
    setDraggingId(null);
    setDragOverColumn(null);
  };

  const handleAddNote = useCallback(async (status: Status) => {
    const note = await createNote({ status });
    setActiveNote(note.id);
  }, [createNote, setActiveNote]);

  return (
    <div className="flex gap-4 h-full p-4 overflow-x-auto">
      {COLUMNS.map((col) => {
        const colNotes = getNotesByStatus(col.id);
        const isDragOver = dragOverColumn === col.id;

        return (
          <div
            key={col.id}
            className={cn(
              'flex-shrink-0 w-72 flex flex-col rounded-xl transition-colors',
              col.bg, col.bgDark,
              isDragOver && 'ring-2 ring-brand-400'
            )}
            onDragOver={(e) => handleDragOver(e, col.id)}
            onDrop={() => handleDrop(col.id)}
            onDragLeave={() => setDragOverColumn(null)}
          >
            {/* Column header */}
            <div className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-2">
                <span className={cn('text-sm font-semibold', col.color)}>{col.label}</span>
                <span className="text-xs bg-white/70 dark:bg-black/20 text-surface-500 px-1.5 py-0.5 rounded-full font-medium">
                  {colNotes.length}
                </span>
              </div>
              <button
                onClick={() => handleAddNote(col.id)}
                className="p-1 rounded-md text-surface-400 hover:text-surface-600 hover:bg-white/50 dark:hover:bg-black/20 transition-colors"
                title="Add note"
              >
                <Plus size={14} />
              </button>
            </div>

            {/* Cards */}
            <div className="flex-1 flex flex-col gap-2.5 px-3 pb-3 overflow-y-auto">
              {colNotes.map((note) => (
                <KanbanCard
                  key={note.id}
                  note={note}
                  isDragging={draggingId === note.id}
                  onDragStart={() => handleDragStart(note.id)}
                  onDragEnd={handleDragEnd}
                  onClick={() => setActiveNote(note.id)}
                />
              ))}

              {/* Empty state */}
              {colNotes.length === 0 && (
                <div
                  className={cn(
                    'flex flex-col items-center justify-center py-8 text-surface-400 rounded-lg border-2 border-dashed transition-colors',
                    isDragOver
                      ? 'border-brand-400 bg-brand-50/50 dark:bg-brand-950/20'
                      : 'border-surface-200 dark:border-surface-700'
                  )}
                >
                  <p className="text-sm">Drop here</p>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Kanban Card ──────────────────────────────────────────────────────────────

interface KanbanCardProps {
  note: Note;
  isDragging: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
  onClick: () => void;
}

function KanbanCard({ note, isDragging, onDragStart, onDragEnd, onClick }: KanbanCardProps) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onClick}
      className={cn(
        'bg-white dark:bg-surface-800 rounded-lg p-3 shadow-card cursor-pointer border border-surface-200 dark:border-surface-700 hover:shadow-card-hover transition-all select-none',
        isDragging && 'opacity-50 rotate-2 scale-105 shadow-lg'
      )}
    >
      {/* Icon */}
      {note.icon && <div className="text-xl mb-1.5">{note.icon}</div>}

      {/* Title */}
      <h4 className={cn(
        'text-sm font-semibold leading-snug mb-1',
        note.title ? 'text-surface-900 dark:text-surface-100' : 'text-surface-400 italic'
      )}>
        {note.title || 'Untitled'}
      </h4>

      {/* Preview */}
      {note.plainText && (
        <p className="text-xs text-surface-500 dark:text-surface-400 leading-relaxed line-clamp-2 mb-2">
          {truncate(note.plainText, 80)}
        </p>
      )}

      {/* Tags */}
      {note.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {note.tags.slice(0, 3).map((tag) => (
            <span key={tag} className="text-xs px-1.5 py-0.5 rounded-full bg-surface-100 dark:bg-surface-700 text-surface-500 dark:text-surface-400">
              #{tag}
            </span>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-surface-400">{formatRelativeTime(note.updatedAt)}</span>
        {note.dueDate && (
          <span className={cn(
            'text-xs px-1.5 py-0.5 rounded font-medium',
            new Date(note.dueDate) < new Date()
              ? 'bg-red-100 dark:bg-red-900/30 text-red-500'
              : 'bg-blue-100 dark:bg-blue-900/30 text-blue-500'
          )}>
            {new Date(note.dueDate).toLocaleDateString()}
          </span>
        )}
      </div>
    </motion.div>
  );
}
