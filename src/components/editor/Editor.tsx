'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { useEditor, EditorContent, ReactRenderer, ReactNodeViewRenderer } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Bold from '@tiptap/extension-bold';
import Italic from '@tiptap/extension-italic';
import Underline from '@tiptap/extension-underline';
import Strike from '@tiptap/extension-strike';
import Code from '@tiptap/extension-code';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import Color from '@tiptap/extension-color';
import TextStyle from '@tiptap/extension-text-style';
import Highlight from '@tiptap/extension-highlight';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import TableExtension from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import ImageExtension from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import CharacterCount from '@tiptap/extension-character-count';
import Heading from '@tiptap/extension-heading';
import Blockquote from '@tiptap/extension-blockquote';
import HorizontalRule from '@tiptap/extension-horizontal-rule';
import BulletList from '@tiptap/extension-bullet-list';
import OrderedList from '@tiptap/extension-ordered-list';
import ListItem from '@tiptap/extension-list-item';
import Subscript from '@tiptap/extension-subscript';
import Superscript from '@tiptap/extension-superscript';
import Typography from '@tiptap/extension-typography';
import History from '@tiptap/extension-history';
import TextAlign from '@tiptap/extension-text-align';
import FontFamily from '@tiptap/extension-font-family';
import Suggestion from '@tiptap/suggestion';
import { createLowlight } from 'lowlight';
import javascript from 'highlight.js/lib/languages/javascript';
import typescript from 'highlight.js/lib/languages/typescript';
import python from 'highlight.js/lib/languages/python';
import css from 'highlight.js/lib/languages/css';
import xml from 'highlight.js/lib/languages/xml';
import json from 'highlight.js/lib/languages/json';
import bash from 'highlight.js/lib/languages/bash';
import sql from 'highlight.js/lib/languages/sql';
import { Extension, type Editor as TiptapEditor } from '@tiptap/core';
import tippy from 'tippy.js';
import 'tippy.js/dist/tippy.css';

import { useNotesStore } from '@/store/notesStore';
import { cn, debounce } from '@/lib/utils';
import Toolbar from './Toolbar';
import CodeBlockComponent from './CodeBlockComponent';
import { SlashCommandList, getSlashCommands } from './SlashCommands';
import type { Note } from '@/lib/types';
import {
  Maximize2, Minimize2, Hash, Link as LinkIcon, X, Tag, Calendar,
} from 'lucide-react';
import toast from 'react-hot-toast';

// ─── Lowlight setup ────────────────────────────────────────────────────────────

const lowlight = createLowlight();
lowlight.register('javascript', javascript);
lowlight.register('typescript', typescript);
lowlight.register('python', python);
lowlight.register('css', css);
lowlight.register('html', xml);
lowlight.register('xml', xml);
lowlight.register('json', json);
lowlight.register('bash', bash);
lowlight.register('sql', sql);

// ─── Slash Command Extension ───────────────────────────────────────────────────

const SlashCommandExtension = Extension.create({
  name: 'slashCommand',
  addOptions() {
    return { suggestion: {} };
  },
  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        char: '/',
        items: ({ query }: { query: string }) => {
          const cmds = getSlashCommands();
          if (!query) return cmds;
          return cmds.filter((item) =>
            item.title.toLowerCase().includes(query.toLowerCase()) ||
            item.description.toLowerCase().includes(query.toLowerCase())
          );
        },
        render() {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          let component: ReactRenderer<any, any>;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          let popup: any;

          return {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            onStart(props: any) {
              component = new ReactRenderer(SlashCommandList, {
                props,
                editor: props.editor as TiptapEditor,
              });
              popup = tippy('body', {
                getReferenceClientRect: props.clientRect ?? null,
                appendTo: () => document.body,
                content: component.element,
                showOnCreate: true,
                interactive: true,
                trigger: 'manual',
                placement: 'bottom-start',
                theme: 'none',
                animation: false,
              });
            },
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            onUpdate(props: any) {
              component.updateProps(props);
              popup[0]?.setProps({ getReferenceClientRect: props.clientRect });
            },
            onKeyDown(props: { event: KeyboardEvent }) {
              if (props.event.key === 'Escape') {
                popup[0]?.hide();
                return true;
              }
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              return (component.ref as any)?.onKeyDown(props) ?? false;
            },
            onExit() {
              popup[0]?.destroy();
              component.destroy();
            },
          };
        },
        command: ({ editor, range, props }: { editor: unknown; range: unknown; props: unknown }) => {
          (props as { command: (args: { editor: unknown; range: unknown }) => void }).command({ editor, range });
        },
      }),
    ];
  },
});

// ─── Editor Component ──────────────────────────────────────────────────────────

interface EditorProps {
  note: Note;
}

export default function Editor({ note }: EditorProps) {
  const { updateNote, fetchNoteContent, settings, notes } = useNotesStore();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isFocusMode, setIsFocusMode] = useState(settings.focusMode);
  const [showBacklinks, setShowBacklinks] = useState(false);
  const [localTitle, setLocalTitle] = useState(note.title);
  const [localTags, setLocalTags] = useState(note.tags.join(', '));
  const [showTagInput, setShowTagInput] = useState(false);
  const [isLoadingContent, setIsLoadingContent] = useState(note.content === '');
  const titleRef = useRef<HTMLInputElement>(null);
  const isSavingRef = useRef(false);
  const lastSavedContentRef = useRef(note.content);

  // Fetch full content from Telegram on demand if not yet loaded
  useEffect(() => {
    if (note.content === '') {
      setIsLoadingContent(true);
      fetchNoteContent(note.id).finally(() => setIsLoadingContent(false));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [note.id]);

  // Debounced save
  const debouncedSave = useCallback(
    debounce(async (content: string) => {
      if (isSavingRef.current) return;
      if (content === lastSavedContentRef.current) return;
      isSavingRef.current = true;
      lastSavedContentRef.current = content;
      try {
        await updateNote(note.id, { content });
      } finally {
        isSavingRef.current = false;
      }
    }, settings.autoSaveInterval * 1000),
    [note.id, updateNote, settings.autoSaveInterval]
  );

  const editor = useEditor({
    extensions: [
      // Disable conflicting StarterKit nodes & marks we configure separately
      StarterKit.configure({
        bold: false, italic: false, strike: false, code: false,
        codeBlock: false, blockquote: false, horizontalRule: false,
        bulletList: false, orderedList: false, listItem: false,
        heading: false, history: false,
      }),
      Bold, Italic, Underline, Strike,
      Code.configure({ HTMLAttributes: { class: 'inline-code' } }),
      CodeBlockLowlight.extend({
        addNodeView() {
          return ReactNodeViewRenderer(CodeBlockComponent);
        },
      }).configure({ lowlight }),
      TextStyle, Color,
      Highlight.configure({ multicolor: true }),
      TaskList, TaskItem.configure({ nested: true }),
      TableExtension.configure({ resizable: true }),
      TableRow, TableCell, TableHeader,
      ImageExtension.configure({ inline: false, allowBase64: true }),
      Link.configure({ openOnClick: false, HTMLAttributes: { class: 'note-link', rel: 'noopener' } }),
      Placeholder.configure({ placeholder: 'Start writing… type / for commands' }),
      CharacterCount,
      Heading.configure({ levels: [1, 2, 3, 4, 5, 6] }),
      Blockquote, HorizontalRule,
      BulletList, OrderedList, ListItem,
      Subscript, Superscript,
      Typography,
      History,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      FontFamily,
      SlashCommandExtension,
    ],
    content: note.content || '',
    editorProps: {
      attributes: {
        class: cn(
          'ProseMirror min-h-full outline-none',
          isFocusMode && 'focus-mode',
          {
            'text-sm': settings.fontSize === 'sm',
            'text-base': settings.fontSize === 'base',
            'text-lg': settings.fontSize === 'lg',
            'text-xl': settings.fontSize === 'xl',
          },
          {
            'font-sans': settings.fontFamily === 'sans',
            'font-serif': settings.fontFamily === 'serif',
            'font-mono': settings.fontFamily === 'mono',
          },
          {
            'leading-tight': settings.lineHeight === 'tight',
            'leading-relaxed': settings.lineHeight === 'normal',
            'leading-loose': settings.lineHeight === 'relaxed',
          }
        ),
        spellcheck: settings.spellCheck ? 'true' : 'false',
      },
      handlePaste: (view, event) => {
        // Preserve whitespace when pasting into code blocks
        const { state } = view;
        const { selection } = state;
        const node = state.doc.resolve(selection.from).node();
        if (node?.type.name === 'codeBlock') {
          const text = event.clipboardData?.getData('text/plain');
          if (text) {
            view.dispatch(state.tr.insertText(text));
            return true;
          }
        }
        return false;
      },
    },
    onUpdate: ({ editor }) => {
      if (settings.autoSave) {
        debouncedSave(editor.getHTML());
      }
    },
    immediatelyRender: false,
  });

  // Sync note content when active note changes
  useEffect(() => {
    if (editor && note.content !== editor.getHTML() && note.content !== lastSavedContentRef.current) {
      editor.commands.setContent(note.content || '', false);
      lastSavedContentRef.current = note.content;
    }
    setLocalTitle(note.title);
    setLocalTags(note.tags.join(', '));
  }, [note.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Debounced title save
  const debouncedTitleSave = useCallback(
    debounce(async (title: string) => {
      await updateNote(note.id, { title });
    }, 600),
    [note.id, updateNote]
  );

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalTitle(e.target.value);
    debouncedTitleSave(e.target.value);
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      editor?.commands.focus('start');
    }
  };

  const handleTagsSave = useCallback(async () => {
    const tags = localTags
      .split(',')
      .map((t) => t.trim().toLowerCase().replace(/^#/, ''))
      .filter(Boolean);
    await updateNote(note.id, { tags });
    setShowTagInput(false);
  }, [localTags, note.id, updateNote]);

  const handleManualSave = useCallback(async () => {
    if (!editor) return;
    await updateNote(note.id, { content: editor.getHTML(), title: localTitle });
    toast.success('Saved');
  }, [editor, note.id, updateNote, localTitle]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().includes('MAC');
      const mod = isMac ? e.metaKey : e.ctrlKey;
      if (mod && e.key === 's') {
        e.preventDefault();
        handleManualSave();
      }
      if (mod && e.shiftKey && e.key === 'F') {
        e.preventDefault();
        setIsFocusMode((f) => !f);
      }
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleManualSave, isFullscreen]);

  // Backlinks
  const backlinks = notes.filter((n) => n.backlinks.includes(note.id));

  // Word / char count from editor
  const wordCount = editor?.storage.characterCount?.words() ?? note.wordCount;
  const charCount = editor?.storage.characterCount?.characters() ?? note.charCount;

  if (!editor) return null;

  return (
    <div className={cn(
      'flex flex-col h-full bg-white dark:bg-surface-900 transition-all',
      isFullscreen && 'fixed inset-0 z-50'
    )}>
      {/* Toolbar – horizontally scrollable on mobile */}
      {!isFocusMode && (
        <div className="overflow-x-auto overflow-y-hidden flex-shrink-0 scrollbar-none">
          <Toolbar editor={editor} />
        </div>
      )}

      {/* Main scroll area */}
      <div className={cn(
        'flex-1 overflow-y-auto min-h-0',
        isFocusMode ? 'max-w-3xl mx-auto w-full px-4 md:px-8 py-12' : 'px-4 md:px-8 lg:px-16 py-6'
      )}>
        {/* Cover image */}
        {note.coverImage && (
          <div className="w-full h-40 rounded-xl overflow-hidden mb-6 -mx-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={note.coverImage} alt="Cover" className="w-full h-full object-cover" />
          </div>
        )}

        {/* Icon + Title */}
        <div className="mb-4">
          {note.icon && (
            <div className="text-4xl mb-2 cursor-pointer" onClick={() => {
              const emoji = prompt('Enter emoji:', note.icon);
              if (emoji !== null) updateNote(note.id, { icon: emoji });
            }}>
              {note.icon}
            </div>
          )}
          <input
            ref={titleRef}
            type="text"
            value={localTitle}
            onChange={handleTitleChange}
            onKeyDown={handleTitleKeyDown}
            placeholder="Untitled"
            className={cn(
              'w-full bg-transparent font-bold text-surface-900 dark:text-white placeholder-surface-300 dark:placeholder-surface-600 outline-none resize-none',
              {
                'text-3xl': settings.fontSize === 'sm' || settings.fontSize === 'base',
                'text-4xl': settings.fontSize === 'lg' || settings.fontSize === 'xl',
              }
            )}
          />

          {/* Tags */}
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            {note.tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-surface-100 dark:bg-surface-800 text-surface-500 dark:text-surface-400 cursor-pointer hover:bg-surface-200 dark:hover:bg-surface-700 transition-colors"
                onClick={() => setShowTagInput(true)}
              >
                <Tag size={9} />
                {tag}
              </span>
            ))}
            {showTagInput ? (
              <div className="flex items-center gap-1">
                <input
                  autoFocus
                  type="text"
                  value={localTags}
                  onChange={(e) => setLocalTags(e.target.value)}
                  onBlur={handleTagsSave}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleTagsSave(); if (e.key === 'Escape') setShowTagInput(false); }}
                  placeholder="tag1, tag2..."
                  className="text-xs bg-surface-100 dark:bg-surface-800 border border-brand-400 rounded-full px-2 py-0.5 outline-none text-surface-700 dark:text-surface-300 w-32"
                />
                <button onClick={() => setShowTagInput(false)} className="text-surface-400 hover:text-surface-600"><X size={12} /></button>
              </div>
            ) : (
              <button
                onClick={() => setShowTagInput(true)}
                className="text-xs text-surface-400 hover:text-surface-600 dark:hover:text-surface-300 flex items-center gap-1 px-1.5 py-0.5 rounded-full hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
              >
                <Tag size={9} />
                Add tag
              </button>
            )}
          </div>
        </div>

        {/* Loading state while fetching content from Telegram */}
        {isLoadingContent ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-surface-400">Loading note from Telegram…</p>
          </div>
        ) : (
          <EditorContent editor={editor} className="min-h-96" />
        )}

        {/* Backlinks */}
        {backlinks.length > 0 && (
          <div className="mt-12 pt-6 border-t border-surface-200 dark:border-surface-700">
            <button
              onClick={() => setShowBacklinks(!showBacklinks)}
              className="flex items-center gap-2 text-sm font-medium text-surface-500 dark:text-surface-400 hover:text-surface-700 dark:hover:text-surface-200 transition-colors mb-2"
            >
              <LinkIcon size={13} />
              {backlinks.length} Backlink{backlinks.length !== 1 ? 's' : ''}
            </button>
            {showBacklinks && (
              <div className="space-y-2">
                {backlinks.map((bl) => (
                  <button
                    key={bl.id}
                    onClick={() => useNotesStore.getState().setActiveNote(bl.id)}
                    className="flex items-start gap-2 w-full text-left p-3 rounded-lg bg-surface-50 dark:bg-surface-800 hover:bg-surface-100 dark:hover:bg-surface-700 transition-colors"
                  >
                    <Hash size={13} className="mt-0.5 text-surface-400 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-surface-700 dark:text-surface-300">
                        {bl.title || 'Untitled'}
                      </p>
                      {bl.plainText && (
                        <p className="text-xs text-surface-400 mt-0.5 line-clamp-1">
                          {bl.plainText.slice(0, 60)}
                        </p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Status bar */}
      <div className="flex items-center justify-between px-6 py-1.5 border-t border-surface-100 dark:border-surface-800 bg-white dark:bg-surface-900 text-xs text-surface-400 flex-shrink-0">
        <div className="flex items-center gap-3">
          {settings.showWordCount && (
            <span>{wordCount.toLocaleString()} word{wordCount !== 1 ? 's' : ''}</span>
          )}
          {settings.showCharCount && (
            <span>{charCount.toLocaleString()} char{charCount !== 1 ? 's' : ''}</span>
          )}
          {settings.syncStatus === 'syncing' && (
            <span className="text-blue-400">Syncing…</span>
          )}
          {settings.syncStatus === 'success' && (
            <span className="text-green-400">Saved</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {note.dueDate && (
            <span className="flex items-center gap-1">
              <Calendar size={11} />
              {new Date(note.dueDate).toLocaleDateString()}
            </span>
          )}
          <button
            onClick={() => setIsFocusMode((f) => !f)}
            title="Focus mode (⌘⇧F)"
            className={cn(
              'p-1 rounded hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors',
              isFocusMode && 'text-brand-500'
            )}
          >
            {isFocusMode ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
          </button>
        </div>
      </div>
    </div>
  );
}
