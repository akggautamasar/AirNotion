import { NextRequest, NextResponse } from 'next/server';
import { updateNoteInTelegram, deleteNoteFromTelegram } from '@/lib/telegram';
import type { Note } from '@/lib/types';

interface RouteParams {
  params: { id: string };
}

const getBotToken = (req: NextRequest): string =>
  req.headers.get('x-telegram-bot-token') || process.env.TELEGRAM_BOT_TOKEN || '';

const getChatId = (req: NextRequest): string =>
  req.headers.get('x-telegram-chat-id') || process.env.TELEGRAM_CHAT_ID || '';

/**
 * GET /api/notes/[id]
 * Returns the note ID — full note data lives in client cache.
 */
export async function GET(_req: NextRequest, { params }: RouteParams) {
  return NextResponse.json({ id: params.id });
}

/**
 * PUT /api/notes/[id]
 * Update a note in Telegram (delete old + send new).
 */
export async function PUT(req: NextRequest, { params }: RouteParams) {
  try {
    const body = await req.json() as Note;
    const token = getBotToken(req);
    const chatId = getChatId(req);

    if (!token || !chatId) {
      return NextResponse.json({ error: 'Telegram credentials not configured' }, { status: 400 });
    }

    if (body.id !== params.id) {
      return NextResponse.json({ error: 'ID mismatch' }, { status: 400 });
    }

    const newMessageId = await updateNoteInTelegram(token, chatId, body);
    return NextResponse.json({ note: { ...body, telegramMessageId: newMessageId } });
  } catch (err) {
    console.error(`PUT /api/notes/${params.id} error:`, err);
    return NextResponse.json({ error: 'Failed to update note' }, { status: 500 });
  }
}

/**
 * DELETE /api/notes/[id]
 * Delete a note from Telegram.
 */
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const { searchParams } = new URL(req.url);
    const messageIdStr = searchParams.get('messageId');
    const messageId = messageIdStr ? parseInt(messageIdStr, 10) : null;

    const token = getBotToken(req);
    const chatId = getChatId(req);

    if (!token || !chatId) {
      return NextResponse.json({ error: 'Telegram credentials not configured' }, { status: 400 });
    }

    if (messageId) {
      await deleteNoteFromTelegram(token, chatId, messageId);
    }

    return NextResponse.json({ success: true, id: params.id });
  } catch (err) {
    console.error(`DELETE /api/notes/${params.id} error:`, err);
    return NextResponse.json({ error: 'Failed to delete note' }, { status: 500 });
  }
}
