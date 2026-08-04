import crypto from 'crypto';
import { getMasterKey } from './master-key';

const COOKIE_NAME = 'cs_admin';
const MAX_AGE_SEC = 2 * 60 * 60; // 2 小时

function sign(payload: string): string {
  return crypto.createHmac('sha256', getMasterKey()).update(payload).digest('hex');
}

export function createSessionToken(): string {
  const payload = Buffer.from(
    JSON.stringify({ role: 'admin', exp: Date.now() + MAX_AGE_SEC * 1000 })
  ).toString('base64url');
  return `${payload}.${sign(payload)}`;
}

export function verifySessionToken(token: string | undefined | null): boolean {
  if (!token) return false;
  const idx = token.lastIndexOf('.');
  if (idx <= 0) return false;
  const payload = token.slice(0, idx);
  const sig = token.slice(idx + 1);
  const expect = sign(payload);
  const a = Buffer.from(sig);
  const b = Buffer.from(expect);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return false;
  try {
    const obj = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    return obj.role === 'admin' && typeof obj.exp === 'number' && obj.exp > Date.now();
  } catch {
    return false;
  }
}

export function sessionCookieHeader(token: string): string {
  return `${COOKIE_NAME}=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${MAX_AGE_SEC}`;
}

export function clearSessionCookieHeader(): string {
  return `${COOKIE_NAME}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`;
}

export function isAuthed(req: Request): boolean {
  const cookie = req.headers.get('cookie') || '';
  const m = cookie.match(new RegExp(`(?:^|;\\s*)${COOKIE_NAME}=([^;]+)`));
  return verifySessionToken(m ? decodeURIComponent(m[1]) : null);
}

export function verifyAdminPassword(pw: string): boolean {
  const expect = process.env.ADMIN_PASSWORD || '';
  if (!expect) return false;
  const a = Buffer.from(pw);
  const b = Buffer.from(expect);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
