import fs from 'fs';
import path from 'path';

// 通用 JSON 配置存储（所有后台模块的地基）：原子写 + 30s 缓存 + 类型安全
// 每个模块一个文件，统一增删改查，后台配置即改即生效（公开端点读取缓存最多 30s 延迟）
type Store = { items: unknown[]; updatedAt: number };

const cache = new Map<string, { at: number; data: Store }>();
const TTL = 30_000;

export function readStore<T>(fileName: string, defaults: T[]): { items: T[]; updatedAt: number } {
  const p = path.join(process.cwd(), 'data', fileName);
  const hit = cache.get(fileName);
  if (hit && Date.now() - hit.at < TTL) return hit.data as { items: T[]; updatedAt: number };
  let data: Store = { items: defaults as unknown[], updatedAt: Date.now() };
  try {
    if (fs.existsSync(p)) {
      const raw = JSON.parse(fs.readFileSync(p, 'utf8'));
      data = { items: Array.isArray(raw.items) ? raw.items : (Array.isArray(raw) ? raw : []), updatedAt: raw.updatedAt || Date.now() };
    }
  } catch (e) {
    console.error(`[ChainSentinel] ${fileName} 读取失败，使用默认。`, e);
  }
  cache.set(fileName, { at: Date.now(), data });
  return data as { items: T[]; updatedAt: number };
}

export function writeStore<T>(fileName: string, items: T[]): void {
  const p = path.join(process.cwd(), 'data', fileName);
  const dir = path.dirname(p);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const data: Store = { items, updatedAt: Date.now() };
  const tmp = p + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8');
  fs.renameSync(tmp, p);
  cache.set(fileName, { at: Date.now(), data });
  // 模块配置写入即记审计（覆盖所有走本函数的模块增删改）
  try {
    const auditPath = path.join(process.cwd(), 'data', 'audit-log.json');
    let entries: { ts: number; action: string; detail: string; ip: string }[] = [];
    if (fs.existsSync(auditPath)) {
      try {
        entries = JSON.parse(fs.readFileSync(auditPath, 'utf8')).items || [];
      } catch {
        entries = [];
      }
    }
    entries.unshift({ ts: Date.now(), action: '配置变更', detail: `${fileName}（${items.length} 条）`, ip: 'admin-api' });
    entries = entries.slice(0, 200);
    const tmp2 = auditPath + '.tmp';
    fs.writeFileSync(tmp2, JSON.stringify({ items: entries, updatedAt: Date.now() }, null, 2), 'utf8');
    fs.renameSync(tmp2, auditPath);
  } catch {
    /* 审计失败不影响主流程 */
  }
}

/** 通用 ID 生成 */
export function newId(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

/** 通用掩码（用于密钥展示） */
export function mask(value: string, head = 4, tail = 4): string {
  if (!value) return '';
  if (value.length <= head + tail) return '****';
  return `${value.slice(0, head)}${'*'.repeat(Math.min(8, value.length - head - tail))}${value.slice(-tail)}`;
}
