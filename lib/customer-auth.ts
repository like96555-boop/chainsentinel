// 链哨 · 客户账号体系（注册/登录/会话）
// 安全：scrypt 密码哈希（零依赖）+ 随机 256-bit 会话令牌（存 SHA-256）+ HttpOnly Cookie
// 数据：data/customers.json（账号）、data/customer-sessions.json（会话）
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

export interface CustomerRecord {
  email: string;
  salt: string;
  hash: string;
  createdAt: number;
  lastLoginAt?: number;
}

interface SessionRecord {
  tokenHash: string; // 令牌的 SHA-256（不存明文）
  email: string;
  createdAt: number;
  expiresAt: number;
}

const DATA_DIR = path.join(process.cwd(), 'data');
const CUSTOMERS_FILE = path.join(DATA_DIR, 'customers.json');
const SESSIONS_FILE = path.join(DATA_DIR, 'customer-sessions.json');
const SESSION_TTL = 30 * 86_400_000; // 30 天

function readJson<T>(file: string, fallback: T): T {
  try {
    if (fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, 'utf8')) as T;
  } catch (e) {
    console.error('[customer-auth] 读取失败', file, e);
  }
  return fallback;
}

function writeJson(file: string, data: unknown): void {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
}

function hashPassword(password: string, salt: string): string {
  return crypto.scryptSync(password, salt, 64).toString('hex');
}

function sha256(s: string): string {
  return crypto.createHash('sha256').update(s).digest('hex');
}

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** 注册：成功返回 { ok: true, email }；失败 { ok: false, error } */
export function registerCustomer(email: string, password: string): { ok: true; email: string } | { ok: false; error: string } {
  const em = email.trim().toLowerCase();
  if (!EMAIL_RE.test(em)) return { ok: false, error: '邮箱格式不正确' };
  if (password.length < 8) return { ok: false, error: '密码至少 8 位' };
  const customers = readJson<CustomerRecord[]>(CUSTOMERS_FILE, []);
  if (customers.some((c) => c.email === em)) return { ok: false, error: '该邮箱已注册，请直接登录' };
  const salt = crypto.randomBytes(16).toString('hex');
  customers.push({ email: em, salt, hash: hashPassword(password, salt), createdAt: Date.now() });
  writeJson(CUSTOMERS_FILE, customers);
  return { ok: true, email: em };
}

/** 登录：成功返回会话令牌（明文仅返回一次） */
export function loginCustomer(email: string, password: string): { ok: true; token: string; email: string } | { ok: false; error: string } {
  const em = email.trim().toLowerCase();
  const customers = readJson<CustomerRecord[]>(CUSTOMERS_FILE, []);
  const c = customers.find((x) => x.email === em);
  if (!c) return { ok: false, error: '邮箱或密码错误' };
  const hash = hashPassword(password, c.salt);
  if (hash !== c.hash) return { ok: false, error: '邮箱或密码错误' };
  // 清理过期会话 + 新建会话
  const sessions = readJson<SessionRecord[]>(SESSIONS_FILE, []).filter((s) => s.expiresAt > Date.now());
  const token = crypto.randomBytes(32).toString('hex');
  sessions.push({ tokenHash: sha256(token), email: em, createdAt: Date.now(), expiresAt: Date.now() + SESSION_TTL });
  writeJson(SESSIONS_FILE, sessions);
  c.lastLoginAt = Date.now();
  writeJson(CUSTOMERS_FILE, customers);
  return { ok: true, token, email: em };
}

/** 注销 */
export function logoutCustomer(token: string): void {
  const sessions = readJson<SessionRecord[]>(SESSIONS_FILE, []).filter((s) => s.tokenHash !== sha256(token));
  writeJson(SESSIONS_FILE, sessions);
}

/** 校验会话：返回当前客户邮箱 */
export function customerOf(token: string | undefined | null): string | null {
  if (!token) return null;
  const sessions = readJson<SessionRecord[]>(SESSIONS_FILE, []);
  const s = sessions.find((x) => x.tokenHash === sha256(token) && x.expiresAt > Date.now());
  return s?.email || null;
}

/** 会话 cookie 名（HttpOnly） */
export const CUSTOMER_SESSION_COOKIE = 'cs_customer';
