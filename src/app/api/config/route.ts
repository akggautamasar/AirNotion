import { NextResponse } from 'next/server';

/**
 * GET /api/config
 * Tells the client whether server-side Telegram credentials are configured
 * via environment variables. The credentials themselves are never exposed.
 * Also used as the Render health-check endpoint.
 */
export async function GET() {
  const hasCredentials = Boolean(
    process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID
  );

  return NextResponse.json({
    ok: true,
    hasServerCredentials: hasCredentials,
  });
}
