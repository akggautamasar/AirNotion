import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { formatDistanceToNow, format, parseISO } from 'date-fns';
import TurndownService from 'turndown';
import { marked } from 'marked';
import type { NoteColor } from './types';

// ─── Classname utility ───────────────────────────────────────────────────────

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

// ─── ID generation ───────────────────────────────────────────────────────────

export function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// ─── Text extraction ─────────────────────────────────────────────────────────

export function extractPlainText(html: string): string {
  if (typeof window === 'undefined') {
    // SSR: simple regex strip
    return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  }
  const div = document.createElement('div');
  div.innerHTML = html;
  return div.textContent || div.innerText || '';
}

// ─── Word / char counting ────────────────────────────────────────────────────

export function countWords(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).filter(Boolean).length;
}

export function countChars(text: string): number {
  return text.length;
}

// ─── HTML ↔ Markdown ─────────────────────────────────────────────────────────

let _turndown: TurndownService | null = null;

function getTurndown(): TurndownService {
  if (!_turndown) {
    _turndown = new TurndownService({
      headingStyle: 'atx',
      hr: '---',
      bulletListMarker: '-',
      codeBlockStyle: 'fenced',
      fence: '```',
      emDelimiter: '_',
      strongDelimiter: '**',
      linkStyle: 'inlined',
    });
    // Preserve task list items
    _turndown.addRule('taskListItems', {
      filter: (node) => {
        return (
          node.nodeName === 'LI' &&
          node.querySelector('input[type="checkbox"]') !== null
        );
      },
      replacement: (_content, node) => {
        const el = node as HTMLElement;
        const checkbox = el.querySelector('input[type="checkbox"]') as HTMLInputElement | null;
        const checked = checkbox?.checked ? 'x' : ' ';
        const text = el.textContent?.replace(/^\s*\[.\]\s*/, '').trim() || '';
        return `- [${checked}] ${text}\n`;
      },
    });
  }
  return _turndown;
}

export function htmlToMarkdown(html: string): string {
  try {
    return getTurndown().turndown(html);
  } catch {
    return extractPlainText(html);
  }
}

export async function markdownToHtml(markdown: string): Promise<string> {
  try {
    const result = await marked(markdown, { async: false });
    return result as string;
  } catch {
    return `<p>${markdown}</p>`;
  }
}

// ─── Date formatting ─────────────────────────────────────────────────────────

export function formatRelativeTime(date: string): string {
  try {
    return formatDistanceToNow(parseISO(date), { addSuffix: true });
  } catch {
    return '';
  }
}

export function formatAbsoluteDate(date: string): string {
  try {
    return format(parseISO(date), 'MMM d, yyyy h:mm a');
  } catch {
    return '';
  }
}

// ─── Debounce ────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout> | null = null;
  return (...args: Parameters<T>) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

// ─── Note color → Tailwind classes ───────────────────────────────────────────

export function noteColorToClass(color: NoteColor): {
  bg: string;
  bgDark: string;
  border: string;
  borderDark: string;
} {
  const map: Record<NoteColor, { bg: string; bgDark: string; border: string; borderDark: string }> = {
    default:  { bg: 'bg-white',              bgDark: 'dark:bg-surface-800',     border: 'border-surface-200', borderDark: 'dark:border-surface-700' },
    red:      { bg: 'bg-red-50',             bgDark: 'dark:bg-red-950/40',      border: 'border-red-200',     borderDark: 'dark:border-red-800/50'  },
    orange:   { bg: 'bg-orange-50',          bgDark: 'dark:bg-orange-950/40',   border: 'border-orange-200',  borderDark: 'dark:border-orange-800/50' },
    yellow:   { bg: 'bg-yellow-50',          bgDark: 'dark:bg-yellow-950/40',   border: 'border-yellow-200',  borderDark: 'dark:border-yellow-800/50' },
    green:    { bg: 'bg-green-50',           bgDark: 'dark:bg-green-950/40',    border: 'border-green-200',   borderDark: 'dark:border-green-800/50' },
    teal:     { bg: 'bg-teal-50',            bgDark: 'dark:bg-teal-950/40',     border: 'border-teal-200',    borderDark: 'dark:border-teal-800/50' },
    blue:     { bg: 'bg-blue-50',            bgDark: 'dark:bg-blue-950/40',     border: 'border-blue-200',    borderDark: 'dark:border-blue-800/50' },
    purple:   { bg: 'bg-purple-50',          bgDark: 'dark:bg-purple-950/40',   border: 'border-purple-200',  borderDark: 'dark:border-purple-800/50' },
    pink:     { bg: 'bg-pink-50',            bgDark: 'dark:bg-pink-950/40',     border: 'border-pink-200',    borderDark: 'dark:border-pink-800/50' },
    brown:    { bg: 'bg-amber-50',           bgDark: 'dark:bg-amber-950/40',    border: 'border-amber-200',   borderDark: 'dark:border-amber-800/50' },
    gray:     { bg: 'bg-gray-50',            bgDark: 'dark:bg-gray-900/40',     border: 'border-gray-200',    borderDark: 'dark:border-gray-700/50' },
  };
  return map[color] ?? map.default;
}

export function noteColorDotClass(color: NoteColor): string {
  const map: Record<NoteColor, string> = {
    default: 'bg-surface-300 dark:bg-surface-600',
    red:     'bg-red-400',
    orange:  'bg-orange-400',
    yellow:  'bg-yellow-400',
    green:   'bg-green-400',
    teal:    'bg-teal-400',
    blue:    'bg-blue-400',
    purple:  'bg-purple-400',
    pink:    'bg-pink-400',
    brown:   'bg-amber-600',
    gray:    'bg-gray-400',
  };
  return map[color] ?? map.default;
}

// ─── Extract note:// links ───────────────────────────────────────────────────

export function extractLinks(html: string): string[] {
  const regex = /href="note:\/\/([^"]+)"/g;
  const ids: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = regex.exec(html)) !== null) {
    ids.push(match[1]);
  }
  return ids;
}

// ─── Truncate text ───────────────────────────────────────────────────────────

export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trimEnd() + '…';
}

// ─── Size formatting ─────────────────────────────────────────────────────────

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
