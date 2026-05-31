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
import {
  saveNoteToTelegram,
  updateNoteInTelegram,
  deleteNoteFromTelegram,
  fetchAllNotes,
} from '@/lib/telegram';

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

  // Note actions
  setActiveNote: (id: string | null) => void;
  createNote: (partial?: Partial<Note>) => Promise<Note>;
  updateNote: (id: string, updates: Partial<Note>) => Promise<void>;
  deleteNote: (id: string) => Promise<void>;
  duplicateNote: (id: string) => Promise<Note>;
  pinNote: (id: string) => Promise<void>;
  archiveNote: (id: string) => Promise<void>;
  restoreNote: (id: string) => Promise<void>;
  setNoteColor: (id: string, color: NoteColor) => Promise<void>;
  setNoteStatus: (id: string, status: Note['status']) => Promise<void>;

  // Folder actions
  createFolder: (name: string, icon?: string, color?: string) => void;
  updateFolder: (id: string, updates: Partial<Folder>) => void;
  deleteFolder: (id: string) => void;
  setSelectedFolder: (id: string) => void;

  // Tag actions
  setSelectedTag: (tag: string | null) => void;

  // Sync
  syncWithTelegram: () => Promise<void>;
  loadFromCache: () => void;

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
  // Reset all backlinks
  const updated = notes.map((n) => ({ ...n, backlinks: [] as string[] }));

  // Rebuild from linkedNotes
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

  // ── Note actions ──────────────────────────────────────────────────────────

  setActiveNote: (id) => set({ activeNoteId: id }),

  createNote: async (partial = {}) => {
    const { settings, notes } = get();
    const note = createDefaultNote({
      folder: settings.defaultFolder || 'all',
      ...partial,
    });

    const updatedNotes = [...notes, note];
    const withBacklinks = recomputeBacklinks(updatedNotes);
    set({ notes: withBacklinks, activeNoteId: note.id });
    storage.setNotes(withBacklinks);
    get().computeTags();

    // Async sync to Telegram
    if (settings.telegramBotToken && settings.telegramChatId) {
      try {
        const msgId = await saveNoteToTelegram(
          settings.telegramBotToken,
          settings.telegramChatId,
          note
        );
        const idx = storage.getMessageIndex();
        idx[note.id] = msgId;
        storage.setMessageIndex(idx);

        // Update note with messageId
        const finalNotes = get().notes.map((n) =>
          n.id === note.id ? { ...n, telegramMessageId: msgId } : n
        );
        set({ notes: finalNotes });
        storage.setNotes(finalNotes);
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
      updates.content !== undefined
        ? extractPlainText(updates.content)
        : existing.plainText;
    const linkedNotes =
      updates.content !== undefined
        ? extractLinks(updates.content)
        : existing.linkedNotes;
    const wordCount =
      updates.content !== undefined
        ? countWords(plainText)
        : existing.wordCount;
    const charCount =
      updates.content !== undefined
        ? countChars(plainText)
        : existing.charCount;

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

    // Async sync to Telegram
    if (settings.telegramBotToken && settings.telegramChatId) {
      try {
        set((state) => ({
          settings: { ...state.settings, syncStatus: 'syncing' },
        }));
        const newMsgId = await updateNoteInTelegram(
          settings.telegramBotToken,
          settings.telegramChatId,
          updatedNote
        );
        const idx = storage.getMessageIndex();
        idx[id] = newMsgId;
        storage.setMessageIndex(idx);

        const finalNotes = get().notes.map((n) =>
          n.id === id ? { ...n, telegramMessageId: newMsgId } : n
        );
        set({
          notes: finalNotes,
          settings: {
            ...get().settings,
            syncStatus: 'success',
            lastSynced: new Date().toISOString(),
          },
        });
        storage.setNotes(finalNotes);
        storage.setSettings({ syncStatus: 'success', lastSynced: new Date().toISOString() });
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
    get().computeTags();

    // Remove from message index
    const idx = storage.getMessageIndex();
    const msgId = idx[id] || note.telegramMessageId;
    delete idx[id];
    storage.setMessageIndex(idx);

    // Async delete from Telegram
    if (settings.telegramBotToken && settings.telegramChatId && msgId) {
      try {
        await deleteNoteFromTelegram(
          settings.telegramBotToken,
          settings.telegramChatId,
          msgId
        );
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

    // Sync to Telegram
    const { settings } = get();
    if (settings.telegramBotToken && settings.telegramChatId) {
      try {
        const msgId = await saveNoteToTelegram(
          settings.telegramBotToken,
          settings.telegramChatId,
          duplicate
        );
        const idx = storage.getMessageIndex();
        idx[duplicate.id] = msgId;
        storage.setMessageIndex(idx);
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

  // ── Folder actions ─────────────────────────────────────────────────────────

  createFolder: (name, icon = '📁', color = '#6366f1') => {
    const folder: Folder = {
      id: generateId(),
      name,
      icon,
      color,
      createdAt: new Date().toISOString(),
    };
    const folders = [...get().folders, folder];
    set({ folders });
    storage.setFolders(folders);
  },

  updateFolder: (id, updates) => {
    const folders = get().folders.map((f) =>
      f.id === id ? { ...f, ...updates } : f
    );
    set({ folders });
    storage.setFolders(folders);
  },

  deleteFolder: (id) => {
    const folders = get().folders.filter((f) => f.id !== id);
    // Move notes in deleted folder to 'all'
    const notes = get().notes.map((n) =>
      n.folder === id ? { ...n, folder: 'all' } : n
    );
    set({ folders, notes });
    storage.setFolders(folders);
    storage.setNotes(notes);
    if (get().selectedFolder === id) set({ selectedFolder: 'all' });
  },

  setSelectedFolder: (id) => set({ selectedFolder: id, selectedTag: null }),

  // ── Tag actions ────────────────────────────────────────────────────────────

  setSelectedTag: (tag) => set({ selectedTag: tag, selectedFolder: 'all' }),

  // ── Sync ───────────────────────────────────────────────────────────────────

  syncWithTelegram: async () => {
    const { settings } = get();
    if (!settings.telegramBotToken || !settings.telegramChatId) return;

    set((state) => ({
      settings: { ...state.settings, syncStatus: 'syncing' },
    }));

    try {
      const telegramNotes = await fetchAllNotes(
        settings.telegramBotToken,
        settings.telegramChatId
      );

      if (telegramNotes.length > 0) {
        const localNotes = get().notes;
        const merged = mergeNotes(localNotes, telegramNotes);
        const withBacklinks = recomputeBacklinks(merged);
        set({ notes: withBacklinks });
        storage.setNotes(withBacklinks);
        get().computeTags();
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

    // Sort
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

    // Pinned notes always first (when not in starred view)
    if (selectedFolder !== 'starred') {
      filtered.sort((a, b) => {
        if (a.pinned && !b.pinned) return -1;
        if (!a.pinned && b.pinned) return 1;
        return 0;
      });
    }

    return filtered;
  },

  getNotesByFolder: (folderId) => {
    return get().notes.filter((n) => !n.archived && n.folder === folderId);
  },

  getNotesByTag: (tag) => {
    return get().notes.filter((n) => !n.archived && n.tags.includes(tag));
  },

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
  const map = new Map<string, Note>();

  // Add local notes
  for (const note of local) {
    map.set(note.id, note);
  }

  // Merge remote notes (newer wins)
  for (const note of remote) {
    const existing = map.get(note.id);
    if (!existing || note.updatedAt > existing.updatedAt) {
      map.set(note.id, note);
    }
  }

  return Array.from(map.values());
}
