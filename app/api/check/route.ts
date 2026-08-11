import { NextResponse } from 'next/server';
import { checkSchema } from '@/lib/validation';
import { rateLimit, clientIp } from '@/lib/rate-limit';
import { findInBlacklist, sourceLabelOf } from '@/lib/blacklist';
import { scoreAddress } from '@/lib/tron';
import { authenticateKey } from '@/lib/billing';
import {
  detectChain,
  scoreBtcAddress,
  scoreEthAddress,
  explorerAddressUrl,
  SUPPORTED_FORMATS_HINT,
  type ChainId,
} from '@/lib/chains';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  // 0) API 计量：携带令牌（Bearer cs_live_*）走订阅计量扣费；未携带走免费层（IP 限流）
  const auth = authenticateKey(req);
  if (!auth.ok) {
    // 带了令牌但无效/停用/超配额 → 直接拒绝（不允许降级免费层绕过认证）
    if (!auth.missing) {
      return NextResponse.json(
        { error: auth.error, quota: auth.key ? { usedToday: auth.usedToday, remaining: auth.remaining } : undefined },
        { status: auth.status || 401 }
      );
    }
    // 未带令牌 → 免费层（IP 限流）
    const ip = clientIp(req);
    const rl = rateLimit(`check:${ip}`, 10, 60_000);
    if (!rl.ok) {
      return NextResponse.json({ error: '请求过于频繁，请稍后再试（每 IP 每分钟 10 次）' }, { status: 429 });
    }
  }
  const quota = auth.ok
    ? { usedToday: auth.usedToday, remaining: auth.remaining, plan: auth.key?.plan || 'free' }
    : null;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: '请求体必须是 JSON' }, { status: 400 });
  }
  const parsed = checkSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || '参数校验失败' },
      { status: 400 }
    );
  }

  const address = parsed.data.address.trim();

  // 1) 识别链
  const chain: ChainId | null = detectChain(address);
  if (!chain) {
    return NextResponse.json({ error: SUPPORTED_FORMATS_HINT }, { status: 400 });
  }

  // 2) 黑名单命中 = 红色短路（按链匹配或 any）
  const hit = findInBlacklist(address, chain);
  if (hit) {
    const reasons = [`命中本地风险标签库：${hit.label}`];
    if (hit.note) reasons.push(`标签备注：${hit.note}`);
    reasons.push('建议立即停止与该地址的一切资金往来。');
    return NextResponse.json({
      chain,
      level: 'red',
      score: 5,
      reasons,
      evidenceLinks: [explorerAddressUrl(chain, address)],
      blacklist: { label: hit.label, source: hit.source, sourceLabel: sourceLabelOf(hit.source) },
      stats: null,
      upstreamReachable: true,
      quota,
    });
  }

  // 3) 分派到对应链分析器
  if (chain === 'tron') {
    const r = await scoreAddress(address);
    return NextResponse.json({
      chain,
      level: r.level,
      score: r.score,
      reasons: r.reasons,
      evidenceLinks: r.evidenceLinks,
      stats: r.stats ?? null,
      upstreamReachable: r.trongridReachable,
      quota,
    });
  }
  const r = chain === 'btc' ? await scoreBtcAddress(address) : await scoreEthAddress(address);
  return NextResponse.json({ ...r, quota });
}
