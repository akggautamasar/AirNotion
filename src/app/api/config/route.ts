import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/config
 * Tells the client whether server-side credentials are configured.
 * Also used as the Render health-check endpoint.
 */
export async function GET(req: NextRequest) {
  const hasCredentials = Boolean(
    process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID
  );

  const userId = req.headers.get('x-user-id');
  const authenticated = Boolean(userId);

  return NextResponse.json({
    ok: true,
    hasServerCredentials: hasCredentials,
    authenticated,
  });
}
