import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

interface TelegramUser {
  id: number;
  username?: string;
  first_name: string;
  last_name?: string;
}

interface TelegramMessage {
  message_id: number;
  from?: TelegramUser;
  chat: { id: number };
  text?: string;
}

interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
}

export async function POST(req: NextRequest) {
  try {
    // Verify webhook secret if configured
    const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
    if (webhookSecret) {
      const secretHeader = req.headers.get('x-telegram-bot-api-secret-token');
      if (secretHeader !== webhookSecret) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    await db.ensureInit();

    const update = await req.json() as TelegramUpdate;
    const message = update.message;

    if (!message || !message.from) {
      return NextResponse.json({ ok: true });
    }

    const { id: telegramId, username, first_name, last_name } = message.from;
    const chatId = message.chat.id;
    const text = (message.text || '').trim();

    if (text === '/start' || text === '/login') {
      // Upsert user
      db.getOrCreateUser(telegramId, username, first_name, last_name);

      // Generate OTP
      const code = db.generateOTP(telegramId);

      // Send OTP to user
      await db.sendOTPMessage(chatId, code);
    } else if (text === '/notes') {
      const user = db.getUserByTelegramId(telegramId);
      if (user) {
        const notes = db.getNotes(user.id);
        const count = notes.length;
        const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
        if (BOT_TOKEN) {
          await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              text: `You have ${count} note${count !== 1 ? 's' : ''} in AirNotion.`,
            }),
          });
        }
      } else {
        const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
        if (BOT_TOKEN) {
          await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              text: 'Please send /login first to set up your account.',
            }),
          });
        }
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('POST /api/telegram/webhook error:', err);
    // Always return 200 to Telegram to prevent retries
    return NextResponse.json({ ok: true });
  }
}
