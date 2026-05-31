'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Bot,
  Palette,
  Type,
  Keyboard,
  Download,
  Upload,
  CheckCircle,
  XCircle,
  Loader,
  Eye,
  EyeOff,
} from 'lucide-react';
import { useNotesStore } from '@/store/notesStore';
import { cn } from '@/lib/utils';
import { testTelegramConnection } from '@/lib/telegram';
import { htmlToMarkdown } from '@/lib/utils';
import toast from 'react-hot-toast';

type Tab = 'account' | 'editor' | 'appearance' | 'shortcuts' | 'data';

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'account',    label: 'Telegram',   icon: <Bot size={15} /> },
  { id: 'editor',     label: 'Editor',     icon: <Type size={15} /> },
  { id: 'appearance', label: 'Appearance', icon: <Palette size={15} /> },
  { id: 'shortcuts',  label: 'Shortcuts',  icon: <Keyboard size={15} /> },
  { id: 'data',       label: 'Data',       icon: <Download size={15} /> },
];

const SHORTCUTS = [
  { keys: ['⌘', 'K'],       desc: 'Command palette' },
  { keys: ['⌘', 'N'],       desc: 'New note' },
  { keys: ['⌘', 'F'],       desc: 'Search notes' },
  { keys: ['⌘', 'S'],       desc: 'Save / sync' },
  { keys: ['⌘', ','],       desc: 'Open settings' },
  { keys: ['⌘', '\\'],      desc: 'Toggle sidebar' },
  { keys: ['⌘', 'Shift', 'F'], desc: 'Focus mode' },
  { keys: ['⌘', 'B'],       desc: 'Bold' },
  { keys: ['⌘', 'I'],       desc: 'Italic' },
  { keys: ['⌘', 'U'],       desc: 'Underline' },
  { keys: ['⌘', 'Shift', 'S'], desc: 'Strikethrough' },
  { keys: ['⌘', 'E'],       desc: 'Inline code' },
  { keys: ['⌘', 'Shift', 'C'], desc: 'Code block' },
  { keys: ['Tab'],           desc: 'Indent list item' },
  { keys: ['Shift', 'Tab'], desc: 'Outdent list item' },
  { keys: ['⌘', 'Z'],       desc: 'Undo' },
  { keys: ['⌘', 'Shift', 'Z'], desc: 'Redo' },
];

export default function SettingsModal() {
  const { isSettingsOpen, closeSettings, settings, setSettings, notes } = useNotesStore();
  const [activeTab, setActiveTab] = useState<Tab>('account');
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'ok' | 'error'>('idle');
  const [showToken, setShowToken] = useState(false);

  const handleTestConnection = useCallback(async () => {
    if (!settings.telegramBotToken || !settings.telegramChatId) {
      toast.error('Enter bot token and chat ID first');
      return;
    }
    setTestStatus('testing');
    try {
      const ok = await testTelegramConnection(settings.telegramBotToken, settings.telegramChatId);
      setTestStatus(ok ? 'ok' : 'error');
      toast[ok ? 'success' : 'error'](ok ? 'Telegram connected!' : 'Connection failed');
    } catch {
      setTestStatus('error');
      toast.error('Connection failed');
    }
  }, [settings.telegramBotToken, settings.telegramChatId]);

  const handleExportAll = useCallback(() => {
    const data = notes.map((n) => ({
      id: n.id,
      title: n.title || 'Untitled',
      content: htmlToMarkdown(n.content),
      tags: n.tags,
      folder: n.folder,
      createdAt: n.createdAt,
      updatedAt: n.updatedAt,
    }));
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `airnotion-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${notes.length} notes`);
  }, [notes]);

  const handleExportMarkdown = useCallback(() => {
    const parts = notes.map((n) => {
      const md = htmlToMarkdown(n.content);
      return `# ${n.title || 'Untitled'}\n\n${md}\n\n---\n`;
    });
    const blob = new Blob([parts.join('\n')], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `airnotion-export-${new Date().toISOString().slice(0, 10)}.md`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Exported as Markdown');
  }, [notes]);

  const handleImport = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string);
        if (Array.isArray(data)) {
          toast.success(`Imported ${data.length} notes (feature coming soon)`);
        }
      } catch {
        toast.error('Invalid file format');
      }
    };
    reader.readAsText(file);
  }, []);

  if (!isSettingsOpen) return null;

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        onClick={(e) => { if (e.target === e.currentTarget) closeSettings(); }}
      >
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.97, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.97, y: 8 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-2xl bg-white dark:bg-surface-900 rounded-2xl shadow-modal border border-surface-200 dark:border-surface-700 overflow-hidden flex flex-col max-h-[85vh]"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-surface-200 dark:border-surface-700">
            <h2 className="text-lg font-semibold text-surface-900 dark:text-white">Settings</h2>
            <button
              onClick={closeSettings}
              className="p-1.5 rounded-lg text-surface-400 hover:text-surface-600 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          <div className="flex flex-1 overflow-hidden">
            {/* Sidebar tabs */}
            <div className="w-36 flex-shrink-0 border-r border-surface-200 dark:border-surface-700 py-3 flex flex-col gap-0.5 px-2">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors w-full text-left',
                    activeTab === tab.id
                      ? 'bg-brand-500/10 text-brand-600 dark:text-brand-400'
                      : 'text-surface-600 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-800'
                  )}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-5">
              {/* ── Telegram ─────────────────────────────── */}
              {activeTab === 'account' && (
                <div className="space-y-5">
                  <div>
                    <h3 className="text-sm font-semibold text-surface-700 dark:text-surface-300 mb-3">Telegram Storage</h3>
                    <p className="text-xs text-surface-500 dark:text-surface-400 mb-4 leading-relaxed">
                      AirNotion uses your Telegram account as a backend. Create a bot via @BotFather and get your Chat ID via @userinfobot.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <label className="block">
                      <span className="text-xs font-medium text-surface-600 dark:text-surface-400 uppercase tracking-wider">Bot Token</span>
                      <div className="relative mt-1.5">
                        <input
                          type={showToken ? 'text' : 'password'}
                          value={settings.telegramBotToken}
                          onChange={(e) => setSettings({ telegramBotToken: e.target.value })}
                          placeholder="1234567890:ABCdefGHI..."
                          className="w-full bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-lg px-3 py-2 pr-10 text-sm text-surface-900 dark:text-white placeholder-surface-400 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
                        />
                        <button
                          onClick={() => setShowToken(!showToken)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 hover:text-surface-600"
                        >
                          {showToken ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                      </div>
                    </label>

                    <label className="block">
                      <span className="text-xs font-medium text-surface-600 dark:text-surface-400 uppercase tracking-wider">Chat ID</span>
                      <input
                        type="text"
                        value={settings.telegramChatId}
                        onChange={(e) => setSettings({ telegramChatId: e.target.value })}
                        placeholder="-1001234567890"
                        className="mt-1.5 w-full bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-lg px-3 py-2 text-sm text-surface-900 dark:text-white placeholder-surface-400 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
                      />
                    </label>
                  </div>

                  <button
                    onClick={handleTestConnection}
                    disabled={testStatus === 'testing'}
                    className={cn(
                      'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                      testStatus === 'ok'
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                        : testStatus === 'error'
                        ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                        : 'bg-brand-500 text-white hover:bg-brand-600 disabled:opacity-50'
                    )}
                  >
                    {testStatus === 'testing' ? (
                      <><Loader size={14} className="animate-spin" /> Testing...</>
                    ) : testStatus === 'ok' ? (
                      <><CheckCircle size={14} /> Connected</>
                    ) : testStatus === 'error' ? (
                      <><XCircle size={14} /> Failed</>
                    ) : (
                      'Test Connection'
                    )}
                  </button>

                  {settings.lastSynced && (
                    <p className="text-xs text-surface-400">
                      Last synced: {new Date(settings.lastSynced).toLocaleString()}
                    </p>
                  )}
                </div>
              )}

              {/* ── Editor ────────────────────────────────── */}
              {activeTab === 'editor' && (
                <div className="space-y-5">
                  <h3 className="text-sm font-semibold text-surface-700 dark:text-surface-300">Editor Preferences</h3>

                  <div className="space-y-4">
                    <SettingRow label="Font Family">
                      <select
                        value={settings.fontFamily}
                        onChange={(e) => setSettings({ fontFamily: e.target.value as 'sans' | 'serif' | 'mono' })}
                        className="settings-select"
                      >
                        <option value="sans">Sans-serif (Inter)</option>
                        <option value="serif">Serif (Georgia)</option>
                        <option value="mono">Monospace (JetBrains)</option>
                      </select>
                    </SettingRow>

                    <SettingRow label="Font Size">
                      <select
                        value={settings.fontSize}
                        onChange={(e) => setSettings({ fontSize: e.target.value as 'sm' | 'base' | 'lg' | 'xl' })}
                        className="settings-select"
                      >
                        <option value="sm">Small (14px)</option>
                        <option value="base">Medium (16px)</option>
                        <option value="lg">Large (18px)</option>
                        <option value="xl">Extra Large (20px)</option>
                      </select>
                    </SettingRow>

                    <SettingRow label="Line Height">
                      <select
                        value={settings.lineHeight}
                        onChange={(e) => setSettings({ lineHeight: e.target.value as 'tight' | 'normal' | 'relaxed' })}
                        className="settings-select"
                      >
                        <option value="tight">Tight (1.4)</option>
                        <option value="normal">Normal (1.7)</option>
                        <option value="relaxed">Relaxed (2.0)</option>
                      </select>
                    </SettingRow>

                    <SettingRow label="Spell Check">
                      <Toggle
                        checked={settings.spellCheck}
                        onChange={(v) => setSettings({ spellCheck: v })}
                      />
                    </SettingRow>

                    <SettingRow label="Auto Save">
                      <Toggle
                        checked={settings.autoSave}
                        onChange={(v) => setSettings({ autoSave: v })}
                      />
                    </SettingRow>

                    <SettingRow label="Auto Save Interval">
                      <select
                        value={settings.autoSaveInterval}
                        onChange={(e) => setSettings({ autoSaveInterval: Number(e.target.value) })}
                        className="settings-select"
                      >
                        <option value={1}>1 second</option>
                        <option value={2}>2 seconds</option>
                        <option value={5}>5 seconds</option>
                        <option value={10}>10 seconds</option>
                        <option value={30}>30 seconds</option>
                      </select>
                    </SettingRow>

                    <SettingRow label="Word Count">
                      <Toggle
                        checked={settings.showWordCount}
                        onChange={(v) => setSettings({ showWordCount: v })}
                      />
                    </SettingRow>

                    <SettingRow label="Character Count">
                      <Toggle
                        checked={settings.showCharCount}
                        onChange={(v) => setSettings({ showCharCount: v })}
                      />
                    </SettingRow>
                  </div>
                </div>
              )}

              {/* ── Appearance ────────────────────────────── */}
              {activeTab === 'appearance' && (
                <div className="space-y-5">
                  <h3 className="text-sm font-semibold text-surface-700 dark:text-surface-300">Appearance</h3>

                  <div className="space-y-4">
                    <SettingRow label="Theme">
                      <div className="flex gap-2">
                        {(['light', 'dark', 'system'] as const).map((t) => (
                          <button
                            key={t}
                            onClick={() => setSettings({ theme: t })}
                            className={cn(
                              'px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors',
                              settings.theme === t
                                ? 'bg-brand-500 text-white'
                                : 'bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-400 hover:bg-surface-200 dark:hover:bg-surface-700'
                            )}
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                    </SettingRow>

                    <SettingRow label="Default View">
                      <div className="flex gap-2">
                        {(['grid', 'list', 'kanban', 'calendar'] as const).map((v) => (
                          <button
                            key={v}
                            onClick={() => setSettings({ viewMode: v })}
                            className={cn(
                              'px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors',
                              settings.viewMode === v
                                ? 'bg-brand-500 text-white'
                                : 'bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-400 hover:bg-surface-200 dark:hover:bg-surface-700'
                            )}
                          >
                            {v}
                          </button>
                        ))}
                      </div>
                    </SettingRow>

                    <SettingRow label="Sidebar Open by Default">
                      <Toggle
                        checked={settings.sidebarOpen}
                        onChange={(v) => setSettings({ sidebarOpen: v })}
                      />
                    </SettingRow>

                    <SettingRow label="Sort By">
                      <select
                        value={settings.sortBy}
                        onChange={(e) => setSettings({ sortBy: e.target.value as 'updatedAt' | 'createdAt' | 'title' | 'size' })}
                        className="settings-select"
                      >
                        <option value="updatedAt">Last Modified</option>
                        <option value="createdAt">Created Date</option>
                        <option value="title">Title</option>
                        <option value="size">Size</option>
                      </select>
                    </SettingRow>

                    <SettingRow label="Sort Order">
                      <div className="flex gap-2">
                        {(['asc', 'desc'] as const).map((o) => (
                          <button
                            key={o}
                            onClick={() => setSettings({ sortOrder: o })}
                            className={cn(
                              'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                              settings.sortOrder === o
                                ? 'bg-brand-500 text-white'
                                : 'bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-400'
                            )}
                          >
                            {o === 'asc' ? 'Ascending' : 'Descending'}
                          </button>
                        ))}
                      </div>
                    </SettingRow>
                  </div>
                </div>
              )}

              {/* ── Shortcuts ─────────────────────────────── */}
              {activeTab === 'shortcuts' && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-surface-700 dark:text-surface-300 mb-3">Keyboard Shortcuts</h3>
                  <div className="space-y-1">
                    {SHORTCUTS.map((s, i) => (
                      <div key={i} className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-surface-50 dark:hover:bg-surface-800">
                        <span className="text-sm text-surface-700 dark:text-surface-300">{s.desc}</span>
                        <div className="flex items-center gap-1">
                          {s.keys.map((k, ki) => (
                            <kbd
                              key={ki}
                              className="px-1.5 py-0.5 text-xs bg-surface-100 dark:bg-surface-700 text-surface-600 dark:text-surface-300 rounded border border-surface-200 dark:border-surface-600 font-mono"
                            >
                              {k}
                            </kbd>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Data ─────────────────────────────────── */}
              {activeTab === 'data' && (
                <div className="space-y-5">
                  <h3 className="text-sm font-semibold text-surface-700 dark:text-surface-300">Export & Import</h3>

                  <div className="space-y-3">
                    <div className="p-4 rounded-xl border border-surface-200 dark:border-surface-700 space-y-3">
                      <h4 className="text-sm font-medium text-surface-700 dark:text-surface-300">Export Notes</h4>
                      <p className="text-xs text-surface-500">Download all your notes as a file.</p>
                      <div className="flex gap-2">
                        <button
                          onClick={handleExportAll}
                          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-brand-500 text-white text-sm font-medium hover:bg-brand-600 transition-colors"
                        >
                          <Download size={14} />
                          Export JSON
                        </button>
                        <button
                          onClick={handleExportMarkdown}
                          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface-100 dark:bg-surface-800 text-surface-700 dark:text-surface-300 text-sm font-medium hover:bg-surface-200 dark:hover:bg-surface-700 transition-colors"
                        >
                          <Download size={14} />
                          Export Markdown
                        </button>
                      </div>
                      <p className="text-xs text-surface-400">{notes.length} notes total</p>
                    </div>

                    <div className="p-4 rounded-xl border border-surface-200 dark:border-surface-700 space-y-3">
                      <h4 className="text-sm font-medium text-surface-700 dark:text-surface-300">Import Notes</h4>
                      <p className="text-xs text-surface-500">Import from a JSON export file.</p>
                      <label className="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface-100 dark:bg-surface-800 text-surface-700 dark:text-surface-300 text-sm font-medium hover:bg-surface-200 dark:hover:bg-surface-700 transition-colors cursor-pointer w-fit">
                        <Upload size={14} />
                        Choose File
                        <input type="file" accept=".json,.md" onChange={handleImport} className="hidden" />
                      </label>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function SettingRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-sm text-surface-700 dark:text-surface-300 flex-shrink-0">{label}</span>
      <div>{children}</div>
    </div>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none',
        checked ? 'bg-brand-500' : 'bg-surface-300 dark:bg-surface-600'
      )}
    >
      <span
        className={cn(
          'inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform',
          checked ? 'translate-x-4' : 'translate-x-1'
        )}
      />
    </button>
  );
}
