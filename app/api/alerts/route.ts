import { NextResponse } from 'next/server';
import { alertsQuerySchema } from '@/lib/validation';
import { rateLimit, clientIp } from '@/lib/rate-limit';
import { queryAlerts } from '@/lib/alerts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/alerts — 链上风险警示榜
 * query: chain(all|tron|btc|eth, 默认 all) / type(可选) / page(默认1) / pageSize(默认10, 上限50)
 * 限流：独立 key，20 次/分/IP
 */
export async function GET(req: Request) {
  const ip = clientIp(req);
  const rl = rateLimit(`alerts:${ip}`, 20, 60_000);
  if (!rl.ok) {
    return NextResponse.json({ error: '请求过于频繁，请稍后再试（每 IP 每分钟 20 次）' }, { status: 429 });
  }

  const url = new URL(req.url);
  const raw: Record<string, unknown> = {};
  for (const [k, v] of url.searchParams.entries()) raw[k] = v;

  const parsed = alertsQuerySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || '参数校验失败' },
      { status: 400 }
    );
  }

  const { chain, type, page, pageSize } = parsed.data;
  const result = queryAlerts(chain, type, page, pageSize);
  return NextResponse.json(result, { headers: { 'Cache-Control': 'no-store' } });
}
