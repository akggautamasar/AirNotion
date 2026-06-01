'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { useEditor, EditorContent, ReactRenderer, ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react';
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
import { Extension, Node, type Editor as TiptapEditor } from '@tiptap/core';
import tippy from 'tippy.js';
import 'tippy.js/dist/tippy.css';
import { motion, AnimatePresence } from 'framer-motion';

import { useNotesStore } from '@/store/notesStore';
import { cn, debounce } from '@/lib/utils';
import Toolbar from './Toolbar';
import CodeBlockComponent from './CodeBlockComponent';
import { SlashCommandList, getSlashCommands } from './SlashCommands';
import DrawingCanvas from '@/components/ui/DrawingCanvas';
import VoiceRecorder from '@/components/ui/VoiceRecorder';
import ImageAnnotator from '@/components/ui/ImageAnnotator';
import ShortcutsModal from '@/components/ui/ShortcutsModal';
import type { Note } from '@/lib/types';
import {
  Maximize2, Minimize2, Hash, Link as LinkIcon, X, Tag,
  Mic, PenLine, Calendar, Lock, Unlock, Share2, Download,
  CheckCircle, Upload, BookOpen, Edit3, Keyboard, FileDown,
} from 'lucide-react';
import toast from 'react-hot-toast';

// ─── Lowlight ─────────────────────────────────────────────────────────────────

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

// ─── Audio Node (for voice recordings) ───────────────────────────────────────

const AudioNode = Node.create({
  name: 'audioNode',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      src: { default: '' },
      duration: { default: 0 },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="audio-node"]' }];
  },

  renderHTML({ node }) {
    return ['div', {
      'data-type': 'audio-node',
      'data-src': node.attrs.src,
      'data-duration': node.attrs.duration,
    }];
  },

  addNodeView() {
    return ({ node, editor, getPos }) => {
      const container = document.createElement('div');
      container.className = 'audio-note-node my-3 p-3 bg-surface-50 dark:bg-surface-800 rounded-xl border border-surface-200 dark:border-surface-700 flex items-center gap-3 select-none';
      container.setAttribute('contenteditable', 'false');

      const iconEl = document.createElement('span');
      iconEl.textContent = '🎙️';
      iconEl.className = 'text-xl flex-shrink-0';

      const audioEl = document.createElement('audio');
      audioEl.controls = true;
      audioEl.src = node.attrs.src;
      audioEl.style.cssText = 'flex: 1; height: 32px; max-width: 100%;';

      const d = Number(node.attrs.duration);
      const durEl = document.createElement('span');
      if (d > 0) {
        durEl.textContent = `${String(Math.floor(d / 60)).padStart(2, '0')}:${String(d % 60).padStart(2, '0')}`;
        durEl.className = 'text-xs text-surface-400 flex-shrink-0';
      }

      const delBtn = document.createElement('button');
      delBtn.textContent = '✕';
      delBtn.className = 'text-xs text-surface-400 hover:text-red-500 flex-shrink-0 p-1';
      delBtn.onclick = (e) => {
        e.stopPropagation();
        const pos = getPos();
        editor.view.dispatch(editor.view.state.tr.delete(pos, pos + node.nodeSize));
      };

      container.appendChild(iconEl);
      container.appendChild(audioEl);
      if (d > 0) container.appendChild(durEl);
      container.appendChild(delBtn);

      return { dom: container };
    };
  },
});

// ─── Annotatable Image Node ───────────────────────────────────────────────────

function AnnotatableImageView({
  node,
  updateAttributes,
}: {
  node: { attrs: { src: string; alt?: string; title?: string } };
  updateAttributes: (attrs: Record<string, unknown>) => void;
}) {
  const [annotating, setAnnotating] = useState(false);

  return (
    <NodeViewWrapper as="div" contentEditable={false} style={{ display: 'block' }}>
      <div className="relative group my-2 inline-block max-w-full">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={node.attrs.src}
          alt={node.attrs.alt || ''}
          className="max-w-full rounded-lg block"
          draggable={false}
          onDragStart={(e) => e.preventDefault()}
        />
        {/* Annotate button — hover on desktop, always shown on mobile */}
        <button
          onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); setAnnotating(true); }}
          onTouchEnd={(e) => { e.preventDefault(); e.stopPropagation(); setAnnotating(true); }}
          className={cn(
            'absolute bottom-2 right-2 flex items-center gap-1.5 px-2.5 py-1.5',
            'bg-black/70 hover:bg-black/90 text-white text-xs font-medium rounded-lg',
            'backdrop-blur-sm transition-all select-none',
            'opacity-100 md:opacity-0 md:group-hover:opacity-100'
          )}
        >
          ✏️ Annotate
        </button>
      </div>

      {annotating && (
        <ImageAnnotator
          imageSrc={node.attrs.src}
          onSave={(newSrc) => updateAttributes({ src: newSrc })}
          onClose={() => setAnnotating(false)}
        />
      )}
    </NodeViewWrapper>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const AnnotatableImageExtension = ImageExtension.extend({
  addNodeView() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return ReactNodeViewRenderer(AnnotatableImageView as any);
  },
});

// ─── Slash Command Extension ──────────────────────────────────────────────────

const SlashCommandExtension = Extension.create({
  name: 'slashCommand',
  addOptions() { return { suggestion: {} }; },
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
              component = new ReactRenderer(SlashCommandList, { props, editor: props.editor as TiptapEditor });
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
              if (props.event.key === 'Escape') { popup[0]?.hide(); return true; }
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              return (component.ref as any)?.onKeyDown(props) ?? false;
            },
            onExit() { popup[0]?.destroy(); component.destroy(); },
          };
        },
        command: ({ editor, range, props }: { editor: unknown; range: unknown; props: unknown }) => {
          (props as { command: (args: { editor: unknown; range: unknown }) => void }).command({ editor, range });
        },
      }),
    ];
  },
});

// ─── Editor Component ─────────────────────────────────────────────────────────

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

  // Samsung Notes features
  const [showDrawing, setShowDrawing] = useState(false);
  const [showVoice, setShowVoice] = useState(false);
  const [showDueDatePicker, setShowDueDatePicker] = useState(false);
  const importInputRef = useRef<HTMLInputElement>(null);
  const [isLocked, setIsLocked] = useState(note.locked ?? false);
  const [isReadingMode, setIsReadingMode] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [noteSizeWarning, setNoteSizeWarning] = useState(false);
  const [lockPin, setLockPin] = useState('');
  const [lockPinError, setLockPinError] = useState(false);
  const [showSetLockModal, setShowSetLockModal] = useState(false);
  const [newLockPin, setNewLockPin] = useState('');

  const titleRef = useRef<HTMLInputElement>(null);
  const isSavingRef = useRef(false);
  const lastSavedContentRef = useRef(note.content);

  // Fetch full content on mount if empty
  useEffect(() => {
    if (note.content === '') {
      setIsLoadingContent(true);
      fetchNoteContent(note.id).finally(() => setIsLoadingContent(false));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [note.id]);

  // Debounced save — large notes (>4 MB) skip auto-save to avoid memory spikes.
  // The user must save manually (⌘S) or the note is saved when switching away.
  const LARGE_NOTE_THRESHOLD = 4 * 1024 * 1024; // 4 MB
  const debouncedSave = useCallback(
    debounce(async (content: string) => {
      if (isSavingRef.current) return;
      if (content === lastSavedContentRef.current) return;
      // Skip auto-save for large notes — only manual save allowed
      if (new Blob([content]).size > LARGE_NOTE_THRESHOLD) {
        setNoteSizeWarning(true);
        return;
      }
      setNoteSizeWarning(false);
      isSavingRef.current = true;
      lastSavedContentRef.current = content;
      try { await updateNote(note.id, { content }); }
      finally { isSavingRef.current = false; }
    }, settings.autoSaveInterval * 1000),
    [note.id, updateNote, settings.autoSaveInterval]
  );

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        bold: false, italic: false, strike: false, code: false,
        codeBlock: false, blockquote: false, horizontalRule: false,
        bulletList: false, orderedList: false, listItem: false,
        heading: false, history: false,
      }),
      Bold, Italic, Underline, Strike,
      Code.configure({ HTMLAttributes: { class: 'inline-code' } }),
      CodeBlockLowlight.extend({
        addNodeView() { return ReactNodeViewRenderer(CodeBlockComponent); },
      }).configure({ lowlight }),
      TextStyle, Color,
      Highlight.configure({ multicolor: true }),
      TaskList, TaskItem.configure({ nested: true }),
      TableExtension.configure({ resizable: true }),
      TableRow, TableCell, TableHeader,
      AnnotatableImageExtension.configure({ inline: false, allowBase64: true }),
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
      AudioNode,
      SlashCommandExtension,
    ],
    content: note.content || '',
    editorProps: {
      attributes: {
        class: cn(
          'ProseMirror min-h-full outline-none',
          isFocusMode && 'focus-mode',
          { 'text-sm': settings.fontSize === 'sm', 'text-base': settings.fontSize === 'base', 'text-lg': settings.fontSize === 'lg', 'text-xl': settings.fontSize === 'xl' },
          { 'font-sans': settings.fontFamily === 'sans', 'font-serif': settings.fontFamily === 'serif', 'font-mono': settings.fontFamily === 'mono' },
          { 'leading-tight': settings.lineHeight === 'tight', 'leading-relaxed': settings.lineHeight === 'normal', 'leading-loose': settings.lineHeight === 'relaxed' }
        ),
        spellcheck: settings.spellCheck ? 'true' : 'false',
      },
      handlePaste: (view, event) => {
        const { state } = view;
        const { selection } = state;
        const node = state.doc.resolve(selection.from).node();
        if (node?.type.name === 'codeBlock') {
          const text = event.clipboardData?.getData('text/plain');
          if (text) { view.dispatch(state.tr.insertText(text)); return true; }
        }
        return false;
      },
    },
    onUpdate: ({ editor }) => {
      if (settings.autoSave) debouncedSave(editor.getHTML());
    },
    immediatelyRender: false,
  });

  // Sync content when note changes
  useEffect(() => {
    if (editor && note.content !== editor.getHTML() && note.content !== lastSavedContentRef.current) {
      editor.commands.setContent(note.content || '', false);
      lastSavedContentRef.current = note.content;
    }
    setLocalTitle(note.title);
    setLocalTags(note.tags.join(', '));
    setIsLocked(note.locked ?? false);
  }, [note.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Debounced title save
  const debouncedTitleSave = useCallback(
    debounce(async (title: string) => { await updateNote(note.id, { title }); }, 600),
    [note.id, updateNote]
  );

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalTitle(e.target.value);
    debouncedTitleSave(e.target.value);
  };

  const handleTagsSave = useCallback(async () => {
    const tags = localTags.split(',').map((t) => t.trim().toLowerCase().replace(/^#/, '')).filter(Boolean);
    await updateNote(note.id, { tags });
    setShowTagInput(false);
  }, [localTags, note.id, updateNote]);

  const handleManualSave = useCallback(async () => {
    if (!editor) return;
    const content = editor.getHTML();
    await updateNote(note.id, { content, title: localTitle });
    lastSavedContentRef.current = content;
    setNoteSizeWarning(false);
    toast.success('Saved');
  }, [editor, note.id, updateNote, localTitle]);

  // Drawing: insert saved canvas as image
  const handleDrawingSave = useCallback((dataUrl: string) => {
    editor?.chain().focus().setImage({ src: dataUrl }).run();
    toast.success('Drawing inserted');
  }, [editor]);

  // Voice: insert audio node
  const handleVoiceSave = useCallback((dataUrl: string, duration: number) => {
    editor?.chain().focus().insertContent({
      type: 'audioNode',
      attrs: { src: dataUrl, duration },
    }).run();
    setShowVoice(false);
    toast.success('Voice note inserted');
  }, [editor]);

  // Due date
  const handleSetDueDate = useCallback(async (date: string) => {
    await updateNote(note.id, { dueDate: date || undefined });
    if (!date) setShowDueDatePicker(false);
  }, [note.id, updateNote]);

  // Reading mode: disable/enable editor editing
  useEffect(() => {
    if (editor) editor.setEditable(!isReadingMode);
  }, [isReadingMode, editor]);

  // Markdown download
  const handleDownloadMarkdown = useCallback(() => {
    if (!editor) return;
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const TurndownService = require('turndown');
    const td = new TurndownService({ headingStyle: 'atx', bulletListMarker: '-', codeBlockStyle: 'fenced' });
    td.addRule('taskItem', {
      filter: (node: HTMLElement) => node.nodeName === 'LI' && node.getAttribute('data-type') === 'taskItem',
      replacement: (content: string, node: HTMLElement) => {
        const checked = node.getAttribute('data-checked') === 'true';
        return `- [${checked ? 'x' : ' '}] ${content.trim()}\n`;
      },
    });
    const markdown = td.turndown(editor.getHTML());
    const title = localTitle || 'Untitled';
    const tagsLine = note.tags.length ? `**Tags:** ${note.tags.map(t => `#${t}`).join(' ')}\n\n` : '';
    const full = `# ${title}\n\n${tagsLine}${markdown}`;
    const blob = new Blob([full], { type: 'text/markdown; charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.md`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Downloaded as Markdown');
  }, [editor, localTitle, note.tags]);

  // Share
  const handleShare = useCallback(async () => {
    const text = note.plainText || note.title;
    try {
      if (navigator.share) {
        await navigator.share({ title: note.title || 'Note', text });
        toast.success('Shared');
      } else {
        await navigator.clipboard.writeText(text);
        toast.success('Copied to clipboard');
      }
    } catch { /* user cancelled */ }
  }, [note]);

  // Export — clean print window with proper styling
  const handleExport = useCallback(() => {
    if (!editor) return;
    const htmlContent = editor.getHTML();
    const title = localTitle || 'Untitled';
    const dateStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const tagsHtml = note.tags.length
      ? `<div class="tags">${note.tags.map(t => `<span class="tag">#${t}</span>`).join(' ')}</div>` : '';

    const printHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${title}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #111; background: #fff; padding: 40px; max-width: 800px; margin: 0 auto; line-height: 1.7; }
    h1.note-title { font-size: 2rem; font-weight: 800; margin-bottom: 8px; }
    .meta { font-size: 0.8rem; color: #888; margin-bottom: 4px; }
    .tags { display: flex; gap: 6px; flex-wrap: wrap; margin: 12px 0 20px; }
    .tag { background: #f1f5f9; color: #475569; padding: 2px 10px; border-radius: 999px; font-size: 0.75rem; }
    hr.divider { border: none; border-top: 1px solid #e2e8f0; margin: 16px 0 24px; }
    h1, h2, h3, h4, h5, h6 { margin: 1.2em 0 0.4em; line-height: 1.3; }
    p { margin: 0.6em 0; }
    ul, ol { padding-left: 1.5em; margin: 0.6em 0; }
    li { margin: 0.2em 0; }
    blockquote { border-left: 3px solid #6366f1; padding: 8px 16px; margin: 12px 0; background: #f8f9ff; color: #444; }
    pre { background: #1e293b; color: #e2e8f0; padding: 16px; border-radius: 8px; overflow: auto; font-size: 0.85rem; margin: 12px 0; }
    code { background: #f1f5f9; padding: 2px 5px; border-radius: 4px; font-size: 0.88em; }
    pre code { background: none; padding: 0; }
    img { max-width: 100%; border-radius: 6px; margin: 8px 0; }
    table { width: 100%; border-collapse: collapse; margin: 12px 0; }
    th, td { border: 1px solid #e2e8f0; padding: 8px 12px; text-align: left; }
    th { background: #f8fafc; font-weight: 600; }
    a { color: #6366f1; }
    .audio-note-node, .pdf-node { display: none; }
    @media print {
      body { padding: 20px; }
      @page { margin: 20mm; }
    }
  </style>
</head>
<body>
  <h1 class="note-title">${title}</h1>
  <p class="meta">Exported from AirNotion · ${dateStr}</p>
  ${tagsHtml}
  <hr class="divider" />
  ${htmlContent}
  <script>window.onload = function(){ window.print(); }<\/script>
</body>
</html>`;

    const blob = new Blob([printHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const win = window.open(url, '_blank');
    if (win) {
      win.onafterprint = () => { URL.revokeObjectURL(url); };
    }
  }, [editor, localTitle, note.tags]);

  // Compress an image data-URL to JPEG, capped at maxWidth px wide.
  // Keeps memory/storage small — critical for free-tier Render instance.
  const compressImage = useCallback(
    (dataUrl: string, maxWidth = 1400, quality = 0.80): Promise<string> =>
      new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
          let { width, height } = img;
          if (width > maxWidth) { height = Math.round(height * maxWidth / width); width = maxWidth; }
          const canvas = document.createElement('canvas');
          canvas.width = width; canvas.height = height;
          canvas.getContext('2d')!.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.onerror = () => resolve(dataUrl);
        img.src = dataUrl;
      }),
    []
  );

  // Import — handle PDF (page-by-page images), images, text
  const handleImport = useCallback(async (files: FileList | null) => {
    if (!files || !editor) return;

    for (const file of Array.from(files)) {
      const ext = file.name.split('.').pop()?.toLowerCase() || '';

      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = async () => {
          const compressed = await compressImage(reader.result as string);
          editor.chain().focus().setImage({ src: compressed, alt: file.name }).run();
        };
        reader.readAsDataURL(file);

      } else if (file.type === 'application/pdf' || ext === 'pdf') {
        const toastId = toast.loading(`Rendering "${file.name}"…`);
        try {
          const pdfjsLib = await import('pdfjs-dist');
          pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

          const arrayBuffer = await file.arrayBuffer();
          const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
          const totalPages = pdf.numPages;

          // Phase 1: render every page to a data URL (progress shown in toast).
          // Scale 1.5 (not 2) and quality 0.78 keeps pages sharp while using
          // ~45% less memory and storage than the previous 2× / 0.92 settings.
          const dataUrls: string[] = [];
          for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
            toast.loading(`Rendering page ${pageNum}/${totalPages}…`, { id: toastId });
            const page = await pdf.getPage(pageNum);
            const viewport = page.getViewport({ scale: 1.5 });
            const canvas = document.createElement('canvas');
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            await page.render({ canvas, viewport }).promise;
            dataUrls.push(canvas.toDataURL('image/jpeg', 0.78));
            // Release canvas memory immediately after converting to data URL
            canvas.width = 0; canvas.height = 0;
          }

          // Phase 2: insert everything in one shot at the end of the document.
          // We do NOT use focus()/setImage() in a loop — that loses cursor position
          // between awaits and causes each image to overwrite the previous one.
          toast.loading('Inserting pages…', { id: toastId });

          const headerNode = {
            type: 'paragraph',
            content: [{
              type: 'text',
              marks: [{ type: 'bold' }],
              text: `📄 ${file.name} (${totalPages} page${totalPages > 1 ? 's' : ''})`,
            }],
          };

          const imageNodes = dataUrls.flatMap((src, i) => {
            const imgNode = { type: 'image', attrs: { src, alt: `${file.name} page ${i + 1}` } };
            // Insert a paragraph spacer between pages (not after the last one)
            return i < dataUrls.length - 1
              ? [imgNode, { type: 'paragraph' }]
              : [imgNode];
          });

          editor.commands.insertContentAt(
            editor.state.doc.content.size,
            [headerNode, ...imageNodes],
          );

          toast.success(`"${file.name}" inserted (${totalPages} pages)`, { id: toastId });
        } catch (err) {
          console.error('PDF render error:', err);
          toast.error('Failed to render PDF', { id: toastId });
        }

      } else if (file.type === 'text/plain' || ext === 'txt' || file.type === 'text/markdown' || ext === 'md') {
        const text = await file.text();
        editor.chain().focus().insertContent(
          text.split('\n').map(line => `<p>${line || '<br/>'}</p>`).join('')
        ).run();
        toast.success(`"${file.name}" inserted`);

      } else {
        toast.error(`Unsupported file type: ${file.type || ext}`);
      }
    }
  }, [editor]);

  // Lock / Unlock
  const handleToggleLock = useCallback(async () => {
    if (note.locked) {
      // Already locked — unlock requires PIN (handled by lock screen)
      if (isLocked) return; // lock screen is showing — user must enter PIN
      // Currently unlocked (user entered PIN already), lock it again
      setIsLocked(true);
    } else {
      // Not locked — open set-PIN modal
      setNewLockPin('');
      setShowSetLockModal(true);
    }
  }, [note.locked, isLocked]);

  const handleSetLock = useCallback(async () => {
    if (newLockPin.length !== 4) { toast.error('PIN must be 4 digits'); return; }
    await updateNote(note.id, { locked: true, lockPin: newLockPin });
    setIsLocked(true);
    setShowSetLockModal(false);
    setNewLockPin('');
    toast.success('Note locked');
  }, [newLockPin, note.id, updateNote]);

  const handleUnlock = useCallback(async () => {
    if (lockPin === note.lockPin) {
      setIsLocked(false);
      setLockPin('');
      setLockPinError(false);
    } else {
      setLockPinError(true);
      setTimeout(() => { setLockPin(''); setLockPinError(false); }, 600);
    }
  }, [lockPin, note.lockPin]);

  const handleRemoveLock = useCallback(async () => {
    await updateNote(note.id, { locked: false, lockPin: undefined });
    setIsLocked(false);
    toast.success('Lock removed');
  }, [note.id, updateNote]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().includes('MAC');
      const mod = isMac ? e.metaKey : e.ctrlKey;
      if (mod && e.key === 's') { e.preventDefault(); handleManualSave(); }
      if (mod && e.shiftKey && e.key === 'F') { e.preventDefault(); setIsFocusMode((f) => !f); }
      if (e.key === 'Escape' && isFullscreen) setIsFullscreen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleManualSave, isFullscreen]);

  const backlinks = notes.filter((n) => n.backlinks.includes(note.id));
  const wordCount = editor?.storage.characterCount?.words() ?? note.wordCount;
  const charCount = editor?.storage.characterCount?.characters() ?? note.charCount;
  const isDuePast = note.dueDate && new Date(note.dueDate) < new Date();

  if (!editor) return null;

  return (
    <div className={cn(
      'flex flex-col h-full bg-white dark:bg-surface-900 transition-all relative',
      isFullscreen && 'fixed inset-0 z-50'
    )}>
      {/* Lock screen overlay */}
      <AnimatePresence>
        {isLocked && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-20 bg-surface-900/96 dark:bg-black/96 flex flex-col items-center justify-center p-8"
          >
            <div className="text-5xl mb-4">🔒</div>
            <h3 className="text-xl font-bold text-white mb-1">{note.title || 'Locked Note'}</h3>
            <p className="text-sm text-surface-400 mb-8">Enter PIN to unlock</p>

            {/* PIN dots */}
            <div className="flex gap-4 mb-6">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className={cn(
                  'w-5 h-5 rounded-full border-2 transition-all',
                  lockPin.length > i
                    ? 'bg-brand-500 border-brand-500 scale-110'
                    : 'border-surface-600',
                  lockPinError && 'border-red-500 bg-red-500/30'
                )} />
              ))}
            </div>

            {/* Numpad */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              {[1,2,3,4,5,6,7,8,9,'',0,'⌫'].map((key, i) => (
                <button
                  key={i}
                  disabled={key === ''}
                  onClick={() => {
                    if (key === '⌫') {
                      setLockPin((p) => p.slice(0, -1));
                      setLockPinError(false);
                    } else if (key !== '' && lockPin.length < 4) {
                      const next = lockPin + String(key);
                      setLockPin(next);
                      if (next.length === 4) {
                        if (next === note.lockPin) {
                          setIsLocked(false);
                          setLockPin('');
                          setLockPinError(false);
                        } else {
                          setLockPinError(true);
                          setTimeout(() => { setLockPin(''); setLockPinError(false); }, 600);
                        }
                      }
                    }
                  }}
                  className={cn(
                    'w-16 h-16 rounded-2xl text-xl font-semibold text-white transition-all',
                    key === '' ? 'opacity-0 pointer-events-none' : 'bg-surface-700/80 hover:bg-surface-600 active:scale-95'
                  )}
                >
                  {key}
                </button>
              ))}
            </div>

            {lockPinError && (
              <p className="text-red-400 text-sm mb-4 animate-pulse">Incorrect PIN</p>
            )}

            <button
              onClick={() => { setIsLocked(false); setLockPin(''); }}
              className="text-xs text-surface-500 hover:text-surface-300 mt-2 underline"
            >
              Forgot PIN? (remove lock)
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Set-lock PIN modal */}
      <AnimatePresence>
        {showSetLockModal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/50" onClick={() => setShowSetLockModal(false)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed z-50 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-80 bg-white dark:bg-surface-800 rounded-2xl shadow-2xl p-6"
            >
              <h3 className="text-base font-semibold text-surface-900 dark:text-white mb-1">Lock Note</h3>
              <p className="text-xs text-surface-500 dark:text-surface-400 mb-4">Set a 4-digit PIN to protect this note</p>
              <input
                type="password"
                inputMode="numeric"
                maxLength={4}
                placeholder="4-digit PIN"
                value={newLockPin}
                onChange={(e) => setNewLockPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                className="w-full px-3 py-2 mb-4 text-center text-2xl tracking-widest border border-surface-200 dark:border-surface-600 rounded-xl bg-surface-50 dark:bg-surface-700 text-surface-900 dark:text-white outline-none focus:border-brand-500"
                autoFocus
              />
              <div className="flex gap-2">
                <button onClick={() => setShowSetLockModal(false)}
                  className="flex-1 py-2 rounded-xl text-sm text-surface-600 dark:text-surface-300 bg-surface-100 dark:bg-surface-700 hover:bg-surface-200 dark:hover:bg-surface-600">
                  Cancel
                </button>
                <button onClick={handleSetLock} disabled={newLockPin.length !== 4}
                  className="flex-1 py-2 rounded-xl text-sm text-white bg-brand-500 hover:bg-brand-600 disabled:opacity-50">
                  Lock Note
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Shortcuts modal */}
      <ShortcutsModal isOpen={showShortcuts} onClose={() => setShowShortcuts(false)} />

      {/* Hidden import file input */}
      <input
        ref={importInputRef}
        type="file"
        className="hidden"
        accept="image/*,.pdf,text/plain,.txt,.md,text/markdown"
        multiple
        onChange={(e) => handleImport(e.target.files)}
        onClick={(e) => { (e.target as HTMLInputElement).value = ''; }}
      />

      {/* Drawing canvas modal */}
      <DrawingCanvas isOpen={showDrawing} onClose={() => setShowDrawing(false)} onSave={handleDrawingSave} />

      {/* Toolbar */}
      {!isFocusMode && (
        <div className="overflow-x-auto overflow-y-hidden flex-shrink-0 scrollbar-none border-b border-surface-100 dark:border-surface-800">
          <Toolbar editor={editor} />
        </div>
      )}

      {/* Voice recorder (expandable) */}
      <AnimatePresence>
        {showVoice && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden flex-shrink-0 border-b border-surface-200 dark:border-surface-700"
          >
            <div className="px-4 py-3">
              <VoiceRecorder onSave={handleVoiceSave} onCancel={() => setShowVoice(false)} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Due date picker (expandable) */}
      <AnimatePresence>
        {showDueDatePicker && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden flex-shrink-0 border-b border-surface-200 dark:border-surface-700"
          >
            <div className="flex items-center gap-3 px-4 py-2.5">
              <Calendar size={14} className="text-surface-400 flex-shrink-0" />
              <span className="text-xs text-surface-500 flex-shrink-0">Due date:</span>
              <input
                type="date"
                value={note.dueDate ? note.dueDate.split('T')[0] : ''}
                onChange={(e) => handleSetDueDate(e.target.value)}
                className="flex-1 text-sm bg-transparent text-surface-900 dark:text-white outline-none border-b border-brand-400 pb-0.5"
              />
              {note.dueDate && (
                <button onClick={() => handleSetDueDate('')} className="text-surface-400 hover:text-red-500 p-1" title="Remove due date">
                  <X size={13} />
                </button>
              )}
              <button onClick={() => setShowDueDatePicker(false)} className="text-surface-400 hover:text-surface-600 p-1">
                <CheckCircle size={13} className="text-brand-500" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reading mode banner */}
      <AnimatePresence>
        {isReadingMode && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden flex-shrink-0"
          >
            <div className="flex items-center justify-between px-4 py-2 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800">
              <div className="flex items-center gap-2">
                <BookOpen size={13} className="text-amber-600 dark:text-amber-400" />
                <span className="text-xs font-medium text-amber-700 dark:text-amber-300">Reading Mode — editing disabled</span>
              </div>
              <button
                onClick={() => setIsReadingMode(false)}
                className="flex items-center gap-1 text-xs font-medium text-amber-700 dark:text-amber-300 hover:text-amber-900 dark:hover:text-amber-100 px-2 py-1 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors"
              >
                <Edit3 size={12} /> Edit
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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

        {/* Title + Tags */}
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
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); editor?.commands.focus('start'); } }}
            placeholder="Untitled"
            className={cn(
              'w-full bg-transparent font-bold text-surface-900 dark:text-white placeholder-surface-300 dark:placeholder-surface-600 outline-none resize-none',
              { 'text-3xl': settings.fontSize === 'sm' || settings.fontSize === 'base', 'text-4xl': settings.fontSize === 'lg' || settings.fontSize === 'xl' }
            )}
          />

          {/* Tags row */}
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            {note.tags.map((tag) => (
              <span key={tag}
                className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-surface-100 dark:bg-surface-800 text-surface-500 dark:text-surface-400 cursor-pointer hover:bg-surface-200 dark:hover:bg-surface-700 transition-colors"
                onClick={() => setShowTagInput(true)}
              >
                <Tag size={9} /> {tag}
              </span>
            ))}
            {showTagInput ? (
              <div className="flex items-center gap-1">
                <input autoFocus type="text" value={localTags}
                  onChange={(e) => setLocalTags(e.target.value)}
                  onBlur={handleTagsSave}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleTagsSave(); if (e.key === 'Escape') setShowTagInput(false); }}
                  placeholder="tag1, tag2..."
                  className="text-xs bg-surface-100 dark:bg-surface-800 border border-brand-400 rounded-full px-2 py-0.5 outline-none text-surface-700 dark:text-surface-300 w-32"
                />
                <button onClick={() => setShowTagInput(false)} className="text-surface-400 hover:text-surface-600"><X size={12} /></button>
              </div>
            ) : (
              <button onClick={() => setShowTagInput(true)}
                className="text-xs text-surface-400 hover:text-surface-600 dark:hover:text-surface-300 flex items-center gap-1 px-1.5 py-0.5 rounded-full hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors">
                <Tag size={9} /> Add tag
              </button>
            )}

            {/* Due date badge */}
            {note.dueDate && (
              <button onClick={() => setShowDueDatePicker(true)}
                className={cn(
                  'inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full transition-colors',
                  isDuePast
                    ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                    : 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                )}>
                <Calendar size={9} />
                {new Date(note.dueDate).toLocaleDateString()}
                {isDuePast && ' (overdue)'}
              </button>
            )}
          </div>
        </div>

        {/* Content */}
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
            <button onClick={() => setShowBacklinks(!showBacklinks)}
              className="flex items-center gap-2 text-sm font-medium text-surface-500 dark:text-surface-400 hover:text-surface-700 dark:hover:text-surface-200 transition-colors mb-2">
              <LinkIcon size={13} />
              {backlinks.length} Backlink{backlinks.length !== 1 ? 's' : ''}
            </button>
            {showBacklinks && (
              <div className="space-y-2">
                {backlinks.map((bl) => (
                  <button key={bl.id} onClick={() => useNotesStore.getState().setActiveNote(bl.id)}
                    className="flex items-start gap-2 w-full text-left p-3 rounded-lg bg-surface-50 dark:bg-surface-800 hover:bg-surface-100 dark:hover:bg-surface-700 transition-colors">
                    <Hash size={13} className="mt-0.5 text-surface-400 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-surface-700 dark:text-surface-300">{bl.title || 'Untitled'}</p>
                      {bl.plainText && <p className="text-xs text-surface-400 mt-0.5 line-clamp-1">{bl.plainText.slice(0, 60)}</p>}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Status bar (word/char count + sync + focus mode) */}
      <div className="flex items-center justify-between px-4 py-1 border-t border-surface-100 dark:border-surface-800 bg-white dark:bg-surface-900 text-xs text-surface-400 flex-shrink-0">
        <div className="flex items-center gap-3">
          {settings.showWordCount && <span>{wordCount.toLocaleString()}w</span>}
          {settings.showCharCount && <span>{charCount.toLocaleString()}c</span>}
          {settings.syncStatus === 'syncing' && <span className="text-blue-400">Syncing…</span>}
          {settings.syncStatus === 'success' && <span className="text-green-400">Saved</span>}
          {note.locked && !isLocked && <span className="text-amber-500 flex items-center gap-0.5"><Lock size={10} /> Locked</span>}
          {noteSizeWarning && (
            <button
              onClick={handleManualSave}
              className="text-orange-500 hover:text-orange-600 flex items-center gap-0.5 underline underline-offset-2"
              title="Note is large — auto-save disabled. Click to save manually."
            >
              Large note — save manually (⌘S)
            </button>
          )}
        </div>
        <div className="flex items-center gap-0.5">
          <button onClick={() => setShowShortcuts(true)} title="Keyboard shortcuts (?)"
            className="p-1 rounded hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors">
            <Keyboard size={12} />
          </button>
          <button onClick={() => setIsFocusMode((f) => !f)} title="Focus mode (⌘⇧F)"
            className={cn('p-1 rounded hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors', isFocusMode && 'text-brand-500')}>
            {isFocusMode ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
          </button>
        </div>
      </div>

      {/* ── Samsung Notes bottom toolbar ── */}
      <div className="flex items-center justify-around px-2 py-1.5 border-t border-surface-200 dark:border-surface-800 bg-surface-50 dark:bg-surface-900/80 flex-shrink-0">
        {/* Voice */}
        <ToolbarBtn
          icon={<Mic size={20} />}
          label="Voice"
          active={showVoice}
          onClick={() => { setShowVoice((v) => !v); if (showDrawing) setShowDrawing(false); }}
          activeColor="text-red-500"
        />
        {/* Draw */}
        <ToolbarBtn
          icon={<PenLine size={20} />}
          label="Draw"
          active={showDrawing}
          onClick={() => { setShowDrawing(true); if (showVoice) setShowVoice(false); }}
          activeColor="text-purple-500"
        />
        {/* Due Date */}
        <ToolbarBtn
          icon={<Calendar size={20} />}
          label="Date"
          active={showDueDatePicker || !!note.dueDate}
          onClick={() => setShowDueDatePicker((v) => !v)}
          activeColor="text-blue-500"
          badge={isDuePast ? '!' : undefined}
        />
        {/* Lock */}
        <ToolbarBtn
          icon={note.locked && !isLocked ? <Unlock size={20} /> : <Lock size={20} />}
          label={note.locked ? (isLocked ? 'Locked' : 'Unlock') : 'Lock'}
          active={note.locked ?? false}
          onClick={note.locked && !isLocked ? handleRemoveLock : handleToggleLock}
          activeColor="text-amber-500"
        />
        {/* Import */}
        <ToolbarBtn
          icon={<Upload size={20} />}
          label="Import"
          onClick={() => importInputRef.current?.click()}
        />
        {/* Read */}
        <ToolbarBtn
          icon={<BookOpen size={20} />}
          label="Read"
          active={isReadingMode}
          onClick={() => setIsReadingMode((v) => !v)}
          activeColor="text-amber-500"
        />
        {/* Share */}
        <ToolbarBtn icon={<Share2 size={20} />} label="Share" onClick={handleShare} />
        {/* Export — dropdown */}
        <div className="relative">
          <ToolbarBtn
            icon={<Download size={20} />}
            label="Export"
            active={showExportMenu}
            onClick={() => setShowExportMenu((v) => !v)}
            activeColor="text-brand-500"
          />
          <AnimatePresence>
            {showExportMenu && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 4 }}
                transition={{ duration: 0.1 }}
                className="absolute bottom-full mb-2 right-0 w-44 bg-white dark:bg-surface-800 rounded-xl shadow-dropdown border border-surface-200 dark:border-surface-700 z-20 py-1 overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={() => { handleExport(); setShowExportMenu(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-surface-700 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-700 transition-colors"
                >
                  <Download size={13} className="text-surface-400" />
                  Print / Save PDF
                </button>
                <button
                  onClick={() => { handleDownloadMarkdown(); setShowExportMenu(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-surface-700 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-700 transition-colors"
                >
                  <FileDown size={13} className="text-surface-400" />
                  Download .md
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

// ─── Bottom toolbar button ────────────────────────────────────────────────────

function ToolbarBtn({
  icon, label, active, onClick, activeColor = 'text-brand-500', badge,
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick: () => void;
  activeColor?: string;
  badge?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'relative flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-xl transition-all min-w-[48px]',
        active
          ? `${activeColor} bg-current/10`
          : 'text-surface-500 dark:text-surface-400 hover:text-surface-700 dark:hover:text-surface-200 hover:bg-surface-100 dark:hover:bg-surface-800'
      )}
    >
      {badge && (
        <span className="absolute top-1 right-1 w-3.5 h-3.5 text-[9px] font-bold bg-red-500 text-white rounded-full flex items-center justify-center">
          {badge}
        </span>
      )}
      {icon}
      <span className="text-[10px] font-medium leading-none">{label}</span>
    </button>
  );
}
