'use client';

import { NodeViewWrapper, NodeViewContent } from '@tiptap/react';
import type { NodeViewProps } from '@tiptap/react';
import { useState, useCallback } from 'react';
import { Check, Copy } from 'lucide-react';

export default function CodeBlockComponent({ node, updateAttributes }: NodeViewProps) {
  const [copied, setCopied] = useState(false);
  const language: string = node.attrs.language || 'plaintext';

  const handleCopy = useCallback(async () => {
    const text = node.textContent;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [node.textContent]);

  const LANGUAGES = [
    'plaintext', 'javascript', 'typescript', 'jsx', 'tsx',
    'python', 'rust', 'go', 'java', 'c', 'cpp', 'csharp',
    'html', 'css', 'json', 'yaml', 'bash', 'shell',
    'sql', 'markdown', 'php', 'ruby', 'swift', 'kotlin',
  ];

  return (
    <NodeViewWrapper className="relative group my-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-surface-800 dark:bg-surface-950 rounded-t-lg border-b border-surface-700">
        <select
          value={language}
          onChange={(e) => updateAttributes({ language: e.target.value })}
          className="text-xs bg-transparent text-surface-400 hover:text-surface-200 outline-none cursor-pointer"
          contentEditable={false}
        >
          {LANGUAGES.map((lang) => (
            <option key={lang} value={lang} className="bg-surface-800 text-surface-200">
              {lang}
            </option>
          ))}
        </select>

        <button
          onClick={handleCopy}
          contentEditable={false}
          className="flex items-center gap-1.5 text-xs text-surface-400 hover:text-surface-200 transition-colors px-2 py-0.5 rounded hover:bg-surface-700"
        >
          {copied ? (
            <><Check size={12} className="text-green-400" /> Copied</>
          ) : (
            <><Copy size={12} /> Copy</>
          )}
        </button>
      </div>

      {/* Code content */}
      <pre className="!mt-0 !rounded-t-none overflow-x-auto bg-surface-900 dark:bg-surface-950 border border-surface-700 border-t-0 rounded-b-lg p-4">
        <NodeViewContent as="code" className={`language-${language} hljs text-sm font-mono`} />
      </pre>
    </NodeViewWrapper>
  );
}
