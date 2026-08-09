import { NextResponse } from 'next/server';
import { z } from 'zod';
import { planOf } from '@/lib/billing';
import { createCheckoutSession, isMockMode } from '@/lib/stripe';
import { createOrder, updateOrder } from '@/lib/orders';
import { getUsdtConfig } from '@/lib/usdt';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const checkoutSchema = z
  .object({
    plan: z.enum(['pro', 'business']),
    email: z.string().email('邮箱格式不正确').max(128),
    /** 支付方式：stripe（默认，卡/Apple Pay/Google Pay/FPS）| usdt（TRON 链上 USDT，非托管） */
    paymentMethod: z.enum(['stripe', 'usdt']).optional().default('stripe'),
  })
  .strict();

/** POST /api/billing/checkout — 创建订阅订单（Stripe Checkout / USDT 非托管） */
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

  // 1) 先落本地订单（pending）
  const order = createOrder({ planId: plan.id, customerEmail: parsed.data.email, amountUsd: plan.priceMonthlyUsd });

  // 2a) USDT 非托管支付：返回收款地址 + 应到金额（1 USDT ≈ 1 USD），由客户链上打款
  if (parsed.data.paymentMethod === 'usdt') {
    const cfg = getUsdtConfig();
    if (!cfg.address) {
      updateOrder(order.id, { status: 'canceled' });
      return NextResponse.json(
        { error: 'USDT 收款暂未开放（运营收款地址未配置），请使用 Stripe 支付或稍后再试' },
        { status: 503 }
      );
    }
    updateOrder(order.id, { method: 'usdt', amountUsdt: plan.priceMonthlyUsd });
    return NextResponse.json({
      ok: true,
      orderId: order.id,
      method: 'usdt',
      payTo: {
        address: cfg.address,
        amountUsdt: plan.priceMonthlyUsd,
        contract: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t',
        network: 'TRON (TRC-20)',
        note: `请向上述地址转入 ${plan.priceMonthlyUsd} USDT（TRC-20）。到账后自动激活「${plan.name}」。非托管支付：资金直接进入运营方钱包，平台不托管。`,
      },
    });
  }

  // 2b) Stripe 收款
  const base = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  try {
    const session = await createCheckoutSession({
      priceId: plan.priceId,
      customerEmail: parsed.data.email,
      clientReferenceId: order.id,
      successUrl: `${base}/dashboard?checkout=success&order=${order.id}`,
      cancelUrl: `${base}/dashboard?checkout=cancel&order=${order.id}`,
    });
    updateOrder(order.id, { method: 'stripe' });
    return NextResponse.json({ ok: true, orderId: order.id, checkoutUrl: session.url, mock: isMockMode(), method: 'stripe' });
  } catch (e) {
    // 收款通道未配置/不可用：503 明确告知，绝不 fallback 到本地演示（防止客户不扣款白得令牌）
    return NextResponse.json({ error: e instanceof Error ? e.message : '创建收款会话失败' }, { status: 503 });
  }
}
