import { NextRequest, NextResponse } from 'next/server';
import { testTelegramConnection } from '@/lib/telegram';

/**
 * POST /api/telegram/test
 * Test Telegram bot connection.
 * Body: { botToken: string; chatId: string }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { botToken?: string; chatId?: string };
    const token = body.botToken || process.env.TELEGRAM_BOT_TOKEN || '';
    const chatId = body.chatId || process.env.TELEGRAM_CHAT_ID || '';

    if (!token || !chatId) {
      return NextResponse.json(
        { ok: false, error: 'Bot token and Chat ID are required' },
        { status: 400 }
      );
    }

    const ok = await testTelegramConnection(token, chatId);
    return NextResponse.json({ ok });
  } catch (err) {
    console.error('POST /api/telegram/test error:', err);
    return NextResponse.json({ ok: false, error: 'Connection test failed' }, { status: 500 });
  }
}

/**
 * GET /api/telegram/test
 * Quick health check using env credentials.
 */
export async function GET() {
  const token = process.env.TELEGRAM_BOT_TOKEN || '';
  const chatId = process.env.TELEGRAM_CHAT_ID || '';

  if (!token || !chatId) {
    return NextResponse.json({ ok: false, error: 'Telegram credentials not set in environment' });
  }

  try {
    const ok = await testTelegramConnection(token, chatId);
    return NextResponse.json({ ok });
  } catch {
    return NextResponse.json({ ok: false });
  }
}
