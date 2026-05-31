import { create } from 'zustand';
import Fuse from 'fuse.js';
import type {
  Note,
  Folder,
  Tag,
  AppSettings,
  SearchResult,
  NoteColor,
  ViewMode,
} from '@/lib/types';
import { storage } from '@/lib/storage';
import {
  generateId,
  extractPlainText,
  countWords,
  countChars,
  extractLinks,
} from '@/lib/utils';

// ─── Default values ──────────────────────────────────────────────────────────

function createDefaultNote(partial: Partial<Note> = {}): Note {
  const now = new Date().toISOString();
  return {
    id: generateId(),
    title: '',
    content: '',
    plainText: '',
    tags: [],
    folder: 'all',
    pinned: false,
    archived: false,
    color: 'default' as NoteColor,
    createdAt: now,
    updatedAt: now,
    wordCount: 0,
    charCount: 0,
    linkedNotes: [],
    backlinks: [],
    ...partial,
  };
}

// ─── Fuse instance ───────────────────────────────────────────────────────────

function buildFuse(notes: Note[]): Fuse<Note> {
  return new Fuse(notes, {
    keys: [
      { name: 'title', weight: 0.4 },
      { name: 'plainText', weight: 0.4 },
      { name: 'tags', weight: 0.2 },
    ],
    includeScore: true,
    includeMatches: true,
    threshold: 0.4,
    minMatchCharLength: 2,
  });
}

// ─── API helpers ──────────────────────────────────────────────────────────────
// All Telegram communication goes through Next.js API routes so the bot token
// stays on the server (env vars) and is never exposed to the browser.

function buildHeaders(settings: AppSettings): HeadersInit {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  // Only send user-supplied credentials if they entered them manually in settings.
  // When env vars are set on the server, API routes use those automatically.
  if (settings.telegramBotToken) headers['x-telegram-bot-token'] = settings.telegramBotToken;
  if (settings.telegramChatId) headers['x-telegram-chat-id'] = settings.telegramChatId;
  return headers;
}

async function apiPost(path: string, body: unknown, settings: AppSettings): Promise<Response> {
  return fetch(path, {
    method: 'POST',
    headers: buildHeaders(settings),
    body: JSON.stringify(body),
  });
}

async function apiPut(path: string, body: unknown, settings: AppSettings): Promise<Response> {
  return fetch(path, {
    method: 'PUT',
    headers: buildHeaders(settings),
    body: JSON.stringify(body),
  });
}

async function apiDelete(path: string, settings: AppSettings): Promise<Response> {
  return fetch(path, {
    method: 'DELETE',
    headers: buildHeaders(settings),
  });
}

// ─── Store interface ─────────────────────────────────────────────────────────

interface NotesStore {
  notes: Note[];
  folders: Folder[];
  tags: Tag[];
  settings: AppSettings;
  activeNoteId: string | null;
  selectedFolder: string;
  selectedTag: string | null;
  searchQuery: string;
  searchResults: SearchResult[];
  isSearchOpen: boolean;
  isSettingsOpen: boolean;
  isCommandPaletteOpen: boolean;
  viewMode: ViewMode;
  hasServerCredentials: boolean;

  // Note actions
  setActiveNote: (id: string | null) => void;
  fetchNoteContent: (id: string) => Promise<void>; // lazy-loads content from Telegram
  createNote: (partial?: Partial<Note>) => Promise<Note>;
  updateNote: (id: string, updates: Partial<Note>) => Promise<void>;
  deleteNote: (id: string) => Promise<void>;
  duplicateNote: (id: string) => Promise<Note>;
  pinNote: (id: string) => Promise<void>;
  archiveNote: (id: string) => Promise<void>;
  restoreNote: (id: string) => Promise<void>;
  setNoteColor: (id: string, color: NoteColor) => Promise<void>;
  setNoteStatus: (id: string, status: Note['status']) => Promise<void>;
  moveNoteToFolder: (noteId: string, folderId: string) => Promise<void>;
  copyNoteToFolder: (noteId: string, folderId: string) => Promise<void>;
  setNoteLock: (id: string, pin: string | null) => Promise<void>;

  // Folder actions
  createFolder: (name: string, icon?: string, color?: string, parentId?: string) => void;
  updateFolder: (id: string, updates: Partial<Folder>) => void;
  deleteFolder: (id: string) => void;
  setSelectedFolder: (id: string) => void;

  // Tag actions
  setSelectedTag: (tag: string | null) => void;

  // Sync
  syncWithTelegram: () => Promise<void>;
  loadFromCache: () => void;
  loadFromServer: () => Promise<void>;
  checkServerCredentials: () => Promise<void>;

  // Settings
  setSettings: (updates: Partial<AppSettings>) => void;

  // UI
  setSearchQuery: (q: string) => void;
  openSearch: () => void;
  closeSearch: () => void;
  openSettings: () => void;
  closeSettings: () => void;
  openCommandPalette: () => void;
  closeCommandPalette: () => void;
  setViewMode: (mode: ViewMode) => void;

  // Derived
  performSearch: (q: string) => SearchResult[];
  getFilteredNotes: () => Note[];
  getNotesByFolder: (folderId: string) => Note[];
  getNotesByTag: (tag: string) => Note[];
  getBacklinks: (noteId: string) => Note[];
  computeTags: () => void;
}

// ─── Helper: update backlinks ─────────────────────────────────────────────────

function recomputeBacklinks(notes: Note[]): Note[] {
  const updated = notes.map((n) => ({ ...n, backlinks: [] as string[] }));
  for (const note of updated) {
    for (const linkedId of note.linkedNotes) {
      const target = updated.find((n) => n.id === linkedId);
      if (target && !target.backlinks.includes(note.id)) {
        target.backlinks.push(note.id);
      }
    }
  }
  return updated;
}

// ─── Helper: compute tags ────────────────────────────────────────────────────

function computeTagsFromNotes(notes: Note[]): Tag[] {
  const tagMap: Record<string, number> = {};
  for (const note of notes) {
    if (!note.archived) {
      for (const tag of note.tags) {
        tagMap[tag] = (tagMap[tag] || 0) + 1;
      }
    }
  }
  const TAG_COLORS = [
    '#6366f1', '#8b5cf6', '#ec4899', '#f59e0b',
    '#10b981', '#3b82f6', '#ef4444', '#14b8a6',
  ];
  return Object.entries(tagMap).map(([name, count], i) => ({
    id: name,
    name,
    color: TAG_COLORS[i % TAG_COLORS.length],
    count,
  }));
}

// ─── Store implementation ────────────────────────────────────────────────────

export const useNotesStore = create<NotesStore>((set, get) => ({
  notes: [],
  folders: [],
  tags: [],
  settings: storage.getSettings(),
  activeNoteId: null,
  selectedFolder: 'all',
  selectedTag: null,
  searchQuery: '',
  searchResults: [],
  isSearchOpen: false,
  isSettingsOpen: false,
  isCommandPaletteOpen: false,
  viewMode: 'grid',
  hasServerCredentials: false,

  // ── Note actions ──────────────────────────────────────────────────────────

  setActiveNote: (id) => set({ activeNoteId: id }),

  // Fetch full note content from Telegram via the API (content is not stored in server RAM)
  fetchNoteContent: async (id) => {
    const existing = get().notes.find((n) => n.id === id);
    if (!existing || existing.content !== '') return; // already loaded
    try {
      const res = await fetch(`/api/notes/${id}`);
      if (!res.ok) return;
      const { note } = await res.json() as { note: Note };
      const notes = get().notes.map((n) => n.id === id ? { ...n, ...note } : n);
      set({ notes });
      storage.setNotes(notes);
    } catch (err) {
      console.error('fetchNoteContent failed:', err);
    }
  },

  createNote: async (partial = {}) => {
    const { settings, notes, selectedFolder } = get();
    const folderForNote = (selectedFolder && !['all', 'starred', 'archived'].includes(selectedFolder))
      ? selectedFolder
      : (settings.defaultFolder || 'all');
    const note = createDefaultNote({
      folder: folderForNote,
      ...partial,
    });

    const updatedNotes = [...notes, note];
    const withBacklinks = recomputeBacklinks(updatedNotes);
    set({ notes: withBacklinks, activeNoteId: note.id });
    storage.setNotes(withBacklinks);
    get().computeTags();

    // Sync via API route (server uses env vars; client sends manual creds as headers)
    const hasAnyCredentials =
      get().hasServerCredentials || (settings.telegramBotToken && settings.telegramChatId);
    if (hasAnyCredentials) {
      try {
        const res = await apiPost('/api/notes', note, settings);
        if (res.ok) {
          const { messageId } = await res.json();
          if (messageId) {
            const idx = storage.getMessageIndex();
            idx[note.id] = messageId;
            storage.setMessageIndex(idx);
            const finalNotes = get().notes.map((n) =>
              n.id === note.id ? { ...n, telegramMessageId: messageId } : n
            );
            set({ notes: finalNotes });
            storage.setNotes(finalNotes);
          }
        }
      } catch (err) {
        console.error('Failed to sync new note to Telegram:', err);
      }
    }

    return note;
  },

  updateNote: async (id, updates) => {
    const { notes, settings } = get();
    const existing = notes.find((n) => n.id === id);
    if (!existing) return;

    const now = new Date().toISOString();
    const plainText =
      updates.content !== undefined ? extractPlainText(updates.content) : existing.plainText;
    const linkedNotes =
      updates.content !== undefined ? extractLinks(updates.content) : existing.linkedNotes;
    const wordCount =
      updates.content !== undefined ? countWords(plainText) : existing.wordCount;
    const charCount =
      updates.content !== undefined ? countChars(plainText) : existing.charCount;

    const updatedNote: Note = {
      ...existing,
      ...updates,
      plainText,
      linkedNotes,
      wordCount,
      charCount,
      updatedAt: now,
    };

    const updatedNotes = notes.map((n) => (n.id === id ? updatedNote : n));
    const withBacklinks = recomputeBacklinks(updatedNotes);
    set({ notes: withBacklinks });
    storage.setNotes(withBacklinks);
    get().computeTags();

    const hasAnyCredentials =
      get().hasServerCredentials || (settings.telegramBotToken && settings.telegramChatId);
    if (hasAnyCredentials) {
      try {
        set((state) => ({
          settings: { ...state.settings, syncStatus: 'syncing' },
        }));
        const res = await apiPut(`/api/notes/${id}`, updatedNote, settings);
        if (res.ok) {
          const data = await res.json();
          const newMsgId = data?.note?.telegramMessageId;
          if (newMsgId) {
            const idx = storage.getMessageIndex();
            idx[id] = newMsgId;
            storage.setMessageIndex(idx);
            const finalNotes = get().notes.map((n) =>
              n.id === id ? { ...n, telegramMessageId: newMsgId } : n
            );
            set({ notes: finalNotes });
            storage.setNotes(finalNotes);
          }
          const now2 = new Date().toISOString();
          set((state) => ({
            settings: { ...state.settings, syncStatus: 'success', lastSynced: now2 },
          }));
          storage.setSettings({ syncStatus: 'success', lastSynced: now2 });
        }
      } catch (err) {
        console.error('Failed to sync updated note to Telegram:', err);
        set((state) => ({
          settings: { ...state.settings, syncStatus: 'error' },
        }));
      }
    }
  },

  deleteNote: async (id) => {
    const { notes, settings } = get();
    const note = notes.find((n) => n.id === id);
    if (!note) return;

    const updatedNotes = notes.filter((n) => n.id !== id);
    const withBacklinks = recomputeBacklinks(updatedNotes);
    set({
      notes: withBacklinks,
      activeNoteId: get().activeNoteId === id ? null : get().activeNoteId,
    });
    storage.setNotes(withBacklinks);
    storage.addDeletedNoteId(id); // prevent mergeNotes from re-adding
    get().computeTags();

    const idx = storage.getMessageIndex();
    delete idx[id];
    storage.setMessageIndex(idx);

    // Always call server delete when credentials exist — msgId not needed server-side
    const hasAnyCredentials =
      get().hasServerCredentials || (settings.telegramBotToken && settings.telegramChatId);
    if (hasAnyCredentials) {
      try {
        await apiDelete(`/api/notes/${id}`, settings);
      } catch (err) {
        console.error('Failed to delete note from Telegram:', err);
      }
    }
  },

  duplicateNote: async (id) => {
    const { notes } = get();
    const original = notes.find((n) => n.id === id);
    if (!original) throw new Error('Note not found');

    const now = new Date().toISOString();
    const duplicate: Note = {
      ...original,
      id: generateId(),
      title: original.title ? `${original.title} (copy)` : 'Copy',
      createdAt: now,
      updatedAt: now,
      telegramMessageId: undefined,
      pinned: false,
      backlinks: [],
    };

    const updatedNotes = [...notes, duplicate];
    set({ notes: updatedNotes, activeNoteId: duplicate.id });
    storage.setNotes(updatedNotes);

    const { settings } = get();
    const hasAnyCredentials =
      get().hasServerCredentials || (settings.telegramBotToken && settings.telegramChatId);
    if (hasAnyCredentials) {
      try {
        const res = await apiPost('/api/notes', duplicate, settings);
        if (res.ok) {
          const { messageId } = await res.json();
          if (messageId) {
            const idx = storage.getMessageIndex();
            idx[duplicate.id] = messageId;
            storage.setMessageIndex(idx);
          }
        }
      } catch (err) {
        console.error('Failed to sync duplicated note:', err);
      }
    }

    return duplicate;
  },

  pinNote: async (id) => {
    const note = get().notes.find((n) => n.id === id);
    if (!note) return;
    await get().updateNote(id, { pinned: !note.pinned });
  },

  archiveNote: async (id) => {
    const note = get().notes.find((n) => n.id === id);
    if (!note) return;
    await get().updateNote(id, { archived: true });
    if (get().activeNoteId === id) set({ activeNoteId: null });
  },

  restoreNote: async (id) => {
    await get().updateNote(id, { archived: false });
  },

  setNoteColor: async (id, color) => {
    await get().updateNote(id, { color });
  },

  setNoteStatus: async (id, status) => {
    await get().updateNote(id, { status });
  },

  moveNoteToFolder: async (noteId, folderId) => {
    await get().updateNote(noteId, { folder: folderId });
  },

  copyNoteToFolder: async (noteId, folderId) => {
    const { notes, settings } = get();
    const original = notes.find((n) => n.id === noteId);
    if (!original) return;
    const now = new Date().toISOString();
    const copy: Note = {
      ...original,
      id: generateId(),
      folder: folderId,
      title: original.title ? `${original.title} (copy)` : 'Copy',
      createdAt: now,
      updatedAt: now,
      telegramMessageId: undefined,
      pinned: false,
      backlinks: [],
    };
    const updatedNotes = [...notes, copy];
    const withBacklinks = recomputeBacklinks(updatedNotes);
    set({ notes: withBacklinks });
    storage.setNotes(withBacklinks);
    get().computeTags();
    const hasAnyCredentials = get().hasServerCredentials || (settings.telegramBotToken && settings.telegramChatId);
    if (hasAnyCredentials) {
      try {
        await apiPost('/api/notes', copy, settings);
      } catch (err) {
        console.error('Failed to sync copied note:', err);
      }
    }
  },

  setNoteLock: async (id, pin) => {
    await get().updateNote(id, { locked: pin !== null, lockPin: pin ?? undefined });
  },

  // ── Folder actions ─────────────────────────────────────────────────────────

  createFolder: (name, icon = '📁', color = '#6366f1', parentId?: string) => {
    const folder: Folder = {
      id: generateId(),
      name,
      icon,
      color,
      ...(parentId ? { parentId } : {}),
      createdAt: new Date().toISOString(),
    };
    const folders = [...get().folders, folder];
    set({ folders });
    storage.setFolders(folders);
  },

  updateFolder: (id, updates) => {
    const folders = get().folders.map((f) => (f.id === id ? { ...f, ...updates } : f));
    set({ folders });
    storage.setFolders(folders);
  },

  deleteFolder: (id) => {
    const folders = get().folders.filter((f) => f.id !== id);
    const notes = get().notes.map((n) => (n.folder === id ? { ...n, folder: 'all' } : n));
    set({ folders, notes });
    storage.setFolders(folders);
    storage.setNotes(notes);
    if (get().selectedFolder === id) set({ selectedFolder: 'all' });
  },

  setSelectedFolder: (id) => set({ selectedFolder: id, selectedTag: null }),

  // ── Tag actions ────────────────────────────────────────────────────────────

  setSelectedTag: (tag) => set({ selectedTag: tag, selectedFolder: 'all' }),

  // ── Sync ───────────────────────────────────────────────────────────────────

  checkServerCredentials: async () => {
    try {
      const res = await fetch('/api/config');
      if (res.ok) {
        const data = await res.json() as { hasServerCredentials: boolean; authenticated: boolean };
        set({ hasServerCredentials: Boolean(data.hasServerCredentials) });
        if (data.authenticated) {
          await get().loadFromServer();
        }
      }
    } catch {
      // ignore — stays false
    }
  },

  loadFromServer: async () => {
    try {
      const res = await fetch('/api/notes');
      if (!res.ok) return;
      const { notes: remoteNotes } = await res.json() as { notes: Note[] };
      if (remoteNotes && remoteNotes.length > 0) {
        const localNotes = get().notes;
        const merged = mergeNotes(localNotes, remoteNotes);
        const withBacklinks = recomputeBacklinks(merged);
        set({ notes: withBacklinks });
        storage.setNotes(withBacklinks);
        get().computeTags();
      }
    } catch (err) {
      console.error('loadFromServer failed:', err);
    }
  },

  syncWithTelegram: async () => {
    const { settings, hasServerCredentials } = get();
    const hasAnyCredentials =
      hasServerCredentials || (settings.telegramBotToken && settings.telegramChatId);
    if (!hasAnyCredentials) return;

    set((state) => ({
      settings: { ...state.settings, syncStatus: 'syncing' },
    }));

    try {
      // API route handles fetching from Telegram using server env vars
      const headers = buildHeaders(settings);
      const res = await fetch('/api/notes', { headers });
      if (res.ok) {
        const { notes: remoteNotes } = await res.json() as { notes: Note[] };
        if (remoteNotes && remoteNotes.length > 0) {
          const localNotes = get().notes;
          const merged = mergeNotes(localNotes, remoteNotes);
          const withBacklinks = recomputeBacklinks(merged);
          set({ notes: withBacklinks });
          storage.setNotes(withBacklinks);
          get().computeTags();
        }
      }

      const now = new Date().toISOString();
      set((state) => ({
        settings: { ...state.settings, syncStatus: 'success', lastSynced: now },
      }));
      storage.setSettings({ syncStatus: 'success', lastSynced: now });
    } catch (err) {
      console.error('Telegram sync failed:', err);
      set((state) => ({
        settings: { ...state.settings, syncStatus: 'error' },
      }));
    }
  },

  loadFromCache: () => {
    const notes = storage.getNotes();
    const folders = storage.getFolders();
    const tags = storage.getTags();
    const settings = storage.getSettings();
    const withBacklinks = recomputeBacklinks(notes);
    set({ notes: withBacklinks, folders, tags, settings });
  },

  // ── Settings ───────────────────────────────────────────────────────────────

  setSettings: (updates) => {
    const settings = { ...get().settings, ...updates };
    set({ settings });
    storage.setSettings(updates);
    if (updates.viewMode) set({ viewMode: updates.viewMode });
  },

  // ── UI ─────────────────────────────────────────────────────────────────────

  setSearchQuery: (q) => {
    const results = q ? get().performSearch(q) : [];
    set({ searchQuery: q, searchResults: results });
  },

  openSearch: () => set({ isSearchOpen: true }),
  closeSearch: () => set({ isSearchOpen: false, searchQuery: '', searchResults: [] }),

  openSettings: () => set({ isSettingsOpen: true }),
  closeSettings: () => set({ isSettingsOpen: false }),

  openCommandPalette: () => set({ isCommandPaletteOpen: true }),
  closeCommandPalette: () => set({ isCommandPaletteOpen: false }),

  setViewMode: (mode) => {
    set({ viewMode: mode });
    get().setSettings({ viewMode: mode });
  },

  // ── Derived ────────────────────────────────────────────────────────────────

  performSearch: (q) => {
    const { notes } = get();
    const fuse = buildFuse(notes.filter((n) => !n.archived));
    const results = fuse.search(q);
    return results.map((r) => ({
      note: r.item,
      score: r.score ?? 1,
      matches: (r.matches || []).map((m) => ({
        field: m.key || '',
        snippet: Array.isArray(m.value) ? m.value.join(', ') : (m.value || ''),
      })),
    }));
  },

  getFilteredNotes: () => {
    const { notes, selectedFolder, selectedTag, settings } = get();
    let filtered = notes.filter((n) => !n.archived);

    if (selectedFolder === 'starred') {
      filtered = filtered.filter((n) => n.pinned);
    } else if (selectedFolder === 'archived') {
      filtered = notes.filter((n) => n.archived);
    } else if (selectedFolder !== 'all') {
      filtered = filtered.filter((n) => n.folder === selectedFolder);
    }

    if (selectedTag) {
      filtered = filtered.filter((n) => n.tags.includes(selectedTag));
    }

    filtered.sort((a, b) => {
      let valA: string | number = '';
      let valB: string | number = '';
      switch (settings.sortBy) {
        case 'title':
          valA = a.title.toLowerCase();
          valB = b.title.toLowerCase();
          break;
        case 'createdAt':
          valA = a.createdAt;
          valB = b.createdAt;
          break;
        case 'size':
          valA = a.charCount;
          valB = b.charCount;
          break;
        default:
          valA = a.updatedAt;
          valB = b.updatedAt;
      }
      if (valA < valB) return settings.sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return settings.sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    if (selectedFolder !== 'starred') {
      filtered.sort((a, b) => {
        if (a.pinned && !b.pinned) return -1;
        if (!a.pinned && b.pinned) return 1;
        return 0;
      });
    }

    return filtered;
  },

  getNotesByFolder: (folderId) =>
    get().notes.filter((n) => !n.archived && n.folder === folderId),

  getNotesByTag: (tag) =>
    get().notes.filter((n) => !n.archived && n.tags.includes(tag)),

  getBacklinks: (noteId) => {
    const { notes } = get();
    const note = notes.find((n) => n.id === noteId);
    if (!note) return [];
    return notes.filter((n) => note.backlinks.includes(n.id));
  },

  computeTags: () => {
    const tags = computeTagsFromNotes(get().notes);
    set({ tags });
    storage.setTags(tags);
  },
}));

// ─── Note merge helper ────────────────────────────────────────────────────────

function mergeNotes(local: Note[], remote: Note[]): Note[] {
  const deletedIds = storage.getDeletedNoteIds();
  const map = new Map<string, Note>();
  for (const note of local) {
    if (!deletedIds.has(note.id)) map.set(note.id, note);
  }
  for (const note of remote) {
    if (deletedIds.has(note.id)) continue; // never re-add explicitly deleted notes
    const existing = map.get(note.id);
    if (!existing || note.updatedAt > existing.updatedAt) {
      map.set(note.id, note);
    }
  }
  return Array.from(map.values());
}
