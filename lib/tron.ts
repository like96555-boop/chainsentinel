import { getSecret } from './secrets';

export interface CheckResult {
  level: 'red' | 'yellow' | 'green';
  score: number; // 0-100，越高越安全
  reasons: string[];
  evidenceLinks: string[];
  trongridReachable: boolean;
  stats?: {
    balanceTrx: number | null;
    recentTxCount: number | null;
    accountExists: boolean;
  };
}

const TRONGRID = 'https://api.trongrid.io';

function trongridHeaders(): Record<string, string> {
  const h: Record<string, string> = { Accept: 'application/json' };
  const key = getSecret('TRONGRID_API_KEY');
  if (key) h['TRON-PRO-API-KEY'] = key;
  return h;
}

async function fetchJson(url: string, timeoutMs = 8000): Promise<{ ok: boolean; status: number; json: any }> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { headers: trongridHeaders(), signal: ctrl.signal, cache: 'no-store' });
    const json = await res.json().catch(() => null);
    return { ok: res.ok, status: res.status, json };
  } finally {
    clearTimeout(t);
  }
}

/** 简单启发式评分：黑名单短路由调用方处理。TronGrid 不可达时降级为 yellow。 */
export async function scoreAddress(address: string): Promise<CheckResult> {
  const reasons: string[] = [];
  const evidenceLinks = [
    `https://tronscan.org/#/address/${address}`,
    `https://tronscan.org/#/contract/${address}`,
  ];

  let account: any = null;
  let txCount: number | null = null;
  let reachable = true;

  try {
    const accRes = await fetchJson(`${TRONGRID}/v1/accounts/${address}`);
    if (accRes.ok && accRes.json) {
      const dataArr = accRes.json.data;
      account = Array.isArray(dataArr) && dataArr.length > 0 ? dataArr[0] : null;
    }
    const txRes = await fetchJson(`${TRONGRID}/v1/accounts/${address}/transactions?limit=20`);
    if (txRes.ok && txRes.json) {
      txCount = Array.isArray(txRes.json.data) ? txRes.json.data.length : 0;
    }
  } catch {
    reachable = false;
  }

  if (!reachable) {
    return {
      level: 'yellow',
      score: 50,
      reasons: ['TronGrid 节点暂不可达，本次为降级评估，请稍后复测或结合 Tronscan 人工核查。'],
      evidenceLinks,
      trongridReachable: false,
      stats: { balanceTrx: null, recentTxCount: null, accountExists: false },
    };
  }

  const balanceTrx = account ? (Number(account.balance || 0) / 1e6) : 0;

  if (!account) {
    reasons.push('链上未查询到该账户（未激活地址），无法建立历史行为画像。');
    reasons.push('未命中本地风险标签库。');
    return {
      level: 'yellow',
      score: 55,
      reasons,
      evidenceLinks,
      trongridReachable: true,
      stats: { balanceTrx: 0, recentTxCount: txCount ?? 0, accountExists: false },
    };
  }

  let score = 70;
  if (txCount !== null) {
    if (txCount >= 20) {
      score += 15;
      reasons.push('近期链上交互活跃（近 20 笔窗口已满），具备可追溯历史。');
    } else if (txCount === 0) {
      score -= 25;
      reasons.push('近期无任何转账记录，新地址或休眠地址，建议人工复核。');
    } else {
      score += 5;
      reasons.push(`近期交易 ${txCount} 笔，活跃度一般。`);
    }
  }
  if (balanceTrx > 1000) {
    score += 10;
    reasons.push(`账户持有 ${balanceTrx.toLocaleString()} TRX，资金链路稳定。`);
  } else if (balanceTrx === 0) {
    score -= 10;
    reasons.push('账户 TRX 余额为 0，可能为一次性过桥地址。');
  }
  if (account.account_type === 2 || account.type === 'Contract') {
    score += 5;
    reasons.push('该地址为合约地址（如代币合约），非个人洗钱钱包典型特征。');
  }
  reasons.push('未命中本地风险标签库。');

  score = Math.max(0, Math.min(100, score));
  const level = score >= 70 ? 'green' : score >= 40 ? 'yellow' : 'red';
  return {
    level,
    score,
    reasons,
    evidenceLinks,
    trongridReachable: true,
    stats: { balanceTrx, recentTxCount: txCount, accountExists: true },
  };
}
