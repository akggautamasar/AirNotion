'use client';

import { NodeViewWrapper, NodeViewContent } from '@tiptap/react';
import type { NodeViewProps } from '@tiptap/react';
import { useState, useCallback, useEffect } from 'react';
import { Check, Copy, Eye, Code } from 'lucide-react';

export default function CodeBlockComponent({ node, updateAttributes }: NodeViewProps) {
  const [copied, setCopied] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [mermaidSvg, setMermaidSvg] = useState('');
  const [mermaidError, setMermaidError] = useState('');
  const language: string = node.attrs.language || 'plaintext';
  const isMermaid = language === 'mermaid';

  const LANGUAGES = [
    'plaintext', 'mermaid',
    'javascript', 'typescript', 'jsx', 'tsx',
    'python', 'rust', 'go', 'java', 'c', 'cpp', 'csharp',
    'html', 'css', 'json', 'yaml', 'bash', 'shell',
    'sql', 'markdown', 'php', 'ruby', 'swift', 'kotlin',
  ];

  const renderMermaid = useCallback(async () => {
    const code = node.textContent.trim();
    if (!code) { setMermaidSvg(''); setMermaidError(''); return; }
    try {
      const mermaid = (await import('mermaid')).default;
      mermaid.initialize({ startOnLoad: false, theme: 'dark', securityLevel: 'loose' });
      const id = `mermaid-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const { svg } = await mermaid.render(id, code);
      setMermaidSvg(svg);
      setMermaidError('');
    } catch (err: unknown) {
      setMermaidError(err instanceof Error ? err.message : 'Invalid Mermaid syntax');
      setMermaidSvg('');
    }
  }, [node.textContent]);

  // Re-render when code changes while preview is open
  useEffect(() => {
    if (isMermaid && showPreview) renderMermaid();
  }, [node.textContent, isMermaid, showPreview, renderMermaid]);

  const handleTogglePreview = () => {
    if (!showPreview) renderMermaid();
    setShowPreview((v) => !v);
  };

  const handleCopy = useCallback(async () => {
    const text = node.textContent;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
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

  return (
    <NodeViewWrapper className="relative group my-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-surface-800 dark:bg-surface-950 rounded-t-lg border-b border-surface-700">
        <select
          value={language}
          onChange={(e) => {
            updateAttributes({ language: e.target.value });
            setShowPreview(false);
            setMermaidSvg('');
          }}
          className="text-xs bg-transparent text-surface-400 hover:text-surface-200 outline-none cursor-pointer"
          contentEditable={false}
        >
          {LANGUAGES.map((lang) => (
            <option key={lang} value={lang} className="bg-surface-800 text-surface-200">
              {lang}
            </option>
          ))}
        </select>

        <div className="flex items-center gap-1">
          {isMermaid && (
            <button
              onClick={handleTogglePreview}
              contentEditable={false}
              className="flex items-center gap-1.5 text-xs text-surface-400 hover:text-surface-200 transition-colors px-2 py-0.5 rounded hover:bg-surface-700"
            >
              {showPreview ? <><Code size={12} /> Code</> : <><Eye size={12} /> Preview</>}
            </button>
          )}
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
      </div>

      {/* Mermaid preview */}
      {isMermaid && showPreview && (
        <div
          className="bg-surface-900 border border-surface-700 border-t-0 rounded-b-lg p-4 min-h-16"
          contentEditable={false}
        >
          {mermaidError ? (
            <p className="text-red-400 text-xs font-mono whitespace-pre-wrap">{mermaidError}</p>
          ) : mermaidSvg ? (
            <div
              className="flex justify-center overflow-x-auto"
              dangerouslySetInnerHTML={{ __html: mermaidSvg }}
            />
          ) : (
            <p className="text-surface-500 text-xs text-center py-4">Rendering diagram…</p>
          )}
        </div>
      )}

      {/* Code content — always rendered (even in preview so TipTap keeps the text) */}
      <pre
        className={`!mt-0 !rounded-t-none overflow-x-auto bg-surface-900 dark:bg-surface-950 border border-surface-700 border-t-0 rounded-b-lg p-4 ${isMermaid && showPreview ? 'hidden' : ''}`}
      >
        <NodeViewContent as="code" className={`language-${language} hljs text-sm font-mono`} />
      </pre>
    </NodeViewWrapper>
  );
}
