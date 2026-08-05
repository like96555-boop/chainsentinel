import { NextResponse } from 'next/server';
import { rateLimit, clientIp } from '@/lib/rate-limit';
import { fetchAllCards, readSmartMoneySeeds } from '@/lib/smart-money';
import type { SmartMoneyCard } from '@/lib/smart-money';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// 60s 内存缓存（模式同 /api/market）
let cache: { at: number; items: SmartMoneyCard[] } | null = null;
const TTL = 60_000;

/**
 * GET /api/smart-money/list — 聪明钱地址卡列表（真实链上数据）
 * 限流：10 次/分/IP；60s 服务端缓存
 */
export async function GET(req: Request) {
  const ip = clientIp(req);
  const rl = rateLimit(`smartmoney-list:${ip}`, 10, 60_000);
  if (!rl.ok) {
    return NextResponse.json({ error: '请求过于频繁，请稍后再试（每 IP 每分钟 10 次）' }, { status: 429 });
  }

  if (cache && Date.now() - cache.at < TTL) {
    return NextResponse.json(
      { items: cache.items, cachedAt: cache.at, cached: true },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  }

  const seeds = readSmartMoneySeeds();
  const items = await fetchAllCards(seeds);
  cache = { at: Date.now(), items };

  return NextResponse.json(
    { items, cachedAt: cache.at, cached: false },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
