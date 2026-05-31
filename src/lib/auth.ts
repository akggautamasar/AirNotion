import { SignJWT, jwtVerify } from 'jose';

const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'airnotion-dev-secret-change-in-production'
);

export const COOKIE_NAME = 'airnotion_session';
const EXPIRES_IN = '30d';

export async function createSession(
  userId: string,
  telegramId: number,
  firstName: string
): Promise<string> {
  return new SignJWT({ userId, telegramId, firstName })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(EXPIRES_IN)
    .sign(SECRET);
}

export async function verifySession(
  token: string
): Promise<{ userId: string; telegramId: number; firstName: string } | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET);
    if (
      typeof payload.userId === 'string' &&
      typeof payload.telegramId === 'number' &&
      typeof payload.firstName === 'string'
    ) {
      return {
        userId: payload.userId,
        telegramId: payload.telegramId,
        firstName: payload.firstName,
      };
    }
    return null;
  } catch {
    return null;
  }
}

export function getCookieOptions(): {
  httpOnly: true;
  secure: boolean;
  sameSite: 'lax';
  maxAge: number;
  path: '/';
} {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30, // 30 days in seconds
    path: '/',
  };
}
