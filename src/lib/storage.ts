import type { Note, AppSettings, Folder, Tag } from './types';

const KEYS = {
  NOTES: 'airnotion_notes',
  MESSAGE_INDEX: 'airnotion_message_index',
  SETTINGS: 'airnotion_settings',
  FOLDERS: 'airnotion_folders',
  TAGS: 'airnotion_tags',
  DELETED_NOTES: 'airnotion_deleted_notes',
} as const;

const DEFAULT_SETTINGS: AppSettings = {
  theme: 'dark',
  viewMode: 'grid',
  sortBy: 'updatedAt',
  sortOrder: 'desc',
  sidebarOpen: true,
  focusMode: false,
  spellCheck: true,
  autoSave: true,
  autoSaveInterval: 2,
  defaultFolder: 'all',
  fontSize: 'base',
  fontFamily: 'sans',
  lineHeight: 'normal',
  showWordCount: true,
  showCharCount: false,
  telegramBotToken: '',
  telegramChatId: '',
  syncStatus: 'idle',
};

function safeGet<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const item = localStorage.getItem(key);
    if (!item) return fallback;
    return JSON.parse(item) as T;
  } catch {
    return fallback;
  }
}

function safeSet(key: string, value: unknown): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.error(`Failed to save ${key} to localStorage:`, err);
  }
}

export const storage = {
  getNotes(): Note[] {
    return safeGet<Note[]>(KEYS.NOTES, []);
  },

  setNotes(notes: Note[]): void {
    safeSet(KEYS.NOTES, notes);
  },

  getMessageIndex(): Record<string, number> {
    return safeGet<Record<string, number>>(KEYS.MESSAGE_INDEX, {});
  },

  setMessageIndex(index: Record<string, number>): void {
    safeSet(KEYS.MESSAGE_INDEX, index);
  },

  getSettings(): AppSettings {
    const saved = safeGet<Partial<AppSettings>>(KEYS.SETTINGS, {});
    return { ...DEFAULT_SETTINGS, ...saved };
  },

  setSettings(settings: Partial<AppSettings>): void {
    const current = this.getSettings();
    safeSet(KEYS.SETTINGS, { ...current, ...settings });
  },

  getFolders(): Folder[] {
    return safeGet<Folder[]>(KEYS.FOLDERS, []);
  },

  setFolders(folders: Folder[]): void {
    safeSet(KEYS.FOLDERS, folders);
  },

  getTags(): Tag[] {
    return safeGet<Tag[]>(KEYS.TAGS, []);
  },

  setTags(tags: Tag[]): void {
    safeSet(KEYS.TAGS, tags);
  },

  getDeletedNoteIds(): Set<string> {
    return new Set(safeGet<string[]>(KEYS.DELETED_NOTES, []));
  },

  addDeletedNoteId(id: string): void {
    const ids = this.getDeletedNoteIds();
    ids.add(id);
    safeSet(KEYS.DELETED_NOTES, Array.from(ids).slice(-2000));
  },

  removeDeletedNoteId(id: string): void {
    const ids = this.getDeletedNoteIds();
    ids.delete(id);
    safeSet(KEYS.DELETED_NOTES, Array.from(ids));
  },

  clearAll(): void {
    if (typeof window === 'undefined') return;
    Object.values(KEYS).forEach((key) => localStorage.removeItem(key));
  },

  getStorageSize(): number {
    if (typeof window === 'undefined') return 0;
    let total = 0;
    Object.values(KEYS).forEach((key) => {
      const item = localStorage.getItem(key);
      if (item) total += item.length * 2; // UTF-16 = 2 bytes per char
    });
    return total;
  },
};
