'use client';

import { useState, useCallback } from 'react';
import type { Editor } from '@tiptap/react';
import {
  Bold, Italic, Underline, Strikethrough, Code, Code2,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  List, ListOrdered, ListChecks,
  Heading1, Heading2, Heading3,
  Quote, Minus, Table, Image, Link, Unlink,
  Undo, Redo, Subscript, Superscript,
  PaintBucket, Highlighter, RemoveFormatting,
  ChevronDown, Type,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ToolbarProps {
  editor: Editor;
}

// ─── Color presets ─────────────────────────────────────────────────────────────

const TEXT_COLORS = [
  { color: '#000000', label: 'Black' },
  { color: '#1e293b', label: 'Dark' },
  { color: '#6b7280', label: 'Gray' },
  { color: '#ef4444', label: 'Red' },
  { color: '#f97316', label: 'Orange' },
  { color: '#eab308', label: 'Yellow' },
  { color: '#22c55e', label: 'Green' },
  { color: '#3b82f6', label: 'Blue' },
  { color: '#8b5cf6', label: 'Purple' },
  { color: '#ec4899', label: 'Pink' },
];

const HIGHLIGHT_COLORS = [
  { color: '#fef08a', label: 'Yellow' },
  { color: '#bbf7d0', label: 'Green' },
  { color: '#bfdbfe', label: 'Blue' },
  { color: '#fecaca', label: 'Red' },
  { color: '#ddd6fe', label: 'Purple' },
  { color: '#fed7aa', label: 'Orange' },
  { color: '#fbcfe8', label: 'Pink' },
  { color: '#e5e7eb', label: 'Gray' },
];

const FONT_FAMILIES = [
  { value: 'Inter, sans-serif',           label: 'Sans-serif' },
  { value: 'Georgia, serif',              label: 'Serif'      },
  { value: 'JetBrains Mono, monospace',   label: 'Monospace'  },
];

export default function Toolbar({ editor }: ToolbarProps) {
  const [showTextColors, setShowTextColors] = useState(false);
  const [showHighlights, setShowHighlights] = useState(false);
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [showHeadings, setShowHeadings] = useState(false);
  const [showFonts, setShowFonts] = useState(false);

  const handleLink = useCallback(() => {
    if (editor.isActive('link')) {
      editor.chain().focus().unsetLink().run();
      return;
    }
    const url = prompt('Enter URL:');
    if (url) {
      editor.chain().focus().setLink({ href: url, target: '_blank' }).run();
    }
  }, [editor]);

  const handleImageUpload = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const src = ev.target?.result as string;
        editor.chain().focus().setImage({ src }).run();
      };
      reader.readAsDataURL(file);
    };
    input.click();
  }, [editor]);

  const currentHeading = () => {
    for (let i = 1; i <= 6; i++) {
      if (editor.isActive('heading', { level: i })) return `H${i}`;
    }
    return 'Text';
  };

  const currentFont = () => {
    const font = FONT_FAMILIES.find((f) => editor.isActive('textStyle', { fontFamily: f.value }));
    return font?.label || 'Font';
  };

  return (
    <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 border-b border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 sticky top-0 z-10 overflow-x-auto">
      {/* Undo / Redo */}
      <ToolGroup>
        <ToolBtn
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          title="Undo (⌘Z)"
        >
          <Undo size={14} />
        </ToolBtn>
        <ToolBtn
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          title="Redo (⌘⇧Z)"
        >
          <Redo size={14} />
        </ToolBtn>
      </ToolGroup>

      <Divider />

      {/* Heading / paragraph dropdown */}
      <div className="relative">
        <ToolBtn
          onClick={() => { setShowHeadings(!showHeadings); setShowFonts(false); }}
          className="flex items-center gap-1 min-w-14 justify-between"
          title="Heading level"
        >
          <span className="text-xs font-medium">{currentHeading()}</span>
          <ChevronDown size={10} />
        </ToolBtn>
        {showHeadings && (
          <div className="absolute left-0 top-full mt-1 bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl shadow-dropdown z-20 py-1 w-36 animate-scale-in">
            {[
              { label: 'Normal Text', fn: () => editor.chain().focus().setParagraph().run() },
              { label: 'Heading 1',   fn: () => editor.chain().focus().setHeading({ level: 1 }).run() },
              { label: 'Heading 2',   fn: () => editor.chain().focus().setHeading({ level: 2 }).run() },
              { label: 'Heading 3',   fn: () => editor.chain().focus().setHeading({ level: 3 }).run() },
              { label: 'Heading 4',   fn: () => editor.chain().focus().setHeading({ level: 4 }).run() },
              { label: 'Heading 5',   fn: () => editor.chain().focus().setHeading({ level: 5 }).run() },
              { label: 'Heading 6',   fn: () => editor.chain().focus().setHeading({ level: 6 }).run() },
            ].map((item) => (
              <button
                key={item.label}
                onClick={() => { item.fn(); setShowHeadings(false); }}
                className="w-full text-left px-3 py-1.5 text-sm hover:bg-surface-100 dark:hover:bg-surface-700 text-surface-700 dark:text-surface-300"
              >
                {item.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Font family */}
      <div className="relative">
        <ToolBtn
          onClick={() => { setShowFonts(!showFonts); setShowHeadings(false); }}
          className="flex items-center gap-1 min-w-16 justify-between"
          title="Font family"
        >
          <Type size={12} />
          <ChevronDown size={10} />
        </ToolBtn>
        {showFonts && (
          <div className="absolute left-0 top-full mt-1 bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl shadow-dropdown z-20 py-1 w-36 animate-scale-in">
            {FONT_FAMILIES.map((ff) => (
              <button
                key={ff.value}
                onClick={() => { editor.chain().focus().setFontFamily(ff.value).run(); setShowFonts(false); }}
                className="w-full text-left px-3 py-1.5 text-sm hover:bg-surface-100 dark:hover:bg-surface-700 text-surface-700 dark:text-surface-300"
                style={{ fontFamily: ff.value }}
              >
                {ff.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <Divider />

      {/* Text formatting */}
      <ToolGroup>
        <ToolBtn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} title="Bold (⌘B)">
          <Bold size={14} />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} title="Italic (⌘I)">
          <Italic size={14} />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive('underline')} title="Underline (⌘U)">
          <Underline size={14} />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive('strike')} title="Strikethrough">
          <Strikethrough size={14} />
        </ToolBtn>
      </ToolGroup>

      <Divider />

      {/* Text & highlight colors */}
      <ToolGroup>
        <div className="relative">
          <ToolBtn
            onClick={() => { setShowTextColors(!showTextColors); setShowHighlights(false); }}
            title="Text color"
            className="flex items-center gap-0.5"
          >
            <PaintBucket size={14} />
            <ChevronDown size={10} />
          </ToolBtn>
          {showTextColors && (
            <ColorDropdown
              colors={TEXT_COLORS}
              onSelect={(c) => { editor.chain().focus().setColor(c).run(); setShowTextColors(false); }}
              onClear={() => { editor.chain().focus().unsetColor().run(); setShowTextColors(false); }}
              onClose={() => setShowTextColors(false)}
            />
          )}
        </div>
        <div className="relative">
          <ToolBtn
            onClick={() => { setShowHighlights(!showHighlights); setShowTextColors(false); }}
            title="Highlight"
            active={editor.isActive('highlight')}
            className="flex items-center gap-0.5"
          >
            <Highlighter size={14} />
            <ChevronDown size={10} />
          </ToolBtn>
          {showHighlights && (
            <ColorDropdown
              colors={HIGHLIGHT_COLORS}
              onSelect={(c) => { editor.chain().focus().toggleHighlight({ color: c }).run(); setShowHighlights(false); }}
              onClear={() => { editor.chain().focus().unsetHighlight().run(); setShowHighlights(false); }}
              onClose={() => setShowHighlights(false)}
            />
          )}
        </div>
      </ToolGroup>

      <Divider />

      {/* Alignment */}
      <ToolGroup>
        <ToolBtn onClick={() => editor.chain().focus().setTextAlign('left').run()} active={editor.isActive({ textAlign: 'left' })} title="Align left">
          <AlignLeft size={14} />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().setTextAlign('center').run()} active={editor.isActive({ textAlign: 'center' })} title="Align center">
          <AlignCenter size={14} />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().setTextAlign('right').run()} active={editor.isActive({ textAlign: 'right' })} title="Align right">
          <AlignRight size={14} />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().setTextAlign('justify').run()} active={editor.isActive({ textAlign: 'justify' })} title="Justify">
          <AlignJustify size={14} />
        </ToolBtn>
      </ToolGroup>

      <Divider />

      {/* Lists */}
      <ToolGroup>
        <ToolBtn onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} title="Bullet list">
          <List size={14} />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} title="Numbered list">
          <ListOrdered size={14} />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleTaskList().run()} active={editor.isActive('taskList')} title="Task list">
          <ListChecks size={14} />
        </ToolBtn>
      </ToolGroup>

      <Divider />

      {/* Code */}
      <ToolGroup>
        <ToolBtn onClick={() => editor.chain().focus().toggleCode().run()} active={editor.isActive('code')} title="Inline code (⌘E)">
          <Code size={14} />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleCodeBlock().run()} active={editor.isActive('codeBlock')} title="Code block (⌘⇧C)">
          <Code2 size={14} />
        </ToolBtn>
      </ToolGroup>

      <Divider />

      {/* Quote, HR, Table */}
      <ToolGroup>
        <ToolBtn onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive('blockquote')} title="Blockquote">
          <Quote size={14} />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Divider">
          <Minus size={14} />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()} title="Insert table">
          <Table size={14} />
        </ToolBtn>
      </ToolGroup>

      <Divider />

      {/* Image & Link */}
      <ToolGroup>
        <ToolBtn onClick={handleImageUpload} title="Insert image">
          <Image size={14} />
        </ToolBtn>
        <ToolBtn
          onClick={handleLink}
          active={editor.isActive('link')}
          title={editor.isActive('link') ? 'Remove link' : 'Add link'}
        >
          {editor.isActive('link') ? <Unlink size={14} /> : <Link size={14} />}
        </ToolBtn>
      </ToolGroup>

      <Divider />

      {/* Sub / superscript */}
      <ToolGroup>
        <ToolBtn onClick={() => editor.chain().focus().toggleSubscript().run()} active={editor.isActive('subscript')} title="Subscript">
          <Subscript size={14} />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleSuperscript().run()} active={editor.isActive('superscript')} title="Superscript">
          <Superscript size={14} />
        </ToolBtn>
      </ToolGroup>

      <Divider />

      {/* Clear formatting */}
      <ToolBtn onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()} title="Clear formatting">
        <RemoveFormatting size={14} />
      </ToolBtn>
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function ToolGroup({ children }: { children: React.ReactNode }) {
  return <div className="flex items-center gap-0.5">{children}</div>;
}

function Divider() {
  return <div className="w-px h-5 bg-surface-200 dark:bg-surface-700 mx-1 flex-shrink-0" />;
}

interface ToolBtnProps {
  children: React.ReactNode;
  onClick?: () => void;
  active?: boolean;
  disabled?: boolean;
  title?: string;
  className?: string;
}

function ToolBtn({ children, onClick, active, disabled, title, className }: ToolBtnProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        'p-1.5 rounded-md transition-colors flex-shrink-0',
        active
          ? 'bg-brand-500/15 text-brand-600 dark:text-brand-400'
          : 'text-surface-500 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-800 hover:text-surface-700 dark:hover:text-surface-200',
        disabled && 'opacity-30 cursor-not-allowed',
        className
      )}
    >
      {children}
    </button>
  );
}

function ColorDropdown({
  colors,
  onSelect,
  onClear,
  onClose,
}: {
  colors: { color: string; label: string }[];
  onSelect: (c: string) => void;
  onClear: () => void;
  onClose: () => void;
}) {
  return (
    <div
      className="absolute left-0 top-full mt-1 bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl shadow-dropdown z-20 p-2.5 w-40 animate-scale-in"
      onMouseLeave={onClose}
    >
      <div className="grid grid-cols-5 gap-1.5 mb-2">
        {colors.map(({ color, label }) => (
          <button
            key={color}
            title={label}
            onClick={() => onSelect(color)}
            className="w-6 h-6 rounded-full border border-surface-200 dark:border-surface-600 hover:scale-110 transition-transform"
            style={{ backgroundColor: color }}
          />
        ))}
      </div>
      <button
        onClick={onClear}
        className="w-full text-center text-xs text-surface-500 hover:text-surface-700 dark:hover:text-surface-300 py-1 rounded hover:bg-surface-100 dark:hover:bg-surface-700"
      >
        Clear
      </button>
    </div>
  );
}
