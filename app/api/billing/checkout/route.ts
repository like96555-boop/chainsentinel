import { NextResponse } from 'next/server';
import { z } from 'zod';
import { planOf } from '@/lib/billing';
import { createCheckoutSession, isMockMode } from '@/lib/stripe';
import { createOrder } from '@/lib/orders';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const checkoutSchema = z
  .object({
    plan: z.enum(['pro', 'business']),
    email: z.string().email('邮箱格式不正确').max(128),
  })
  .strict();

/** POST /api/billing/checkout — 创建订阅收款会话（Stripe Checkout / mock） */
export async function POST(req: Request) {
  const parsed = checkoutSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || '参数校验失败' }, { status: 400 });
  }
  const plan = planOf(parsed.data.plan);
  if (!plan) return NextResponse.json({ error: '未知套餐' }, { status: 400 });
  if (plan.priceMonthlyUsd <= 0) {
    return NextResponse.json({ error: '免费版无需订阅，直接使用即可' }, { status: 400 });
  }

  // 1) 先落本地订单（pending），client_reference_id = 订单号
  const order = createOrder({ planId: plan.id, customerEmail: parsed.data.email, amountUsd: plan.priceMonthlyUsd });

  const base = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  try {
    const session = await createCheckoutSession({
      priceId: plan.priceId,
      customerEmail: parsed.data.email,
      clientReferenceId: order.id,
      successUrl: `${base}/dashboard?checkout=success&order=${order.id}`,
      cancelUrl: `${base}/dashboard?checkout=cancel&order=${order.id}`,
    });
    return NextResponse.json({ ok: true, orderId: order.id, checkoutUrl: session.url, mock: isMockMode() });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : '创建收款会话失败' }, { status: 502 });
  }
}
