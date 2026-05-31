'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Folder } from '@/lib/types';

const FOLDER_ICONS = ['📁', '📂', '🗂️', '📋', '📌', '⭐', '🎯', '💡', '🔖', '🏷️', '📝', '💼', '🎓', '🏠', '💻'];
const FOLDER_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f59e0b',
  '#10b981', '#3b82f6', '#ef4444', '#14b8a6',
];

interface FolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (name: string, icon: string, color: string, parentId?: string) => void;
  initialName?: string;
  initialIcon?: string;
  initialColor?: string;
  initialParentId?: string;
  title?: string;
  folders?: Folder[];
  editingFolderId?: string;
}

export default function FolderModal({
  isOpen,
  onClose,
  onSubmit,
  initialName = '',
  initialIcon = '📁',
  initialColor = '#6366f1',
  initialParentId = '',
  title = 'New Folder',
  folders = [],
  editingFolderId,
}: FolderModalProps) {
  const [name, setName] = useState(initialName);
  const [icon, setIcon] = useState(initialIcon);
  const [color, setColor] = useState(initialColor);
  const [parentId, setParentId] = useState(initialParentId);

  useEffect(() => {
    if (isOpen) {
      setName(initialName);
      setIcon(initialIcon);
      setColor(initialColor);
      setParentId(initialParentId);
    }
  }, [isOpen, initialName, initialIcon, initialColor, initialParentId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSubmit(name.trim(), icon, color, parentId || undefined);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  };

  // Only show root folders as parent options (no nested nesting beyond 1 level)
  const parentOptions = folders.filter(
    (f) => !f.parentId && f.id !== editingFolderId
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/40"
            onClick={onClose}
          />
          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
          >
            <div
              className="pointer-events-auto w-full max-w-sm bg-white dark:bg-surface-800 rounded-2xl shadow-xl border border-surface-200 dark:border-surface-700"
              onKeyDown={handleKeyDown}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-surface-200 dark:border-surface-700">
                <h2 className="text-base font-semibold text-surface-900 dark:text-white">{title}</h2>
                <button
                  onClick={onClose}
                  className="p-1 rounded-lg text-surface-400 hover:text-surface-600 hover:bg-surface-100 dark:hover:bg-surface-700 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-5 space-y-4">
                {/* Icon picker */}
                <div>
                  <label className="block text-xs font-semibold text-surface-500 dark:text-surface-400 uppercase tracking-wider mb-2">
                    Icon
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {FOLDER_ICONS.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => setIcon(emoji)}
                        className={cn(
                          'w-9 h-9 rounded-lg text-lg flex items-center justify-center transition-all',
                          icon === emoji
                            ? 'bg-brand-500/15 ring-2 ring-brand-500 scale-110'
                            : 'hover:bg-surface-100 dark:hover:bg-surface-700'
                        )}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Color picker */}
                <div>
                  <label className="block text-xs font-semibold text-surface-500 dark:text-surface-400 uppercase tracking-wider mb-2">
                    Color
                  </label>
                  <div className="flex gap-2 flex-wrap">
                    {FOLDER_COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setColor(c)}
                        className={cn(
                          'w-7 h-7 rounded-full transition-all hover:scale-110',
                          color === c && 'ring-2 ring-offset-2 ring-offset-white dark:ring-offset-surface-800 scale-110'
                        )}
                        style={{
                          backgroundColor: c,
                          outline: color === c ? `2px solid ${c}` : 'none',
                          outlineOffset: color === c ? '2px' : '0',
                        }}
                        aria-label={c}
                      />
                    ))}
                  </div>
                </div>

                {/* Name input */}
                <div>
                  <label className="block text-xs font-semibold text-surface-500 dark:text-surface-400 uppercase tracking-wider mb-2">
                    Name
                  </label>
                  <input
                    autoFocus
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Folder name..."
                    className="w-full px-3 py-2.5 bg-surface-50 dark:bg-surface-700 border border-surface-200 dark:border-surface-600 rounded-xl text-sm text-surface-900 dark:text-white placeholder-surface-400 dark:placeholder-surface-500 outline-none focus:border-brand-500 dark:focus:border-brand-400 transition-colors"
                  />
                </div>

                {/* Parent folder picker */}
                {parentOptions.length > 0 && (
                  <div>
                    <label className="block text-xs font-semibold text-surface-500 dark:text-surface-400 uppercase tracking-wider mb-2">
                      Parent Folder (optional)
                    </label>
                    <select
                      value={parentId}
                      onChange={(e) => setParentId(e.target.value)}
                      className="w-full px-3 py-2.5 bg-surface-50 dark:bg-surface-700 border border-surface-200 dark:border-surface-600 rounded-xl text-sm text-surface-900 dark:text-white outline-none focus:border-brand-500 dark:focus:border-brand-400 transition-colors"
                    >
                      <option value="">— None (root folder) —</option>
                      {parentOptions.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.icon} {f.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Preview */}
                <div className="flex items-center gap-2 px-3 py-2 bg-surface-50 dark:bg-surface-700/50 rounded-xl">
                  {parentId && (
                    <span className="text-xs text-surface-400">
                      {parentOptions.find((f) => f.id === parentId)?.icon}{' '}
                      {parentOptions.find((f) => f.id === parentId)?.name} /
                    </span>
                  )}
                  <span className="text-xl">{icon}</span>
                  <span className="text-sm font-medium" style={{ color }}>
                    {name || 'Folder name'}
                  </span>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 px-4 py-2 rounded-xl text-sm font-medium text-surface-600 dark:text-surface-300 bg-surface-100 dark:bg-surface-700 hover:bg-surface-200 dark:hover:bg-surface-600 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!name.trim()}
                    className="flex-1 px-4 py-2 rounded-xl text-sm font-medium text-white bg-brand-500 hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {title === 'New Folder' ? 'Create' : 'Save'}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
