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
