import { NextResponse } from 'next/server';
import { smartMoneyEventsQuerySchema } from '@/lib/validation';
import { rateLimit, clientIp } from '@/lib/rate-limit';
import { fetchEventsForAddress, readSmartMoneySeeds } from '@/lib/smart-money';
import type { SmartMoneyEvent } from '@/lib/smart-money';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// 30s 内存缓存（时间线短窗口内稳定）
let cache: { key: string; at: number; data: unknown } | null = null;
const TTL = 30_000;

/**
 * GET /api/smart-money/events?address=&chain= — 单地址最近动态时间线
 * 限流：10 次/分/IP；ETH 无公开交易明细时降级为余额/交易数快照（如实标注）
 */
export async function GET(req: Request) {
  const ip = clientIp(req);
  const rl = rateLimit(`smartmoney-events:${ip}`, 10, 60_000);
  if (!rl.ok) {
    return NextResponse.json({ error: '请求过于频繁，请稍后再试（每 IP 每分钟 10 次）' }, { status: 429 });
  }

  const url = new URL(req.url);
  const raw: Record<string, unknown> = {};
  for (const [k, v] of url.searchParams.entries()) raw[k] = v;

  const parsed = smartMoneyEventsQuerySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || '参数校验失败' },
      { status: 400 }
    );
  }
  const { address, chain } = parsed.data;

  // 仅允许查询监控列表内的地址（防任意地址探测）
  const seeds = readSmartMoneySeeds();
  const seed = seeds.find((s) => s.address.toLowerCase() === address.toLowerCase());
  if (!seed || seed.enabled === false) {
    return NextResponse.json({ error: '该地址不在聪明钱监控列表中' }, { status: 404 });
  }

  const cacheKey = `${chain}:${address.toLowerCase()}`;
  if (cache && cache.key === cacheKey && Date.now() - cache.at < TTL) {
    return NextResponse.json(cache.data as object, { headers: { 'Cache-Control': 'no-store' } });
  }

  const result = await fetchEventsForAddress(address, chain);
  const body = { address, chain, events: result.events as SmartMoneyEvent[], degraded: result.degraded ?? null };
  cache = { key: cacheKey, at: Date.now(), data: body };

  return NextResponse.json(body, { headers: { 'Cache-Control': 'no-store' } });
}
