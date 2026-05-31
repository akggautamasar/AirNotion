export interface Note {
  id: string;
  title: string;
  content: string; // HTML content from TipTap
  plainText: string; // For search
  tags: string[];
  folder: string;
  pinned: boolean;
  archived: boolean;
  color: NoteColor;
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
  telegramMessageId?: number;
  wordCount: number;
  charCount: number;
  linkedNotes: string[]; // Note IDs this links to
  backlinks: string[]; // Note IDs that link to this
  template?: boolean;
  coverImage?: string;
  icon?: string;
  status?: 'todo' | 'in-progress' | 'done'; // for Kanban
  dueDate?: string;
  reminder?: string;
}

export type NoteColor =
  | 'default'
  | 'red'
  | 'orange'
  | 'yellow'
  | 'green'
  | 'teal'
  | 'blue'
  | 'purple'
  | 'pink'
  | 'brown'
  | 'gray';

export interface Folder {
  id: string;
  name: string;
  icon: string;
  color: string;
  parentId?: string;
  createdAt: string;
}

export interface Tag {
  id: string;
  name: string;
  color: string;
  count: number;
}

export type ViewMode = 'grid' | 'list' | 'kanban' | 'calendar';
export type ThemeMode = 'light' | 'dark' | 'system';
export type SortBy = 'updatedAt' | 'createdAt' | 'title' | 'size';
export type SortOrder = 'asc' | 'desc';

export interface AppSettings {
  theme: ThemeMode;
  viewMode: ViewMode;
  sortBy: SortBy;
  sortOrder: SortOrder;
  sidebarOpen: boolean;
  focusMode: boolean;
  spellCheck: boolean;
  autoSave: boolean;
  autoSaveInterval: number; // seconds
  defaultFolder: string;
  fontSize: 'sm' | 'base' | 'lg' | 'xl';
  fontFamily: 'sans' | 'serif' | 'mono';
  lineHeight: 'tight' | 'normal' | 'relaxed';
  showWordCount: boolean;
  showCharCount: boolean;
  telegramBotToken: string;
  telegramChatId: string;
  syncStatus: 'idle' | 'syncing' | 'success' | 'error';
  lastSynced?: string;
}

export interface SearchResult {
  note: Note;
  matches: { field: string; snippet: string }[];
  score: number;
}

export interface TelegramMessage {
  message_id: number;
  text?: string;
  document?: { file_id: string; file_name: string };
  date: number;
}

export interface NotePayload {
  id: string;
  title: string;
  content: string;
  plainText: string;
  tags: string[];
  folder: string;
  pinned: boolean;
  archived: boolean;
  color: NoteColor;
  createdAt: string;
  updatedAt: string;
  wordCount: number;
  charCount: number;
  linkedNotes: string[];
  backlinks: string[];
  template?: boolean;
  coverImage?: string;
  icon?: string;
  status?: 'todo' | 'in-progress' | 'done';
  dueDate?: string;
  reminder?: string;
}
