import fs from 'fs';
import path from 'path';
import { explorerAddressUrl } from './chains';
import type { AlertType, AlertChain } from './alerts-meta';
import { ALERT_TYPE_META } from './alerts-meta';

/**
 * 链上风险警示榜数据层：
 * 数据源 = data/alerts.json 种子 ∪ data/blacklist.json（按 address 去重，种子优先）。
 */

export interface AlertSeed {
  address: string;
  chain: AlertChain;
  type: AlertType;
  firstSeen: string; // ISO
  txCount: number; // 整数
  notes: string;
  demo?: boolean;
  source?: string;
}

export interface AlertItem extends AlertSeed {
  maskedAddress: string;
  typeLabel: string;
  evidenceUrl: string;
  source: string;
}

const ALERTS_FILE = path.join(process.cwd(), 'data', 'alerts.json');
const BLACKLIST_FILE = path.join(process.cwd(), 'data', 'blacklist.json');

function readJson(file: string): unknown[] {
  try {
    if (fs.existsSync(file)) {
      const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
      return Array.isArray(raw) ? raw : [];
    }
  } catch (e) {
    console.error(`[ChainSentinel] ${file} 读取失败。`, e);
  }
  return [];
}

/** 从黑名单 label 关键词推断风险类型（黑名单条目无 type 字段） */
function typeFromLabel(label: string): AlertType {
  const l = label;
  if (l.includes('钓鱼')) return 'phishing';
  if (l.includes('混币') || l.includes('混淆')) return 'mixer';
  if (l.includes('诈骗') || l.includes('骗') || l.includes('勒索')) return 'scam';
  return 'laundering';
}

/** 读取并合并数据源（按 address 去重，alerts.json 优先） */
export function readAlerts(): AlertSeed[] {
  const seeds = readJson(ALERTS_FILE) as AlertSeed[];
  const blacklist = readJson(BLACKLIST_FILE) as Array<Record<string, unknown>>;

  const map = new Map<string, AlertSeed>();
  for (const s of seeds) {
    if (s && typeof s.address === 'string') map.set(s.address, { ...s, source: s.source || 'alerts-seed' });
  }
  for (const b of blacklist) {
    const addr = b?.address;
    if (typeof addr !== 'string' || map.has(addr)) continue;
    const chain = (['tron', 'btc', 'eth'] as const).includes(b.chain as never)
      ? (b.chain as AlertChain)
      : 'tron';
    map.set(addr, {
      address: addr,
      chain,
      type: typeFromLabel(String(b.label || '')),
      firstSeen: '2024-01-01T00:00:00Z',
      txCount: 0,
      notes: String(b.note || b.label || '黑名单条目'),
      demo: b.source === 'chainsentinel-demo-seed',
      source: String(b.source || 'blacklist'),
    });
  }
  return [...map.values()];
}

/** 组装对外条目（掩码 + 类型中文 + 证据链接），按交易数降序 */
export function buildAlertItems(): AlertItem[] {
  return readAlerts()
    .map((s) => ({
      ...s,
      maskedAddress: `${s.address.slice(0, 4)}…${s.address.slice(-4)}`,
      typeLabel: ALERT_TYPE_META[s.type]?.label || s.type,
      evidenceUrl: explorerAddressUrl(s.chain, s.address),
      source: s.source || 'alerts-seed',
    }))
    .sort((a, b) => b.txCount - a.txCount);
}

/** 筛选 + 分页 */
export function queryAlerts(
  chain: 'all' | AlertChain,
  type: AlertType | undefined,
  page: number,
  pageSize: number
): { total: number; page: number; pageSize: number; items: AlertItem[] } {
  let items = buildAlertItems();
  if (chain !== 'all') items = items.filter((i) => i.chain === chain);
  if (type) items = items.filter((i) => i.type === type);
  const total = items.length;
  const start = (page - 1) * pageSize;
  return { total, page, pageSize, items: items.slice(start, start + pageSize) };
}
