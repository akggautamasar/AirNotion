import type { Note, Folder } from '@/lib/types';
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

interface LoginCode {
  telegramId: number;
  expiresAt: number;
}

interface DbState {
  version: number;
  users: Record<string, TGUser>;
  notes: Record<string, Record<string, Note>>;
  folders: Record<string, Folder[]>;
  loginCodes: Record<string, LoginCode>;
  indexMessageId?: number;
}

// ─── Telegram API helpers ─────────────────────────────────────────────────────

const TG_API = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`;

async function tgRequest(method: string, data?: Record<string, unknown>): Promise<unknown> {
  const res = await fetch(`${TG_API}/${method}`, {
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
  const body: Record<string, unknown> = {
    chat_id: chatId,
    text,
    disable_notification: true,
  };
  if (parseMode) body.parse_mode = parseMode;
  return tgRequest('sendMessage', body) as Promise<{ message_id: number }>;
}

async function sendDocument(
  chatId: number | string,
  jsonBlob: Blob,
  filename: string,
  caption: string
): Promise<{ message_id: number; document: { file_id: string } }> {
  const formData = new FormData();
  formData.append('chat_id', String(chatId));
  formData.append('document', jsonBlob, filename);
  formData.append('caption', caption);
  formData.append('disable_notification', 'true');

  const res = await fetch(`${TG_API}/sendDocument`, { method: 'POST', body: formData });
  const json = await res.json() as { ok: boolean; result: { message_id: number; document: { file_id: string } }; description?: string };
  if (!json.ok) throw new Error(`Telegram sendDocument error: ${json.description}`);
  return json.result;
}

async function editMessageText(
  chatId: number | string,
  messageId: number,
  text: string
): Promise<void> {
  await tgRequest('editMessageText', {
    chat_id: chatId,
    message_id: messageId,
    text,
  });
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
  } catch {
    // Ignore deletion errors
  }
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
    notes: {},
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
      console.warn('[db] TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID not set — running with empty in-memory state');
      this.initialized = true;
      return;
    }

    const indexMsgId = process.env.TELEGRAM_INDEX_MSG_ID
      ? parseInt(process.env.TELEGRAM_INDEX_MSG_ID, 10)
      : null;

    if (indexMsgId) {
      try {
        // Forward the index message to ourselves to read its text
        const forwarded = await forwardMessage(this.chatId, this.chatId, indexMsgId);
        const text = forwarded.text || '';
        await deleteMessage(this.chatId, forwarded.message_id);

        const PREFIX = 'AIRNOTION_INDEX:';
        if (text.startsWith(PREFIX)) {
          const fileId = text.slice(PREFIX.length).trim();
          if (fileId) {
            await this.loadStateFromFileId(fileId);
          }
        }
        this.state.indexMessageId = indexMsgId;
      } catch (err) {
        console.error('[db] Failed to load state from Telegram index:', err);
        this.state.indexMessageId = indexMsgId;
      }
    } else {
      // Create a fresh index message
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
        notes: data.notes ?? {},
        folders: data.folders ?? {},
        loginCodes: {},
      };
      console.log('[db] State restored from Telegram');
    } catch (err) {
      console.error('[db] Failed to load state from file:', err);
    }
  }

  async saveState(): Promise<void> {
    if (!process.env.TELEGRAM_BOT_TOKEN || !this.state.indexMessageId) return;
    try {
      const snapshot = {
        version: this.state.version,
        users: this.state.users,
        notes: this.state.notes,
        folders: this.state.folders,
      };
      const json = JSON.stringify(snapshot);
      const blob = new Blob([json], { type: 'application/json' });
      const result = await sendDocument(
        this.chatId,
        blob,
        `airnotion_state_${Date.now()}.json`,
        `AIRNOTION_STATE:${new Date().toISOString()}`
      );
      const fileId = result.document.file_id;
      await editMessageText(this.chatId, this.state.indexMessageId, `AIRNOTION_INDEX:${fileId}`);
    } catch (err) {
      console.error('[db] Failed to save state to Telegram:', err);
    }
  }

  // ── OTP ──────────────────────────────────────────────────────────────────────

  generateOTP(telegramId: number): string {
    // Clean up expired codes
    const now = Date.now();
    for (const [code, entry] of Object.entries(this.state.loginCodes)) {
      if (entry.expiresAt < now) {
        delete this.state.loginCodes[code];
      }
    }

    // Generate unique 6-digit code
    let code: string;
    let attempts = 0;
    do {
      code = String(Math.floor(100000 + Math.random() * 900000));
      attempts++;
    } while (this.state.loginCodes[code] && attempts < 20);

    this.state.loginCodes[code] = {
      telegramId,
      expiresAt: now + 5 * 60 * 1000,
    };

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

  // ── Notes ─────────────────────────────────────────────────────────────────────

  getNotes(userId: string): Note[] {
    return Object.values(this.state.notes[userId] || {});
  }

  getNote(userId: string, noteId: string): Note | null {
    return this.state.notes[userId]?.[noteId] || null;
  }

  async saveNote(userId: string, note: Note): Promise<void> {
    if (!this.state.notes[userId]) {
      this.state.notes[userId] = {};
    }
    this.state.notes[userId][note.id] = note;
    await this.saveState();
  }

  async deleteNote(userId: string, noteId: string): Promise<void> {
    if (this.state.notes[userId]) {
      delete this.state.notes[userId][noteId];
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

  // ── Telegram messaging for auth ───────────────────────────────────────────────

  async sendOTPMessage(chatId: number, code: string): Promise<void> {
    await sendMessage(
      chatId,
      `🔐 Your AirNotion login code:\n\n*${code}*\n\nThis code expires in 5 minutes.`,
      'Markdown'
    );
  }
}

// Use globalThis to survive hot reloads in dev
export const db: AirNotionDb =
  globalThis.__airnotionDb ?? (globalThis.__airnotionDb = new AirNotionDb());
