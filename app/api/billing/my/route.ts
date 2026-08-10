import { NextRequest, NextResponse } from 'next/server';
import { customerOf, CUSTOMER_SESSION_COOKIE } from '@/lib/customer-auth';
import { readOrders } from '@/lib/orders';
import { readKeys } from '@/lib/billing';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET /api/billing/my — 我的订阅（需客户登录；按邮箱聚合订单 + 令牌 + 用量） */
export async function GET(req: NextRequest) {
  const email = customerOf(req.cookies.get(CUSTOMER_SESSION_COOKIE)?.value);
  if (!email) return NextResponse.json({ error: '请先登录' }, { status: 401 });

  const orders = readOrders()
    .filter((o) => o.customerEmail === email)
    .sort((a, b) => b.createdAt - a.createdAt);

  const keys = readKeys().filter((k) => k.customerEmail === email);

  const keysView = keys.map((k) => ({
    id: k.id,
    name: k.name,
    plan: k.plan,
    enabled: k.enabled,
    status: k.subscriptionStatus,
    periodEndsAt: k.periodEndsAt,
    dailyQuota: k.dailyQuota,
    usedToday: k.usageByDay?.[dayKey()] || 0,
    createdAt: k.createdAt,
  }));

  const ordersView = orders.map((o) => ({
    id: o.id,
    planId: o.planId,
    amountUsd: o.amountUsd,
    status: o.status,
    method: o.method || 'stripe',
    createdAt: o.createdAt,
    confirmedAt: o.confirmedAt || null,
  }));

  return NextResponse.json({ ok: true, email, orders: ordersView, keys: keysView });
}

function dayKey(): string {
  // 与 billing.ts 一致的 Asia/Shanghai 自然日键
  const d = new Date();
  const s = new Date(d.getTime() + 8 * 3600 * 1000).toISOString().slice(0, 10);
  return s;
}
