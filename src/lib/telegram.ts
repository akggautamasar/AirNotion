import type { Note, NotePayload } from './types';

const TELEGRAM_API = 'https://api.telegram.org/bot';
const NOTE_PREFIX = 'AIRNOTION_NOTE:';
const MAX_TEXT_LENGTH = 4000;

async function apiRequest(
  token: string,
  method: string,
  data?: Record<string, unknown>
): Promise<unknown> {
  const url = `${TELEGRAM_API}${token}/${method}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: data ? JSON.stringify(data) : undefined,
  });
  const result = await response.json();
  if (!result.ok) throw new Error(result.description || 'Telegram API error');
  return result.result;
}

async function apiRequestFormData(
  token: string,
  method: string,
  formData: FormData
): Promise<unknown> {
  const url = `${TELEGRAM_API}${token}/${method}`;
  const response = await fetch(url, {
    method: 'POST',
    body: formData,
  });
  const result = await response.json();
  if (!result.ok) throw new Error(result.description || 'Telegram API error');
  return result.result;
}

/**
 * Save a note to Telegram.
 * Notes ≤4000 chars are sent as text messages.
 * Larger notes are sent as JSON document files.
 */
export async function saveNoteToTelegram(
  token: string,
  chatId: string,
  note: NotePayload
): Promise<number> {
  const payload = JSON.stringify(note);
  const header = `${NOTE_PREFIX}${note.id}`;

  if (payload.length <= MAX_TEXT_LENGTH - header.length - 2) {
    // Send as plain text message
    const text = `${header}\n${payload}`;
    const result = (await apiRequest(token, 'sendMessage', {
      chat_id: chatId,
      text,
      disable_notification: true,
    })) as { message_id: number };
    return result.message_id;
  } else {
    // Send as document
    const blob = new Blob([payload], { type: 'application/json' });
    const formData = new FormData();
    formData.append('chat_id', chatId);
    formData.append('document', blob, `airnotion_${note.id}.json`);
    formData.append('caption', `${NOTE_PREFIX}${note.id}`);
    formData.append('disable_notification', 'true');

    const result = (await apiRequestFormData(token, 'sendDocument', formData)) as {
      message_id: number;
    };
    return result.message_id;
  }
}

/**
 * Fetch a single note by its Telegram message ID.
 * Returns null if the message is not found or not a valid note.
 */
export async function fetchNoteByMessageId(
  token: string,
  chatId: string,
  messageId: number
): Promise<Note | null> {
  try {
    // Use copyMessage trick to verify message exists, or use forwardMessage
    // We'll try to get the message text via a bot API workaround
    // Since getMessages isn't available in Bot API, we use a stored approach
    // Instead, we return null and rely on the local cache
    // This is a limitation of the Telegram Bot API
    void chatId;
    void messageId;
    return null;
  } catch {
    return null;
  }
}

/**
 * Parse a note from a Telegram message object
 */
function parseNoteFromMessage(message: {
  message_id: number;
  text?: string;
  caption?: string;
  document?: { file_id: string; file_name: string };
}): { note: Note; messageId: number } | null {
  try {
    // Check text messages
    if (message.text && message.text.startsWith(NOTE_PREFIX)) {
      const jsonPart = message.text.substring(message.text.indexOf('\n') + 1);
      const noteData = JSON.parse(jsonPart) as Note;
      return { note: noteData, messageId: message.message_id };
    }

    // Check document messages
    if (message.caption && message.caption.startsWith(NOTE_PREFIX) && message.document) {
      // Document notes are parsed after downloading the file
      return null; // Handled separately
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Download and parse a document note from Telegram
 */
export async function fetchDocumentNote(
  token: string,
  fileId: string,
  messageId: number
): Promise<{ note: Note; messageId: number } | null> {
  try {
    const fileInfo = (await apiRequest(token, 'getFile', { file_id: fileId })) as {
      file_path: string;
    };
    const fileUrl = `https://api.telegram.org/file/bot${token}/${fileInfo.file_path}`;
    const response = await fetch(fileUrl);
    const noteData = (await response.json()) as Note;
    return { note: noteData, messageId };
  } catch {
    return null;
  }
}

/**
 * Fetch notes using known message IDs from local index.
 * Since Bot API doesn't support getChatHistory, we rely on the local message ID index.
 * This method retrieves updates to find messages we don't have yet.
 */
export async function fetchAllNotes(token: string, chatId: string): Promise<Note[]> {
  const notes: Note[] = [];
  let offset = 0;
  const limit = 100;
  let hasMore = true;

  // Use getUpdates to find recent messages
  while (hasMore) {
    try {
      const updates = (await apiRequest(token, 'getUpdates', {
        offset,
        limit,
        timeout: 0,
        allowed_updates: ['message'],
      })) as Array<{
        update_id: number;
        message?: {
          message_id: number;
          chat: { id: number };
          text?: string;
          caption?: string;
          document?: { file_id: string; file_name: string };
        };
      }>;

      if (!updates || updates.length === 0) {
        hasMore = false;
        break;
      }

      for (const update of updates) {
        if (update.message && String(update.message.chat.id) === chatId) {
          const message = update.message;

          if (message.text && message.text.startsWith(NOTE_PREFIX)) {
            const parsed = parseNoteFromMessage(message);
            if (parsed) notes.push(parsed.note);
          } else if (
            message.caption &&
            message.caption.startsWith(NOTE_PREFIX) &&
            message.document
          ) {
            const docNote = await fetchDocumentNote(
              token,
              message.document.file_id,
              message.message_id
            );
            if (docNote) notes.push(docNote.note);
          }
        }
        offset = update.update_id + 1;
      }

      if (updates.length < limit) {
        hasMore = false;
      }
    } catch {
      hasMore = false;
    }
  }

  return notes;
}

/**
 * Update a note: delete old message and send new one.
 * Returns the new message ID.
 */
export async function updateNoteInTelegram(
  token: string,
  chatId: string,
  note: Note
): Promise<number> {
  // Delete old message if exists
  if (note.telegramMessageId) {
    try {
      await deleteNoteFromTelegram(token, chatId, note.telegramMessageId);
    } catch {
      // Ignore deletion errors (message might already be deleted)
    }
  }

  // Save as new message
  const payload: NotePayload = {
    id: note.id,
    title: note.title,
    content: note.content,
    plainText: note.plainText,
    tags: note.tags,
    folder: note.folder,
    pinned: note.pinned,
    archived: note.archived,
    color: note.color,
    createdAt: note.createdAt,
    updatedAt: note.updatedAt,
    wordCount: note.wordCount,
    charCount: note.charCount,
    linkedNotes: note.linkedNotes,
    backlinks: note.backlinks,
    template: note.template,
    coverImage: note.coverImage,
    icon: note.icon,
    status: note.status,
    dueDate: note.dueDate,
    reminder: note.reminder,
  };

  return saveNoteToTelegram(token, chatId, payload);
}

/**
 * Delete a note message from Telegram
 */
export async function deleteNoteFromTelegram(
  token: string,
  chatId: string,
  messageId: number
): Promise<void> {
  await apiRequest(token, 'deleteMessage', {
    chat_id: chatId,
    message_id: messageId,
  });
}

/**
 * Upload an image file to Telegram and return its URL
 */
export async function uploadImageToTelegram(
  token: string,
  chatId: string,
  file: File
): Promise<string> {
  const formData = new FormData();
  formData.append('chat_id', chatId);
  formData.append('photo', file);
  formData.append('disable_notification', 'true');

  const result = (await apiRequestFormData(token, 'sendPhoto', formData)) as {
    photo: Array<{ file_id: string }>;
  };

  // Get the largest photo
  const photos = result.photo;
  const largestPhoto = photos[photos.length - 1];

  return getTelegramFileUrl(token, largestPhoto.file_id);
}

/**
 * Get direct file URL from Telegram file ID
 */
export async function getTelegramFileUrl(token: string, fileId: string): Promise<string> {
  const fileInfo = (await apiRequest(token, 'getFile', { file_id: fileId })) as {
    file_path: string;
  };
  return `https://api.telegram.org/file/bot${token}/${fileInfo.file_path}`;
}

/**
 * Test Telegram connection by calling getMe
 */
export async function testTelegramConnection(token: string, chatId: string): Promise<boolean> {
  try {
    await apiRequest(token, 'getMe');
    // Also test that we can send to the chat
    const result = (await apiRequest(token, 'sendMessage', {
      chat_id: chatId,
      text: 'AirNotion connection test ✓',
      disable_notification: true,
    })) as { message_id: number };

    // Clean up the test message
    if (result.message_id) {
      try {
        await deleteNoteFromTelegram(token, chatId, result.message_id);
      } catch {
        // Ignore
      }
    }

    return true;
  } catch {
    return false;
  }
}
