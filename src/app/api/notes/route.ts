import { NextRequest, NextResponse } from 'next/server';
import { saveNoteToTelegram } from '@/lib/telegram';
import type { NotePayload } from '@/lib/types';

const getBotToken = (req: NextRequest): string => {
  return (
    req.headers.get('x-telegram-bot-token') ||
    process.env.TELEGRAM_BOT_TOKEN ||
    ''
  );
};

const getChatId = (req: NextRequest): string => {
  return (
    req.headers.get('x-telegram-chat-id') ||
    process.env.TELEGRAM_CHAT_ID ||
    ''
  );
};

/**
 * GET /api/notes
 * Returns an empty array — client manages its own cache.
 * Use POST /api/notes to create notes and sync.
 */
export async function GET() {
  return NextResponse.json({
    notes: [],
    message: 'Use the client-side store to access cached notes.',
  });
}

/**
 * POST /api/notes
 * Create a new note and save it to Telegram.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as NotePayload;
    const token = getBotToken(req);
    const chatId = getChatId(req);

    if (!token || !chatId) {
      return NextResponse.json(
        { error: 'Telegram credentials not configured' },
        { status: 400 }
      );
    }

    const messageId = await saveNoteToTelegram(token, chatId, body);
    return NextResponse.json({ note: body, messageId }, { status: 201 });
  } catch (err) {
    console.error('POST /api/notes error:', err);
    return NextResponse.json(
      { error: 'Failed to save note' },
      { status: 500 }
    );
  }
}
