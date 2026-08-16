// 链哨 · 实时统计（主页「已监控地址 / 已拦截风险交易 / 风险标签库规模」真实数据源）
// 数据来源：
//   - 已监控地址  = data/customer-watches.json 全部客户监控地址（跨客户按地址去重）
//   - 已拦截风险交易 = data/stats.json 拦截计数器（check 接口判定 red 时 +1）
//   - 风险标签库规模 = data/blacklist.json 生效标签条目数（含 OFAC SDN 与公开事件记录）
import fs from 'fs';
import path from 'path';

const STATS_FILE = path.join(process.cwd(), 'data', 'stats.json');
const WATCHES_FILE = path.join(process.cwd(), 'data', 'customer-watches.json');
const BLACKLIST_FILE = path.join(process.cwd(), 'data', 'blacklist.json');

interface StatsState {
  blockedCount: number;
  firstBlockedAt: number | null;
  updatedAt: number;
}

function readStats(): StatsState {
  try {
    if (fs.existsSync(STATS_FILE)) {
      const raw = JSON.parse(fs.readFileSync(STATS_FILE, 'utf8')) as Partial<StatsState>;
      return {
        blockedCount: typeof raw.blockedCount === 'number' ? raw.blockedCount : 0,
        firstBlockedAt: typeof raw.firstBlockedAt === 'number' ? raw.firstBlockedAt : null,
        updatedAt: typeof raw.updatedAt === 'number' ? raw.updatedAt : 0,
      };
    }
  } catch (e) {
    console.error('[stats] 读取失败', e);
  }
  return { blockedCount: 0, firstBlockedAt: null, updatedAt: 0 };
}

function writeStats(s: StatsState): void {
  try {
    fs.mkdirSync(path.dirname(STATS_FILE), { recursive: true });
    fs.writeFileSync(STATS_FILE, JSON.stringify(s, null, 2), 'utf8');
  } catch (e) {
    console.error('[stats] 写入失败', e);
  }
}

/** 已监控地址数：跨客户按地址去重 */
export function getWatchedAddressCount(): number {
  try {
    if (!fs.existsSync(WATCHES_FILE)) return 0;
    const raw = JSON.parse(fs.readFileSync(WATCHES_FILE, 'utf8')) as unknown;
    const set = new Set<string>();
    if (raw && typeof raw === 'object') {
      for (const list of Object.values(raw as Record<string, { address?: unknown }[]>)) {
        if (Array.isArray(list)) {
          for (const w of list) {
            if (w && typeof w.address === 'string') set.add(w.address);
          }
        }
      }
    }
    return set.size;
  } catch (e) {
    console.error('[stats] 监控地址统计失败', e);
    return 0;
  }
}

/** 风险标签库规模：blacklist.json 生效条目数（兼容数组与 {items:[...]} 两种格式） */
export function getRiskLabelCount(): number {
  try {
    if (!fs.existsSync(BLACKLIST_FILE)) return 0;
    const raw = JSON.parse(fs.readFileSync(BLACKLIST_FILE, 'utf8')) as unknown;
    if (Array.isArray(raw)) return raw.length;
    if (raw && typeof raw === 'object' && Array.isArray((raw as { items?: unknown }).items)) {
      return (raw as { items: unknown[] }).items.length;
    }
    return 0;
  } catch (e) {
    console.error('[stats] 标签库统计失败', e);
    return 0;
  }
}

/** 已拦截风险交易计数（只读） */
export function getBlockedCount(): number {
  return readStats().blockedCount;
}

/** 判定为风险（red）时调用：拦截计数 +1，返回最新计数 */
export function countBlocked(): number {
  const s = readStats();
  s.blockedCount += 1;
  if (s.firstBlockedAt === null) s.firstBlockedAt = Date.now();
  s.updatedAt = Date.now();
  writeStats(s);
  return s.blockedCount;
}

/** 主页统计快照 */
export function getStatsSnapshot() {
  return {
    watchedAddresses: getWatchedAddressCount(),
    blockedTransactions: getBlockedCount(),
    riskLabels: getRiskLabelCount(),
    updatedAt: Date.now(),
  };
}
