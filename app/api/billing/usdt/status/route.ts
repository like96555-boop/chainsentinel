import { NextResponse } from 'next/server';
import { z } from 'zod';
import { confirmUsdtOrder, usdtPaymentInfo } from '@/lib/usdt';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const statusSchema = z.object({ order: z.string().min(3).max(64) }).strict();

/**
 * GET /api/billing/usdt/status?order=CSXXX — USDT 订单到账状态轮询
 * 返回：pending（未到账）/ paid（已到账并激活）/ 错误；到账后附令牌信息
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const parsed = statusSchema.safeParse({ order: url.searchParams.get('order') || '' });
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || '参数校验失败' }, { status: 400 });
  }
  const info = usdtPaymentInfo(parsed.data.order);
  if (!info) return NextResponse.json({ error: '订单不存在或非 USDT 支付' }, { status: 404 });

  const result = await confirmUsdtOrder(parsed.data.order);
  if (!result.ok && result.status === 404) {
    return NextResponse.json({ error: result.error }, { status: 404 });
  }
  if (!result.ok) {
    // 202：未到账（轮询中）
    return NextResponse.json({ status: 'pending', error: result.error, payTo: info });
  }
  // 已到账：返回订单 + 支付信息
  const tokens = (result.order as unknown as { tokens?: Array<{ id: string; key: string }> })?.tokens;
  return NextResponse.json({
    status: 'paid',
    orderId: result.order?.id,
    planId: result.order?.planId,
    usdtTxId: result.order?.usdtTxId,
    confirmedAt: result.order?.confirmedAt,
    tokens,
  });
}

/** POST /api/billing/usdt/status — 测试/手动确认入口（override 注入链上交易，供测试与线下复核） */
export async function POST(req: Request) {
  const parsed = z
    .object({ order: z.string().min(3).max(64), txId: z.string().min(10).max(80).optional(), amountUsdt: z.number().optional() })
    .safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: '参数校验失败' }, { status: 400 });
  const result = await confirmUsdtOrder(parsed.data.order, { txId: parsed.data.txId, amountUsdt: parsed.data.amountUsdt });
  if (!result.ok && result.status === 404) return NextResponse.json({ error: result.error }, { status: 404 });
  if (!result.ok) return NextResponse.json({ status: 'pending', error: result.error });
  return NextResponse.json({ status: 'paid', orderId: result.order?.id, usdtTxId: result.order?.usdtTxId, tokens: result.order?.tokens });
}
