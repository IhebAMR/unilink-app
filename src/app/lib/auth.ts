import * as jwt from 'jsonwebtoken';
import type { JwtPayload } from 'jsonwebtoken';
import { cookies } from 'next/headers';
import cookie from 'cookie';

const JWT_SECRET = process.env.JWT_SECRET;
const TOKEN_NAME = 'unilink_token';

if (!JWT_SECRET) {
  throw new Error('Please set JWT_SECRET in your environment (.env.local)');
}

const SECRET: jwt.Secret = JWT_SECRET as jwt.Secret;

/**
 * Sign a token (use at login or when issuing tokens).
 * Note: expiresIn is typed to jwt.SignOptions['expiresIn'] so it matches the library typing.
 */
export function signToken(data: object, expiresIn: jwt.SignOptions['expiresIn'] = '7d'): string {
  const options: jwt.SignOptions = { expiresIn };
  return jwt.sign(data as string | Buffer | object, SECRET, options);
}

/**
 * Verify a token and return the payload as JwtPayload or null if invalid.
 */
export function verifyToken(token: string): JwtPayload | null {
  try {
    const payload = jwt.verify(token, SECRET) as JwtPayload | string;
    if (typeof payload === 'string') return null;
    return payload as JwtPayload;
  } catch (err) {
    return null;
  }
}

/**
 * Read token from Next.js app-router cookies() helper and verify it.
 * Note: cookies() may be async depending on Next versions, so we await it.
 */
export async function getUserFromCookie(): Promise<(JwtPayload & { id?: string; email?: string; role?: string }) | null> {
  try {
    const cookieStore: any = await cookies();
    const tokenCookie = cookieStore.get ? cookieStore.get(TOKEN_NAME) : undefined;
    const token = tokenCookie?.value;
    if (!token) return null;
    return verifyToken(token) as (JwtPayload & { id?: string; email?: string; role?: string }) | null;
  } catch (err) {
    return null;
  }
}

/**
 * Read token from a Request object (route handlers that receive Request).
 * Use in app/api/* route handlers that accept `request: Request`.
 */
export function getUserFromRequest(req: Request): (JwtPayload & { id?: string; email?: string; role?: string }) | null {
  try {
    const cookieHeader = req.headers.get('cookie') || '';
    const parsed = cookie.parse(cookieHeader || '');
    const token = parsed[TOKEN_NAME] || null;
    if (!token) return null;
    return verifyToken(token) as (JwtPayload & { id?: string; email?: string; role?: string }) | null;
  } catch (err) {
    return null;
  }
}