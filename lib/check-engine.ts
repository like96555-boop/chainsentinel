// 链哨 · 地址风险判定引擎（唯一实现）
// /api/check 与 /api/v1/check 共用此函数，禁止复制判定逻辑。
import { findInBlacklist, sourceLabelOf } from '@/lib/blacklist';
import { countBlocked } from '@/lib/stats';
import { scoreAddress } from '@/lib/tron';
import {
  detectChain,
  scoreBtcAddress,
  scoreEthAddress,
  explorerAddressUrl,
  SUPPORTED_FORMATS_HINT,
  type ChainId,
} from '@/lib/chains';

export interface CheckResult {
  status: number;
  body: Record<string, unknown>;
}

/** 判定一个地址。返回纯数据 + HTTP 状态码，不直接构造 Response，便于多端点复用。 */
export async function performAddressCheck(address: string, quota: unknown = null): Promise<CheckResult> {
  const chain: ChainId | null = detectChain(address);
  if (!chain) {
    return { status: 400, body: { error: SUPPORTED_FORMATS_HINT } };
  }

  const hit = findInBlacklist(address, chain);
  if (hit) {
    countBlocked();
    const reasons = [`命中本地风险标签库：${hit.label}`];
    if (hit.note) reasons.push(`标签备注：${hit.note}`);
    reasons.push('建议立即停止与该地址的一切资金往来。');
    return {
      status: 200,
      body: {
        chain,
        level: 'red',
        score: 5,
        reasons,
        evidenceLinks: [explorerAddressUrl(chain, address)],
        blacklist: { label: hit.label, source: hit.source, sourceLabel: sourceLabelOf(hit.source) },
        stats: null,
        upstreamReachable: true,
        quota,
      },
    };
  }

  if (chain === 'tron') {
    const r = await scoreAddress(address);
    if (r.level === 'red') countBlocked();
    return {
      status: 200,
      body: {
        chain,
        level: r.level,
        score: r.score,
        reasons: r.reasons,
        evidenceLinks: r.evidenceLinks,
        stats: r.stats ?? null,
        upstreamReachable: r.trongridReachable,
        quota,
      },
    };
  }
  const r = chain === 'btc' ? await scoreBtcAddress(address) : await scoreEthAddress(address);
  if (r.level === 'red') countBlocked();
  return { status: 200, body: { ...r, quota } as Record<string, unknown> };
}
