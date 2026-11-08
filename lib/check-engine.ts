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

/** 判定依据：告诉 Agent 这个结论到底是「命中名单」还是「只是看了链上活跃度」 */
export type VerdictBasis = 'sanctions-list-hit' | 'chain-activity-heuristics' | 'degraded-upstream';
/** 给 Agent 的可执行下一步，避免它把 green 当成放行证明 */
export type RecommendedAction = 'block' | 'escalate' | 'proceed-with-caution';

export interface ScreeningCoverage {
  scope: string;
  verdictBasis: VerdictBasis;
  checksPerformed: string[];
  notCovered: string[];
  noData: boolean;
  degraded: boolean;
  upstreamQueried: boolean;
  greenIsNotClearance: true;
  recommendedAction: RecommendedAction;
  interpretation: string;
  escalationHint: string;
}

/** 明确列出我们没有的数据，禁止让「未命中」被读成「干净」 */
const NOT_COVERED = [
  'entity-attribution (exchange / mixer / drainer / scam labels)',
  'multi-hop or cross-chain fund tracing',
  'transaction-level KYT reports and ongoing monitoring',
  'sanction lists that contain no addresses (e.g. UN / UK lists)',
  'court-admissible or regulator-submittable evidence packages',
];

function buildCoverage(opts: {
  chain: ChainId;
  level: string;
  verdictBasis: VerdictBasis;
  degraded: boolean;
  upstreamQueried: boolean;
}): ScreeningCoverage {
  const { chain, level, verdictBasis, degraded, upstreamQueried } = opts;
  const checksPerformed = ['ofac-sdn-address-list', 'public-record'];
  if (upstreamQueried) checksPerformed.push(`${chain}-onchain-activity`);

  let recommendedAction: RecommendedAction = 'proceed-with-caution';
  if (level === 'red') recommendedAction = 'block';
  else if (level === 'yellow' || degraded || verdictBasis === 'degraded-upstream') recommendedAction = 'escalate';

  let interpretation: string;
  if (verdictBasis === 'sanctions-list-hit') {
    interpretation = 'The address matched a curated sanctions/blacklist entry. Stop the interaction.';
  } else if (degraded) {
    interpretation = 'The live chain data source did not respond. This verdict is a degraded fallback, not a screening result. Retry or escalate.';
  } else if (level === 'green') {
    interpretation = 'No OFAC SDN / curated label hit and the address shows normal on-chain activity. This is NOT a clearance: we have no attribution intelligence about this address.';
  } else {
    interpretation = 'No OFAC SDN / curated label hit, but on-chain history is insufficient to form a picture. Treat as unknown, not clean.';
  }

  return {
    scope: 'OFAC SDN address-list screening + live chain activity heuristics. A pre-interaction veto gate, NOT a full AML/KYT investigation.',
    verdictBasis,
    checksPerformed,
    notCovered: NOT_COVERED,
    // 只有名单命中才是「有情报」；其余情况下我们对这个地址的对手方身份其实没有数据
    noData: verdictBasis !== 'sanctions-list-hit',
    degraded,
    upstreamQueried,
    greenIsNotClearance: true,
    recommendedAction,
    interpretation,
    escalationHint: 'For entity attribution, multi-hop tracing or a compliance-grade report, escalate to a full KYT / forensics provider before moving funds.',
  };
}

/** 判定一个地址。返回纯数据 + HTTP 状态码，不直接构造 Response，便于多端点复用。 */
export async function performAddressCheck(address: string, quota: unknown = null): Promise<CheckResult> {
  const chain: ChainId | null = detectChain(address);
  if (!chain) {
    return { status: 400, body: { error: SUPPORTED_FORMATS_HINT } };
  }

  const hit = findInBlacklist(address, chain);
  let body: Record<string, unknown>;
  let upstreamQueried = true;

  if (hit) {
    // 名单命中直接短路，不请求链上上游
    upstreamQueried = false;
    countBlocked();
    const reasons = [`命中本地风险标签库：${hit.label}`];
    if (hit.note) reasons.push(`标签备注：${hit.note}`);
    reasons.push('建议立即停止与该地址的一切资金往来。');
    body = {
      chain,
      level: 'red',
      score: 5,
      reasons,
      evidenceLinks: [explorerAddressUrl(chain, address)],
      blacklist: { label: hit.label, source: hit.source, sourceLabel: sourceLabelOf(hit.source) },
      stats: null,
      upstreamReachable: true,
      quota,
    };
  } else if (chain === 'tron') {
    const r = await scoreAddress(address);
    if (r.level === 'red') countBlocked();
    body = {
      chain,
      level: r.level,
      score: r.score,
      reasons: r.reasons,
      evidenceLinks: r.evidenceLinks,
      stats: r.stats ?? null,
      upstreamReachable: r.trongridReachable,
      quota,
    };
  } else {
    const r = chain === 'btc' ? await scoreBtcAddress(address) : await scoreEthAddress(address);
    if (r.level === 'red') countBlocked();
    body = { ...r, quota } as Record<string, unknown>;
  }

  const degraded = body.upstreamReachable === false;
  const verdictBasis: VerdictBasis = hit
    ? 'sanctions-list-hit'
    : degraded
      ? 'degraded-upstream'
      : 'chain-activity-heuristics';
  const level = typeof body.level === 'string' ? body.level : 'yellow';

  body.coverage = buildCoverage({ chain, level, verdictBasis, degraded, upstreamQueried });
  return { status: 200, body };
}
