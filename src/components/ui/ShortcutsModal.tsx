'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X, Keyboard } from 'lucide-react';

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SHORTCUTS = [
  {
    category: 'Global',
    items: [
      { keys: ['⌘', 'N'], action: 'New note' },
      { keys: ['⌘', 'K'], action: 'Command palette' },
      { keys: ['⌘', 'F'], action: 'Search notes' },
      { keys: ['⌘', '\\'], action: 'Toggle sidebar' },
      { keys: ['⌘', ','], action: 'Open settings' },
    ],
  },
  {
    category: 'Editor',
    items: [
      { keys: ['⌘', 'S'], action: 'Save note' },
      { keys: ['⌘', '⇧', 'F'], action: 'Focus mode' },
      { keys: ['⌘', 'Z'], action: 'Undo' },
      { keys: ['⌘', '⇧', 'Z'], action: 'Redo' },
      { keys: ['/'], action: 'Slash commands' },
      { keys: ['⌘', 'Enter'], action: 'Toggle task done' },
    ],
  },
  {
    category: 'Formatting',
    items: [
      { keys: ['⌘', 'B'], action: 'Bold' },
      { keys: ['⌘', 'I'], action: 'Italic' },
      { keys: ['⌘', 'U'], action: 'Underline' },
      { keys: ['⌘', '⇧', 'S'], action: 'Strikethrough' },
      { keys: ['⌘', 'E'], action: 'Inline code' },
      { keys: ['⌘', '⇧', 'H'], action: 'Highlight' },
      { keys: ['⌘', 'K'], action: 'Insert / edit link' },
      { keys: ['⌘', '⇧', '7'], action: 'Ordered list' },
      { keys: ['⌘', '⇧', '8'], action: 'Bullet list' },
      { keys: ['⌘', '⇧', '9'], action: 'Task list' },
    ],
  },
];

export default function ShortcutsModal({ isOpen, onClose }: ShortcutsModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.15 }}
            className="fixed z-50 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white dark:bg-surface-800 rounded-2xl shadow-2xl overflow-hidden max-h-[85vh] flex flex-col mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2.5 px-5 py-4 border-b border-surface-200 dark:border-surface-700 flex-shrink-0">
              <Keyboard size={16} className="text-brand-500 flex-shrink-0" />
              <h2 className="text-base font-semibold text-surface-900 dark:text-white flex-1">Keyboard Shortcuts</h2>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-surface-400 hover:text-surface-600 hover:bg-surface-100 dark:hover:bg-surface-700 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <div className="overflow-y-auto p-4 space-y-5">
              {SHORTCUTS.map((section) => (
                <div key={section.category}>
                  <p className="text-xs font-semibold text-surface-400 dark:text-surface-500 uppercase tracking-wider mb-2 px-1">
                    {section.category}
                  </p>
                  <div className="rounded-xl border border-surface-100 dark:border-surface-700 overflow-hidden divide-y divide-surface-100 dark:divide-surface-700">
                    {section.items.map((item) => (
                      <div
                        key={item.action}
                        className="flex items-center justify-between px-3 py-2 hover:bg-surface-50 dark:hover:bg-surface-750 transition-colors"
                      >
                        <span className="text-sm text-surface-700 dark:text-surface-300">{item.action}</span>
                        <div className="flex items-center gap-1 flex-shrink-0 ml-4">
                          {item.keys.map((key, i) => (
                            <kbd
                              key={i}
                              className="px-1.5 py-0.5 text-xs bg-surface-100 dark:bg-surface-700 text-surface-600 dark:text-surface-300 rounded-md border border-surface-200 dark:border-surface-600 font-mono leading-tight"
                            >
                              {key}
                            </kbd>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="px-5 py-3 border-t border-surface-100 dark:border-surface-700 flex-shrink-0">
              <p className="text-xs text-surface-400 text-center">
                On Windows/Linux, use <kbd className="px-1 py-0.5 bg-surface-100 dark:bg-surface-700 rounded text-[10px] border border-surface-200 dark:border-surface-600">Ctrl</kbd> instead of <kbd className="px-1 py-0.5 bg-surface-100 dark:bg-surface-700 rounded text-[10px] border border-surface-200 dark:border-surface-600">⌘</kbd>
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
