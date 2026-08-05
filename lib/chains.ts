/**
 * 多链地址识别与 BTC / ETH 链上启发式评分。
 * TRON 逻辑沿用 lib/tron.ts，本文件只负责识别与 BTC/ETH 分析器。
 */

export type ChainId = 'tron' | 'btc' | 'eth';

export interface ChainCheckResult {
  chain: ChainId;
  level: 'red' | 'yellow' | 'green';
  score: number; // 0-100，越高越安全
  reasons: string[];
  evidenceLinks: string[];
  upstreamReachable: boolean;
  stats?: Record<string, number | boolean | null>;
}

const RE_TRON = /^T[1-9A-HJ-NP-Za-km-z]{33}$/;
const RE_ETH = /^0x[0-9a-fA-F]{40}$/;
// BTC：bech32（bc1 开头）或 base58（1 / 3 开头）
const RE_BTC_BECH32 = /^bc1[qpzry9x8gf2tvdw0s3jn54khce6mua7l]{11,71}$/i;
const RE_BTC_BASE58 = /^[13][1-9A-HJ-NP-Za-km-z]{25,34}$/;

/** 识别地址所属链；识别不出返回 null */
export function detectChain(address: string): ChainId | null {
  const a = address.trim();
  if (RE_TRON.test(a)) return 'tron';
  if (RE_ETH.test(a)) return 'eth';
  if (RE_BTC_BECH32.test(a) || RE_BTC_BASE58.test(a)) return 'btc';
  return null;
}

export const SUPPORTED_FORMATS_HINT =
  '无法识别的地址格式。目前支持：TRON（T 开头 34 位 base58）、BTC（bc1 开头 bech32 或 1/3 开头 base58）、ETH/EVM（0x 开头 40 位 hex）。';

export function explorerAddressUrl(chain: ChainId, address: string): string {
  switch (chain) {
    case 'tron':
      return `https://tronscan.org/#/address/${address}`;
    case 'btc':
      return `https://blockstream.info/address/${address}`;
    case 'eth':
      return `https://etherscan.io/address/${address}`;
  }
}

async function fetchJson(url: string, timeoutMs = 9000): Promise<{ ok: boolean; status: number; json: any }> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: ctrl.signal,
      cache: 'no-store',
    });
    const json = await res.json().catch(() => null);
    return { ok: res.ok, status: res.status, json };
  } finally {
    clearTimeout(t);
  }
}

/* ------------------------------ BTC（Blockstream 公共 API） ------------------------------ */

const BLOCKSTREAM = 'https://blockstream.info/api';

export async function scoreBtcAddress(address: string): Promise<ChainCheckResult> {
  const evidenceLinks = [explorerAddressUrl('btc', address)];
  const reasons: string[] = [];

  let balanceSat: number | null = null;
  let txCount: number | null = null;
  let recentTxs: number | null = null;

  try {
    const addrRes = await fetchJson(`${BLOCKSTREAM}/address/${address}`);
    if (!addrRes.ok || !addrRes.json?.chain_stats) throw new Error(`blockstream HTTP ${addrRes.status}`);
    const cs = addrRes.json.chain_stats;
    const ms = addrRes.json.mempool_stats || { funded_txo_sum: 0, spent_txo_sum: 0, tx_count: 0 };
    balanceSat =
      Number(cs.funded_txo_sum || 0) - Number(cs.spent_txo_sum || 0) +
      (Number(ms.funded_txo_sum || 0) - Number(ms.spent_txo_sum || 0));
    txCount = Number(cs.tx_count || 0) + Number(ms.tx_count || 0);

    const txRes = await fetchJson(`${BLOCKSTREAM}/address/${address}/txs`);
    recentTxs = txRes.ok && Array.isArray(txRes.json) ? txRes.json.length : null;
  } catch {
    return {
      chain: 'btc',
      level: 'yellow',
      score: 50,
      reasons: ['Blockstream 节点暂不可达，本次为降级评估，请稍后复测或结合区块浏览器人工核查。'],
      evidenceLinks,
      upstreamReachable: false,
      stats: { balanceBtc: null, txCount: null, recentTxCount: null },
    };
  }

  const balanceBtc = (balanceSat ?? 0) / 1e8;

  if ((txCount ?? 0) === 0 && (balanceSat ?? 0) === 0) {
    return {
      chain: 'btc',
      level: 'yellow',
      score: 55,
      reasons: [
        '链上无任何交易与余额记录（全新地址），无法建立历史行为画像。',
        '未命中本地风险标签库。',
      ],
      evidenceLinks,
      upstreamReachable: true,
      stats: { balanceBtc: 0, txCount: 0, recentTxCount: recentTxs ?? 0 },
    };
  }

  let score = 70;
  if ((txCount ?? 0) >= 100) {
    score += 15;
    reasons.push(`链上历史交易 ${txCount} 笔，资金轨迹可追溯性强。`);
  } else if ((txCount ?? 0) > 0) {
    score += 5;
    reasons.push(`链上历史交易 ${txCount} 笔，活跃度一般。`);
  } else {
    score -= 20;
    reasons.push('无历史交易记录，新地址或休眠地址，建议人工复核。');
  }

  if (balanceBtc > 0.1) {
    score += 10;
    reasons.push(`当前余额 ${balanceBtc.toFixed(4)} BTC，资金链路稳定。`);
  } else if (balanceBtc === 0 && (txCount ?? 0) > 0) {
    score -= 10;
    reasons.push('余额已清空，可能为一次性过桥地址。');
  }
  reasons.push('未命中本地风险标签库。');

  score = Math.max(0, Math.min(100, score));
  const level = score >= 70 ? 'green' : score >= 40 ? 'yellow' : 'red';
  return {
    chain: 'btc',
    level,
    score,
    reasons,
    evidenceLinks,
    upstreamReachable: true,
    stats: { balanceBtc, txCount, recentTxCount: recentTxs },
  };
}

/* ------------------------------ ETH（公共 JSON-RPC，双端点兜底） ------------------------------ */

// 首选 llamarpc，cloudflare 兜底（任务指定）；实测 llamarpc 偶发 521、cloudflare 偶发 JSON-RPC 内部错误，
// 故追加 publicnode / 1rpc 两个免费无 key 公共节点作为最终兜底。
export const ETH_RPCS = [
  'https://eth.llamarpc.com',
  'https://cloudflare-eth.com',
  'https://ethereum-rpc.publicnode.com',
  'https://1rpc.io/eth',
];

async function ethRpc(method: string, params: unknown[]): Promise<any> {
  let lastErr: unknown = null;
  for (const url of ETH_RPCS) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 9000);
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
        signal: ctrl.signal,
        cache: 'no-store',
      });
      const json = await res.json().catch(() => null);
      if (res.ok && json && json.result !== undefined && !json.error) return json.result;
      lastErr = new Error(json?.error?.message || `HTTP ${res.status}`);
    } catch (e) {
      lastErr = e;
    } finally {
      clearTimeout(t);
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error('ETH RPC 全部不可达');
}

export async function scoreEthAddress(address: string): Promise<ChainCheckResult> {
  const evidenceLinks = [explorerAddressUrl('eth', address)];
  const reasons: string[] = [];

  let balanceWei: bigint;
  let nonce: number;
  try {
    const [balHex, nonceHex] = await Promise.all([
      ethRpc('eth_getBalance', [address, 'latest']),
      ethRpc('eth_getTransactionCount', [address, 'latest']),
    ]);
    balanceWei = BigInt(balHex);
    nonce = Number(BigInt(nonceHex));
  } catch {
    return {
      chain: 'eth',
      level: 'yellow',
      score: 50,
      reasons: ['ETH 公共 RPC 节点暂不可达，本次为降级评估，请稍后复测或结合 Etherscan 人工核查。'],
      evidenceLinks,
      upstreamReachable: false,
      stats: { balanceEth: null, nonce: null },
    };
  }

  const balanceEth = Number(balanceWei) / 1e18;

  if (nonce === 0 && balanceWei === 0n) {
    return {
      chain: 'eth',
      level: 'yellow',
      score: 55,
      reasons: [
        '链上无交易与余额记录（全新地址），无法建立历史行为画像。',
        '未命中本地风险标签库。',
      ],
      evidenceLinks,
      upstreamReachable: true,
      stats: { balanceEth: 0, nonce: 0 },
    };
  }

  let score = 70;
  if (nonce >= 100) {
    score += 15;
    reasons.push(`已发出 ${nonce} 笔交易（nonce），链上历史深厚可追溯。`);
  } else if (nonce > 0) {
    score += 5;
    reasons.push(`已发出 ${nonce} 笔交易（nonce），活跃度一般。`);
  } else {
    score -= 15;
    reasons.push('从未主动发出交易（nonce=0），纯收款地址，建议人工复核。');
  }

  if (balanceEth > 0.01) {
    score += 10;
    reasons.push(`当前余额 ${balanceEth.toFixed(4)} ETH，资金链路稳定。`);
  } else if (balanceEth === 0 && nonce > 0) {
    score -= 10;
    reasons.push('余额已清空，可能为一次性过桥地址。');
  }
  reasons.push('未命中本地风险标签库。');

  score = Math.max(0, Math.min(100, score));
  const level = score >= 70 ? 'green' : score >= 40 ? 'yellow' : 'red';
  return {
    chain: 'eth',
    level,
    score,
    reasons,
    evidenceLinks,
    upstreamReachable: true,
    stats: { balanceEth, nonce },
  };
}
