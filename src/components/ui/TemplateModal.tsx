'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

interface TemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (title: string, content: string, icon: string) => void;
}

const today = typeof window !== 'undefined'
  ? new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
  : '';

const TEMPLATES = [
  {
    id: 'meeting',
    icon: '📋',
    name: 'Meeting Notes',
    description: 'Agenda, discussion, action items',
    content: `<h2>Meeting Notes</h2><p><strong>Date:</strong> ${today}</p><p><strong>Attendees:</strong> </p><hr/><h3>Agenda</h3><ul><li><p></p></li></ul><h3>Discussion</h3><p></p><h3>Action Items</h3><ul data-type="taskList"><li data-type="taskItem" data-checked="false"><p></p></li></ul>`,
  },
  {
    id: 'journal',
    icon: '📔',
    name: 'Daily Journal',
    description: 'Reflect and plan your day',
    content: `<h2>Daily Journal</h2><p><strong>${today}</strong></p><h3>How am I feeling?</h3><p></p><h3>What happened today?</h3><p></p><h3>Grateful for</h3><ul><li><p></p></li><li><p></p></li><li><p></p></li></ul><h3>Goals for tomorrow</h3><ul data-type="taskList"><li data-type="taskItem" data-checked="false"><p></p></li></ul>`,
  },
  {
    id: 'project',
    icon: '🎯',
    name: 'Project Plan',
    description: 'Goals, milestones, tasks',
    content: `<h2>Project Plan</h2><p><strong>Project:</strong> </p><p><strong>Goal:</strong> </p><p><strong>Deadline:</strong> </p><hr/><h3>Milestones</h3><ul data-type="taskList"><li data-type="taskItem" data-checked="false"><p></p></li></ul><h3>Resources Needed</h3><ul><li><p></p></li></ul><h3>Notes</h3><p></p>`,
  },
  {
    id: 'todo',
    icon: '✅',
    name: 'Todo List',
    description: 'Tasks with checkboxes',
    content: `<h2>Todo List</h2><ul data-type="taskList"><li data-type="taskItem" data-checked="false"><p></p></li><li data-type="taskItem" data-checked="false"><p></p></li><li data-type="taskItem" data-checked="false"><p></p></li><li data-type="taskItem" data-checked="false"><p></p></li></ul>`,
  },
  {
    id: 'brainstorm',
    icon: '💡',
    name: 'Brainstorm',
    description: 'Capture and organise ideas',
    content: `<h2>Brainstorm</h2><p><strong>Topic:</strong> </p><hr/><h3>Ideas (no filter)</h3><ul><li><p></p></li><li><p></p></li><li><p></p></li></ul><h3>Best Ideas</h3><ul data-type="taskList"><li data-type="taskItem" data-checked="false"><p></p></li></ul><blockquote><p>Key insight: </p></blockquote>`,
  },
  {
    id: 'bug',
    icon: '🐛',
    name: 'Bug Report',
    description: 'Steps to reproduce & fix',
    content: `<h2>Bug Report</h2><p><strong>Date:</strong> ${today}</p><hr/><h3>Summary</h3><p></p><h3>Steps to Reproduce</h3><ol><li><p></p></li></ol><h3>Expected Behavior</h3><p></p><h3>Actual Behavior</h3><p></p><h3>Environment</h3><ul><li><p>OS: </p></li><li><p>Browser: </p></li><li><p>Version: </p></li></ul>`,
  },
  {
    id: 'recipe',
    icon: '🍳',
    name: 'Recipe',
    description: 'Ingredients & instructions',
    content: `<h2>Recipe Name</h2><p><strong>Prep:</strong>   <strong>Cook:</strong>   <strong>Servings:</strong> </p><hr/><h3>Ingredients</h3><ul><li><p></p></li></ul><h3>Instructions</h3><ol><li><p></p></li></ol><h3>Notes</h3><p></p>`,
  },
  {
    id: 'blank',
    icon: '📄',
    name: 'Blank Note',
    description: 'Start from scratch',
    content: '',
  },
];

export default function TemplateModal({ isOpen, onClose, onCreate }: TemplateModalProps) {
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
            className="fixed z-50 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-white dark:bg-surface-800 rounded-2xl shadow-2xl overflow-hidden max-h-[80vh] flex flex-col mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-surface-200 dark:border-surface-700 flex-shrink-0">
              <div>
                <h2 className="text-base font-semibold text-surface-900 dark:text-white">Choose a Template</h2>
                <p className="text-xs text-surface-400 mt-0.5">Start with a pre-filled structure</p>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-surface-400 hover:text-surface-600 hover:bg-surface-100 dark:hover:bg-surface-700 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <div className="overflow-y-auto p-4 grid grid-cols-2 gap-3">
              {TEMPLATES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => {
                    onCreate(t.id === 'blank' ? '' : t.name, t.content, t.icon);
                    onClose();
                  }}
                  className="flex flex-col items-start gap-1.5 p-4 rounded-xl border border-surface-200 dark:border-surface-700 hover:border-brand-400 hover:bg-brand-50/40 dark:hover:bg-brand-900/20 transition-all text-left group"
                >
                  <span className="text-2xl">{t.icon}</span>
                  <p className="text-sm font-semibold text-surface-900 dark:text-surface-100 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                    {t.name}
                  </p>
                  <p className="text-xs text-surface-400 dark:text-surface-500">{t.description}</p>
                </button>
              ))}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
