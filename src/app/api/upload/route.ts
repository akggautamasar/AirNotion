import { NextRequest, NextResponse } from 'next/server';
import { uploadImageToTelegram } from '@/lib/telegram';

/**
 * POST /api/upload
 * Upload an image file to Telegram and return its URL.
 * Expects multipart/form-data with an "image" field.
 */
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('image') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No image file provided' }, { status: 400 });
    }

    const token = req.headers.get('x-telegram-bot-token') || process.env.TELEGRAM_BOT_TOKEN || '';
    const chatId = req.headers.get('x-telegram-chat-id') || process.env.TELEGRAM_CHAT_ID || '';

    if (!token || !chatId) {
      // Fall back to base64 data URL when Telegram is not configured
      const buffer = await file.arrayBuffer();
      const base64 = Buffer.from(buffer).toString('base64');
      const mimeType = file.type || 'image/jpeg';
      const dataUrl = `data:${mimeType};base64,${base64}`;
      return NextResponse.json({ url: dataUrl });
    }

    const url = await uploadImageToTelegram(token, chatId, file);
    return NextResponse.json({ url });
  } catch (err) {
    console.error('POST /api/upload error:', err);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
