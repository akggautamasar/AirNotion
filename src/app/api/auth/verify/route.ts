import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createSession, getCookieOptions, COOKIE_NAME } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    await db.ensureInit();

    const body = await req.json() as { code?: string };
    const code = (body.code || '').trim();

    if (!code || code.length !== 6) {
      return NextResponse.json({ ok: false, error: 'Invalid code format' }, { status: 400 });
    }

    const result = db.verifyOTP(code);

    if (!result.valid || result.telegramId === undefined) {
      return NextResponse.json({ ok: false, error: 'Invalid or expired code' }, { status: 401 });
    }

    const user = db.getUserByTelegramId(result.telegramId);
    if (!user) {
      return NextResponse.json({ ok: false, error: 'User not found' }, { status: 401 });
    }

    const token = await createSession(user.id, user.telegramId, user.firstName);

    const response = NextResponse.json({
      ok: true,
      user: {
        id: user.id,
        telegramId: user.telegramId,
        firstName: user.firstName,
        lastName: user.lastName,
        username: user.username,
      },
    });

    const opts = getCookieOptions();
    response.cookies.set(COOKIE_NAME, token, opts);

    return response;
  } catch (err) {
    console.error('POST /api/auth/verify error:', err);
    return NextResponse.json({ ok: false, error: 'Server error' }, { status: 500 });
  }
}
