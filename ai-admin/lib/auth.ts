import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

// 独立鉴权：读取项目根 .env 的 AI_ADMIN_PASSWORD（未设置则拒绝配置写入）
// 注意：Next 生产构建中 __dirname 指向 .next 内部，必须用 process.cwd()（next start 时 cwd=ai-admin/）
const ROOT_ENV = path.join(process.cwd(), '..', '.env');
const COOKIE_NAME = 'ai_admin';

export function loadRootEnv(): Record<string, string> {
  const out: Record<string, string> = {};
  try {
    if (fs.existsSync(ROOT_ENV)) {
      for (const line of fs.readFileSync(ROOT_ENV, 'utf8').split(/\r?\n/)) {
        const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
        if (m) out[m[1]] = m[2].trim();
      }
    }
  } catch {
    /* ignore */
  }
  return out;
}

const ENV = loadRootEnv();
export const AI_ADMIN_PASSWORD = ENV.AI_ADMIN_PASSWORD || '';

function secret(): string {
  return AI_ADMIN_PASSWORD || 'ai-admin-dev-secret';
}

function sign(payload: string): string {
  return crypto.createHmac('sha256', secret()).update(payload).digest('hex');
}

export function createToken(): string {
  const payload = Buffer.from(JSON.stringify({ exp: Date.now() + 2 * 3600 * 1000 })).toString('base64url');
  return `${payload}.${sign(payload)}`;
}

export function isAuthed(req: Request): boolean {
  const cookie = req.headers.get('cookie') || '';
  const token = cookie.split(';').map((c) => c.trim()).find((c) => c.startsWith(`${COOKIE_NAME}=`))?.slice(COOKIE_NAME.length + 1);
  if (!token) return false;
  const [payload, sig] = token.split('.');
  if (!payload || !sig) return false;
  if (sig !== sign(payload)) return false;
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    return typeof data.exp === 'number' && data.exp > Date.now();
  } catch {
    return false;
  }
}

export { COOKIE_NAME };
