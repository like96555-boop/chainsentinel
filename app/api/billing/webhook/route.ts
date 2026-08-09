import { NextResponse } from 'next/server';
import { parseWebhook } from '@/lib/stripe';
import { planOf } from '@/lib/billing';
import { activateSubscription, renewSubscription, deactivateSubscription } from '@/lib/billing';
import { readOrders, updateOrder, findOrder } from '@/lib/orders';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/billing/webhook — Stripe 支付回调（验签后处理）
 * 事件：
 *  - checkout.session.completed : 首期支付成功 → 订单 paid + 激活订阅（生成令牌）
 *  - invoice.paid              : 续费成功 → 周期顺延
 *  - customer.subscription.deleted : 订阅终止 → 停用令牌
 */
export async function POST(req: Request) {
  const rawBody = await req.text();
  const sig = req.headers.get('stripe-signature') || '';
  const parsed = parseWebhook(rawBody, sig);
  if ('error' in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }
  const event = parsed.event;
  const obj = event.data.object as Record<string, unknown>;

  try {
    if (event.type === 'checkout.session.completed') {
      // client_reference_id = 本地订单号
      const orderId = String(obj.client_reference_id || '');
      const order = findOrder(orderId);
      if (order && order.status === 'pending') {
        const plan = planOf(order.planId);
        const periodEndsAt = Date.now() + 30 * 86_400_000; // 首期 30 天（正式接入后可用订阅对象 current_period_end）
        const { created } = activateSubscription({
          planId: order.planId as 'pro' | 'business',
          customerEmail: order.customerEmail,
          stripeCustomerId: String(obj.customer || ''),
          stripeSubscriptionId: String(obj.subscription || ''),
          periodEndsAt,
        });
        updateOrder(orderId, {
          status: 'paid',
          stripeSessionId: String(obj.id || ''),
          stripeCustomerId: String(obj.customer || ''),
          stripeSubscriptionId: String(obj.subscription || ''),
          // 令牌明文仅在支付成功这一刻随订单落库（后台可查、可重新下发）
          ...({ tokens: created.map((k) => ({ id: k.id, key: k.key, name: k.name })) } as object),
        });
        // 更新套餐 Price ID 记录（运营配置后自动生效）
        if (plan) {
          // 无操作（Price ID 已由环境/后台配置）
        }
      }
    } else if (event.type === 'invoice.paid') {
      const subId = String(obj.subscription || '');
      if (subId) {
        const periodEndsAt =
          typeof obj.period_end === 'number' ? obj.period_end * 1000 : Date.now() + 30 * 86_400_000;
        renewSubscription(subId, periodEndsAt);
      }
    } else if (event.type === 'customer.subscription.deleted') {
      const subId = String(obj.id || '');
      if (subId) deactivateSubscription(subId);
    }
    return NextResponse.json({ received: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : '处理回调失败' },
      { status: 500 }
    );
  }
}
