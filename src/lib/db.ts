import type { Note, Folder, NoteColor } from '@/lib/types';
import { generateId } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TGUser {
  id: string;
  telegramId: number;
  username?: string;
  firstName: string;
  lastName?: string;
  createdAt: string;
  lastLogin: string;
}

// Metadata only — no content. Content lives exclusively in Telegram as a file.
export interface NoteIndex {
  id: string;
  title: string;
  tags: string[];
  folder: string;
  pinned: boolean;
  archived: boolean;
  color: NoteColor;
  status?: 'todo' | 'in-progress' | 'done';
  wordCount: number;
  charCount: number;
  updatedAt: string;
  createdAt: string;
  fileId: string; // Telegram file_id — used to download full content on demand
}

interface LoginCode {
  telegramId: number;
  expiresAt: number;
}

// Only metadata lives in memory. Content is fetched from Telegram when needed.
// This keeps Render memory usage minimal regardless of note count/size.
interface DbState {
  version: number;
  users: Record<string, TGUser>;             // telegramId -> user
  noteIndex: Record<string, Record<string, NoteIndex>>; // userId -> noteId -> meta
  folders: Record<string, Folder[]>;         // userId -> folders
  loginCodes: Record<string, LoginCode>;     // code -> entry
  indexMessageId?: number;
}

// ─── Telegram API helpers ─────────────────────────────────────────────────────

const TG_API = () => `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`;

async function tgRequest(method: string, data?: Record<string, unknown>): Promise<unknown> {
  const res = await fetch(`${TG_API()}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: data ? JSON.stringify(data) : undefined,
  });
  const json = await res.json() as { ok: boolean; result: unknown; description?: string };
  if (!json.ok) throw new Error(`Telegram ${method} error: ${json.description}`);
  return json.result;
}

async function sendMessage(
  chatId: number | string,
  text: string,
  parseMode?: 'Markdown' | 'HTML'
): Promise<{ message_id: number }> {
  const body: Record<string, unknown> = { chat_id: chatId, text, disable_notification: true };
  if (parseMode) body.parse_mode = parseMode;
  return tgRequest('sendMessage', body) as Promise<{ message_id: number }>;
}

async function sendDocument(
  chatId: number | string,
  blob: Blob,
  filename: string,
  caption: string
): Promise<{ message_id: number; document: { file_id: string } }> {
  const form = new FormData();
  form.append('chat_id', String(chatId));
  form.append('document', blob, filename);
  form.append('caption', caption);
  form.append('disable_notification', 'true');
  const res = await fetch(`${TG_API()}/sendDocument`, { method: 'POST', body: form });
  const json = await res.json() as { ok: boolean; result: { message_id: number; document: { file_id: string } }; description?: string };
  if (!json.ok) throw new Error(`Telegram sendDocument error: ${json.description}`);
  return json.result;
}

async function editMessageText(
  chatId: number | string,
  messageId: number,
  text: string
): Promise<void> {
  await tgRequest('editMessageText', { chat_id: chatId, message_id: messageId, text });
}

async function forwardMessage(
  fromChatId: number | string,
  toChatId: number | string,
  messageId: number
): Promise<{ message_id: number; text?: string }> {
  return tgRequest('forwardMessage', {
    from_chat_id: fromChatId,
    chat_id: toChatId,
    message_id: messageId,
    disable_notification: true,
  }) as Promise<{ message_id: number; text?: string }>;
}

async function deleteMessage(chatId: number | string, messageId: number): Promise<void> {
  try {
    await tgRequest('deleteMessage', { chat_id: chatId, message_id: messageId });
  } catch { /* ignore */ }
}

async function getFile(fileId: string): Promise<{ file_path: string }> {
  return tgRequest('getFile', { file_id: fileId }) as Promise<{ file_path: string }>;
}

export async function setWebhook(url: string): Promise<void> {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  const params: Record<string, unknown> = { url, allowed_updates: ['message'] };
  if (secret) params.secret_token = secret;
  await tgRequest('setWebhook', params);
}

// ─── DB Singleton ─────────────────────────────────────────────────────────────

declare global {
  // eslint-disable-next-line no-var
  var __airnotionDb: AirNotionDb | undefined;
}

class AirNotionDb {
  private state: DbState = {
    version: 1,
    users: {},
    noteIndex: {},
    folders: {},
    loginCodes: {},
  };
  private initialized = false;
  private initPromise: Promise<void> | null = null;

  private get chatId(): string {
    return process.env.TELEGRAM_CHAT_ID || '';
  }

  async ensureInit(): Promise<void> {
    if (this.initialized) return;
    if (this.initPromise) return this.initPromise;
    this.initPromise = this.init();
    return this.initPromise;
  }

  async init(): Promise<void> {
    if (!process.env.TELEGRAM_BOT_TOKEN || !process.env.TELEGRAM_CHAT_ID) {
      console.warn('[db] Telegram credentials not set — running with empty in-memory state');
      this.initialized = true;
      return;
    }

    const indexMsgId = process.env.TELEGRAM_INDEX_MSG_ID
      ? parseInt(process.env.TELEGRAM_INDEX_MSG_ID, 10)
      : null;

    if (indexMsgId) {
      try {
        const forwarded = await forwardMessage(this.chatId, this.chatId, indexMsgId);
        const text = forwarded.text || '';
        await deleteMessage(this.chatId, forwarded.message_id);

        const PREFIX = 'AIRNOTION_INDEX:';
        if (text.startsWith(PREFIX)) {
          const fileId = text.slice(PREFIX.length).trim();
          if (fileId) await this.loadStateFromFileId(fileId);
        }
        this.state.indexMessageId = indexMsgId;
      } catch (err) {
        console.error('[db] Failed to load state from Telegram index:', err);
        this.state.indexMessageId = indexMsgId;
      }
    } else {
      try {
        const msg = await sendMessage(this.chatId, 'AIRNOTION_INDEX:');
        this.state.indexMessageId = msg.message_id;
        console.log(`[db] Created index message. Set TELEGRAM_INDEX_MSG_ID=${msg.message_id}`);
      } catch (err) {
        console.error('[db] Failed to create index message:', err);
      }
    }

    this.initialized = true;
  }

  private async loadStateFromFileId(fileId: string): Promise<void> {
    try {
      const fileInfo = await getFile(fileId);
      const url = `https://api.telegram.org/file/bot${process.env.TELEGRAM_BOT_TOKEN}/${fileInfo.file_path}`;
      const res = await fetch(url);
      const data = await res.json() as Partial<DbState>;
      this.state = {
        ...this.state,
        version: data.version ?? 1,
        users: data.users ?? {},
        noteIndex: data.noteIndex ?? {},
        folders: data.folders ?? {},
        loginCodes: {},
      };
      console.log('[db] State (index only) restored from Telegram');
    } catch (err) {
      console.error('[db] Failed to load state from file:', err);
    }
  }

  // Save only the metadata index to Telegram — note content is NOT in memory
  async saveState(): Promise<void> {
    if (!process.env.TELEGRAM_BOT_TOKEN || !this.state.indexMessageId) return;
    try {
      const snapshot = {
        version: this.state.version,
        users: this.state.users,
        noteIndex: this.state.noteIndex,
        folders: this.state.folders,
      };
      const blob = new Blob([JSON.stringify(snapshot)], { type: 'application/json' });
      const result = await sendDocument(
        this.chatId,
        blob,
        `airnotion_index_${Date.now()}.json`,
        `AIRNOTION_STATE:${new Date().toISOString()}`
      );
      await editMessageText(
        this.chatId,
        this.state.indexMessageId,
        `AIRNOTION_INDEX:${result.document.file_id}`
      );
    } catch (err) {
      console.error('[db] Failed to save state to Telegram:', err);
    }
  }

  // ── OTP ───────────────────────────────────────────────────────────────────────

  generateOTP(telegramId: number): string {
    const now = Date.now();
    for (const [code, entry] of Object.entries(this.state.loginCodes)) {
      if (entry.expiresAt < now) delete this.state.loginCodes[code];
    }
    let code: string;
    let attempts = 0;
    do {
      code = String(Math.floor(100000 + Math.random() * 900000));
      attempts++;
    } while (this.state.loginCodes[code] && attempts < 20);

    this.state.loginCodes[code] = { telegramId, expiresAt: now + 5 * 60 * 1000 };
    return code;
  }

  verifyOTP(code: string): { valid: boolean; telegramId?: number } {
    const entry = this.state.loginCodes[code];
    if (!entry) return { valid: false };
    if (entry.expiresAt < Date.now()) {
      delete this.state.loginCodes[code];
      return { valid: false };
    }
    delete this.state.loginCodes[code];
    return { valid: true, telegramId: entry.telegramId };
  }

  // ── Users ─────────────────────────────────────────────────────────────────────

  getOrCreateUser(
    telegramId: number,
    username?: string,
    firstName?: string,
    lastName?: string
  ): TGUser {
    const existing = this.getUserByTelegramId(telegramId);
    if (existing) {
      existing.lastLogin = new Date().toISOString();
      if (username !== undefined) existing.username = username;
      if (firstName) existing.firstName = firstName;
      if (lastName !== undefined) existing.lastName = lastName;
      return existing;
    }
    const user: TGUser = {
      id: generateId(),
      telegramId,
      username,
      firstName: firstName || 'User',
      lastName,
      createdAt: new Date().toISOString(),
      lastLogin: new Date().toISOString(),
    };
    this.state.users[String(telegramId)] = user;
    return user;
  }

  getUserById(userId: string): TGUser | null {
    return Object.values(this.state.users).find((u) => u.id === userId) || null;
  }

  getUserByTelegramId(telegramId: number): TGUser | null {
    return this.state.users[String(telegramId)] || null;
  }

  // ── Notes (index only in memory, content in Telegram) ────────────────────────

  // Returns metadata list — content field will be empty string (fetched on demand)
  getNotesMeta(userId: string): NoteIndex[] {
    return Object.values(this.state.noteIndex[userId] || {});
  }

  getNoteIndex(userId: string, noteId: string): NoteIndex | null {
    return this.state.noteIndex[userId]?.[noteId] || null;
  }

  // Upload full note content to Telegram, store only metadata in memory
  async saveNote(userId: string, note: Note): Promise<NoteIndex> {
    const blob = new Blob([JSON.stringify(note)], { type: 'application/json' });
    const result = await sendDocument(
      this.chatId,
      blob,
      `note_${note.id}.json`,
      `AIRNOTION_NOTE:${userId}:${note.id}`
    );
    const fileId = result.document.file_id;

    const meta: NoteIndex = {
      id: note.id,
      title: note.title,
      tags: note.tags,
      folder: note.folder,
      pinned: note.pinned,
      archived: note.archived,
      color: note.color,
      status: note.status,
      wordCount: note.wordCount,
      charCount: note.charCount,
      updatedAt: note.updatedAt,
      createdAt: note.createdAt,
      fileId,
    };

    if (!this.state.noteIndex[userId]) this.state.noteIndex[userId] = {};
    this.state.noteIndex[userId][note.id] = meta;
    await this.saveState();
    return meta;
  }

  // Download full note content from Telegram on demand
  async getNote(userId: string, noteId: string): Promise<Note | null> {
    const meta = this.state.noteIndex[userId]?.[noteId];
    if (!meta) return null;
    try {
      const fileInfo = await getFile(meta.fileId);
      const url = `https://api.telegram.org/file/bot${process.env.TELEGRAM_BOT_TOKEN}/${fileInfo.file_path}`;
      const res = await fetch(url);
      return await res.json() as Note;
    } catch (err) {
      console.error('[db] Failed to download note content:', err);
      return null;
    }
  }

  async deleteNote(userId: string, noteId: string): Promise<void> {
    if (this.state.noteIndex[userId]) {
      delete this.state.noteIndex[userId][noteId];
    }
    await this.saveState();
  }

  // ── Folders ───────────────────────────────────────────────────────────────────

  getFolders(userId: string): Folder[] {
    return this.state.folders[userId] || [];
  }

  async saveFolders(userId: string, folders: Folder[]): Promise<void> {
    this.state.folders[userId] = folders;
    await this.saveState();
  }

  // ── OTP messaging ─────────────────────────────────────────────────────────────

  async sendOTPMessage(chatId: number, code: string): Promise<void> {
    await sendMessage(
      chatId,
      `🔐 Your AirNotion login code:\n\n*${code}*\n\nThis code expires in 5 minutes.`,
      'Markdown'
    );
  }
}

export const db: AirNotionDb =
  globalThis.__airnotionDb ?? (globalThis.__airnotionDb = new AirNotionDb());
