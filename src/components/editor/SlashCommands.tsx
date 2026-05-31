'use client';

import { forwardRef, useEffect, useImperativeHandle, useState } from 'react';
import { cn } from '@/lib/utils';

export interface SlashCommandItem {
  title: string;
  description: string;
  icon: string;
  command: (props: { editor: unknown; range: unknown }) => void;
}

interface SlashCommandListProps {
  items: SlashCommandItem[];
  command: (item: SlashCommandItem) => void;
}

export const SlashCommandList = forwardRef<{ onKeyDown: (props: { event: KeyboardEvent }) => boolean }, SlashCommandListProps>(
  ({ items, command }, ref) => {
    const [selectedIndex, setSelectedIndex] = useState(0);

    const selectItem = (index: number) => {
      const item = items[index];
      if (item) command(item);
    };

    const upHandler = () => {
      setSelectedIndex((i) => (i + items.length - 1) % items.length);
    };

    const downHandler = () => {
      setSelectedIndex((i) => (i + 1) % items.length);
    };

    const enterHandler = () => {
      selectItem(selectedIndex);
    };

    useEffect(() => setSelectedIndex(0), [items]);

    useImperativeHandle(ref, () => ({
      onKeyDown: ({ event }: { event: KeyboardEvent }) => {
        if (event.key === 'ArrowUp') { upHandler(); return true; }
        if (event.key === 'ArrowDown') { downHandler(); return true; }
        if (event.key === 'Enter') { enterHandler(); return true; }
        return false;
      },
    }));

    if (items.length === 0) return null;

    return (
      <div className="bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl shadow-dropdown overflow-hidden py-1.5 w-64 animate-scale-in">
        <p className="text-xs font-semibold text-surface-400 uppercase tracking-wider px-3 py-1">Insert</p>
        {items.map((item, index) => (
          <button
            key={item.title}
            onClick={() => selectItem(index)}
            className={cn(
              'w-full flex items-center gap-3 px-3 py-2 text-left transition-colors',
              index === selectedIndex
                ? 'bg-brand-500/10 text-brand-600 dark:text-brand-400'
                : 'text-surface-700 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-700'
            )}
          >
            <span className="w-7 h-7 flex items-center justify-center text-base bg-surface-100 dark:bg-surface-700 rounded-lg flex-shrink-0">
              {item.icon}
            </span>
            <div className="min-w-0">
              <p className="text-sm font-medium">{item.title}</p>
              <p className="text-xs text-surface-400 truncate">{item.description}</p>
            </div>
          </button>
        ))}
      </div>
    );
  }
);

SlashCommandList.displayName = 'SlashCommandList';

// ─── Slash command definitions ────────────────────────────────────────────────

export function getSlashCommands(): SlashCommandItem[] {
  return [
    {
      title: 'Heading 1',
      description: 'Large section heading',
      icon: 'H₁',
      command: ({ editor, range }: { editor: unknown; range: unknown }) => {
        (editor as ReturnType<typeof import('@tiptap/react').useEditor>)
          ?.chain().focus().deleteRange(range as { from: number; to: number })
          .setNode('heading', { level: 1 }).run();
      },
    },
    {
      title: 'Heading 2',
      description: 'Medium section heading',
      icon: 'H₂',
      command: ({ editor, range }: { editor: unknown; range: unknown }) => {
        (editor as ReturnType<typeof import('@tiptap/react').useEditor>)
          ?.chain().focus().deleteRange(range as { from: number; to: number })
          .setNode('heading', { level: 2 }).run();
      },
    },
    {
      title: 'Heading 3',
      description: 'Small section heading',
      icon: 'H₃',
      command: ({ editor, range }: { editor: unknown; range: unknown }) => {
        (editor as ReturnType<typeof import('@tiptap/react').useEditor>)
          ?.chain().focus().deleteRange(range as { from: number; to: number })
          .setNode('heading', { level: 3 }).run();
      },
    },
    {
      title: 'Bullet List',
      description: 'Unordered list with bullets',
      icon: '•',
      command: ({ editor, range }: { editor: unknown; range: unknown }) => {
        (editor as ReturnType<typeof import('@tiptap/react').useEditor>)
          ?.chain().focus().deleteRange(range as { from: number; to: number })
          .toggleBulletList().run();
      },
    },
    {
      title: 'Numbered List',
      description: 'Ordered numbered list',
      icon: '1.',
      command: ({ editor, range }: { editor: unknown; range: unknown }) => {
        (editor as ReturnType<typeof import('@tiptap/react').useEditor>)
          ?.chain().focus().deleteRange(range as { from: number; to: number })
          .toggleOrderedList().run();
      },
    },
    {
      title: 'Task List',
      description: 'Checklist with checkboxes',
      icon: '☑',
      command: ({ editor, range }: { editor: unknown; range: unknown }) => {
        (editor as ReturnType<typeof import('@tiptap/react').useEditor>)
          ?.chain().focus().deleteRange(range as { from: number; to: number })
          .toggleTaskList().run();
      },
    },
    {
      title: 'Code Block',
      description: 'Block of code with syntax highlighting',
      icon: '</>',
      command: ({ editor, range }: { editor: unknown; range: unknown }) => {
        (editor as ReturnType<typeof import('@tiptap/react').useEditor>)
          ?.chain().focus().deleteRange(range as { from: number; to: number })
          .toggleCodeBlock().run();
      },
    },
    {
      title: 'Quote',
      description: 'Block quotation',
      icon: '"',
      command: ({ editor, range }: { editor: unknown; range: unknown }) => {
        (editor as ReturnType<typeof import('@tiptap/react').useEditor>)
          ?.chain().focus().deleteRange(range as { from: number; to: number })
          .toggleBlockquote().run();
      },
    },
    {
      title: 'Table',
      description: 'Insert a table',
      icon: '⊞',
      command: ({ editor, range }: { editor: unknown; range: unknown }) => {
        (editor as ReturnType<typeof import('@tiptap/react').useEditor>)
          ?.chain().focus().deleteRange(range as { from: number; to: number })
          .insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
      },
    },
    {
      title: 'Divider',
      description: 'Horizontal rule to divide sections',
      icon: '—',
      command: ({ editor, range }: { editor: unknown; range: unknown }) => {
        (editor as ReturnType<typeof import('@tiptap/react').useEditor>)
          ?.chain().focus().deleteRange(range as { from: number; to: number })
          .setHorizontalRule().run();
      },
    },
  ];
}
