import fs from 'fs';
import path from 'path';

// 操作日志（安全审计）：记录后台关键操作，保留最近 200 条
type AuditEntry = { ts: number; action: string; detail: string; ip: string };

const LOG_PATH = path.join(process.cwd(), 'data', 'audit-log.json');
const MAX = 200;

export function logAudit(action: string, detail: string, req?: Request): void {
  try {
    const ip = req?.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local';
    let entries: AuditEntry[] = [];
    if (fs.existsSync(LOG_PATH)) {
      try {
        entries = JSON.parse(fs.readFileSync(LOG_PATH, 'utf8')).items || [];
      } catch {
        entries = [];
      }
    }
    entries.unshift({ ts: Date.now(), action, detail, ip });
    entries = entries.slice(0, MAX);
    const dir = path.dirname(LOG_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const tmp = LOG_PATH + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify({ items: entries, updatedAt: Date.now() }, null, 2), 'utf8');
    fs.renameSync(tmp, LOG_PATH);
  } catch (e) {
    console.error('[ChainSentinel] 操作日志写入失败', e);
  }
}

export function readAudit(): AuditEntry[] {
  try {
    if (fs.existsSync(LOG_PATH)) {
      return JSON.parse(fs.readFileSync(LOG_PATH, 'utf8')).items || [];
    }
  } catch {
    /* ignore */
  }
  return [];
}
