/**
 * 风险警示榜 UI 元数据（纯常量，无 fs/网络依赖，可安全用于客户端组件）。
 */
export type AlertType = 'phishing' | 'laundering' | 'mixer' | 'scam';

export const ALERT_TYPES: AlertType[] = ['phishing', 'laundering', 'mixer', 'scam'];

export const ALERT_TYPE_META: Record<AlertType, { label: string; badge: string; dot: string }> = {
  phishing: {
    label: '钓鱼归集',
    badge: 'border-neon-red/50 bg-neon-red/10 text-neon-red',
    dot: 'bg-neon-red',
  },
  laundering: {
    label: '洗钱通道',
    badge: 'border-neon-yellow/50 bg-neon-yellow/10 text-neon-yellow',
    dot: 'bg-neon-yellow',
  },
  mixer: {
    label: '混币入口',
    badge: 'border-purple-400/50 bg-purple-400/10 text-purple-300',
    dot: 'bg-purple-400',
  },
  scam: {
    label: '诈骗资金',
    badge: 'border-orange-400/50 bg-orange-400/10 text-orange-300',
    dot: 'bg-orange-400',
  },
};

export type AlertChain = 'tron' | 'btc' | 'eth';

export const ALERT_CHAIN_META: Record<AlertChain, { label: string; badge: string }> = {
  tron: { label: 'TRON', badge: 'border-red-400/40 bg-red-400/10 text-red-300' },
  btc: { label: 'BTC', badge: 'border-orange-400/40 bg-orange-400/10 text-orange-300' },
  eth: { label: 'ETH', badge: 'border-indigo-400/40 bg-indigo-400/10 text-indigo-300' },
};

/** 地址掩码：前 4 后 4，中间省略 */
export function maskAddress(address: string): string {
  if (address.length <= 10) return address;
  return `${address.slice(0, 4)}…${address.slice(-4)}`;
}

/**
 * 来源等级徽章：区分「已确认事件」与「特征观察」。
 * 风控纪律：红牌级结论只由已确认事件支撑；特征观察仅为提示，不构成定性。
 */
export const ALERT_SOURCE_BADGE: Record<string, { label: string; cls: string }> = {
  'public-record': { label: '已确认事件', cls: 'border-sky-400/50 bg-sky-400/10 text-sky-300' },
  'ofac-sdn': { label: '官方制裁名单', cls: 'border-sky-400/50 bg-sky-400/10 text-sky-300' },
  'onchain-heuristic': { label: '特征观察', cls: 'border-slate-500/60 bg-slate-500/10 text-slate-400' },
};

export function sourceBadgeOf(source?: string): { label: string; cls: string } {
  return ALERT_SOURCE_BADGE[source || ''] || { label: '来源未标注', cls: 'border-slate-600/60 bg-slate-600/10 text-slate-500' };
}
