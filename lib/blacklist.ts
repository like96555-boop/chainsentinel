import fs from 'fs';
import path from 'path';
import type { ChainId } from './chains';

export type BlacklistChain = ChainId | 'any';

export interface BlacklistEntry {
  address: string;
  label: string;
  note: string;
  source: string;
  /** 缺省视为 any（向后兼容旧数据） */
  chain?: BlacklistChain;
}

const FILE = path.join(process.cwd(), 'data', 'blacklist.json');

export function readBlacklist(): BlacklistEntry[] {
  try {
    if (fs.existsSync(FILE)) {
      const raw = JSON.parse(fs.readFileSync(FILE, 'utf8')) as unknown;
      // 兼容两种格式：纯数组（旧）与 {items:[...]}（后台管理模块写入）
      if (Array.isArray(raw)) return raw as BlacklistEntry[];
      if (raw && typeof raw === 'object' && Array.isArray((raw as { items?: unknown }).items)) {
        return (raw as { items: BlacklistEntry[] }).items;
      }
    }
  } catch (e) {
    console.error('[ChainSentinel] blacklist.json 读取失败。', e);
  }
  return [];
}

/** 命中逻辑：地址相等，且条目标记链为 any / 缺省 / 与当前链一致 */
export function findInBlacklist(address: string, chain?: ChainId): BlacklistEntry | null {
  return (
    readBlacklist().find(
      (e) => e.address === address && (!e.chain || e.chain === 'any' || e.chain === chain)
    ) || null
  );
}

/** 来源人话化（数据来源透明：客户能看懂"这地址为什么被标黑、依据来自哪"） */
export function sourceLabelOf(source?: string): string {
  switch (source) {
    case 'chainsentinel-demo-seed':
      return '演示种子数据（上线运营后将替换为真实威胁情报）';
    case 'public-record':
      return '公开执法/安全事件记录（链上可复核）';
    case 'ofac-sdn':
      return '美国财政部 OFAC 制裁名单（官方公开数据）';
    case 'onchain-heuristic':
      return '链上特征启发式标记（真实地址，非官方定性）';
    case 'manual':
      return '运营后台人工添加（含人工复核）';
    case 'external-intel':
      return '外部威胁情报源（已接入自动同步）';
    default:
      return source && source.length > 0 ? source : '未标注来源';
  }
}
