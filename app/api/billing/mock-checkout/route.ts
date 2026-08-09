import { NextResponse } from 'next/server';
import { z } from 'zod';
import { planOf } from '@/lib/billing';
import { activateSubscription } from '@/lib/billing';
import { readOrders, updateOrder, findOrder } from '@/lib/orders';
import { isMockMode } from '@/lib/stripe';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const mockSchema = z.object({ order: z.string().min(3).max(64) }).strict();

/**
 * GET /api/billing/mock-checkout?order=CSXXX — 仅 mock 模式可用
 * 模拟 Stripe 支付成功回调（checkout.session.completed），
 * 返回生成的令牌明文。真实模式（STRIPE_MOCK 未开启）一律 404。
 */
export async function GET(req: Request) {
  if (!isMockMode()) {
    return NextResponse.json({ error: 'Not Found' }, { status: 404 });
  }
  const url = new URL(req.url);
  const parsed = mockSchema.safeParse({ order: url.searchParams.get('order') || '' });
  if (!parsed.success) {
    return NextResponse.json({ error: '缺少 order 参数' }, { status: 400 });
  }
  const order = findOrder(parsed.data.order);
  if (!order) return NextResponse.json({ error: '订单不存在' }, { status: 404 });
  if (order.status === 'paid') {
    // 幂等：已支付直接返回既有令牌
    const tokens = (order as unknown as { tokens?: Array<{ id: string; key: string; name: string }> }).tokens || [];
    return NextResponse.json({ ok: true, orderId: order.id, planId: order.planId, tokens, duplicated: true });
  }
  const { created } = activateSubscription({
    planId: order.planId as 'pro' | 'business',
    customerEmail: order.customerEmail,
    stripeCustomerId: 'cus_mock_' + order.id,
    stripeSubscriptionId: 'sub_mock_' + order.id,
    periodEndsAt: Date.now() + 30 * 86_400_000,
  });
  updateOrder(order.id, {
    status: 'paid',
    stripeCustomerId: 'cus_mock_' + order.id,
    stripeSubscriptionId: 'sub_mock_' + order.id,
    ...({ tokens: created.map((k) => ({ id: k.id, key: k.key, name: k.name })) } as object),
  });
  const plan = planOf(order.planId);
  return NextResponse.json({
    ok: true,
    orderId: order.id,
    planId: order.planId,
    planName: plan?.name,
    quotaPerDay: plan?.quotaPerDay,
    tokens: created.map((k) => ({ id: k.id, key: k.key, name: k.name })),
  });
}

/** 兼容 POST（测试工具亦可走 GET 简化） */
export async function POST(req: Request) {
  const url = new URL(req.url);
  const p = await req.json().catch(() => null);
  const order = (p && p.order) || url.searchParams.get('order') || '';
  return GET(new Request(`${url.origin}/api/billing/mock-checkout?order=${encodeURIComponent(order)}`));
}
