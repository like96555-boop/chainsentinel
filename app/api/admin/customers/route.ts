import { NextResponse } from 'next/server';
import { isAuthed } from '@/lib/session';
import { readCustomers } from '@/lib/customer-admin';
import { readOrders } from '@/lib/orders';
import { readKeys } from '@/lib/billing';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET /api/admin/customers?search= — 客户管理（账号 + 订单 + 订阅汇总） */
export async function GET(req: Request) {
  if (!(await isAuthed(req))) return NextResponse.json({ error: '未授权' }, { status: 401 });

  const search = (new URL(req.url).searchParams.get('search') || '').trim().toLowerCase();
  const customers = readCustomers();
  const orders = readOrders();
  const keys = readKeys();

  const rows = customers
    .filter((c) => !search || c.email.includes(search))
    .map((c) => {
      const myOrders = orders.filter((o) => o.customerEmail === c.email);
      const myKeys = keys.filter((k) => k.customerEmail === c.email);
      const paidOrders = myOrders.filter((o) => o.status === 'paid');
      const activeKey = myKeys.find((k) => k.enabled && k.subscriptionStatus === 'active');
      return {
        email: c.email,
        createdAt: c.createdAt,
        lastLoginAt: c.lastLoginAt || null,
        orderCount: myOrders.length,
        paidCount: paidOrders.length,
        revenueUsd: paidOrders.reduce((s, o) => s + (o.amountUsd || 0), 0),
        subscription: activeKey
          ? { plan: activeKey.plan, status: activeKey.subscriptionStatus, periodEndsAt: activeKey.periodEndsAt || null, tokenKeys: myKeys.length }
          : null,
        recentOrder: myOrders[0] || null,
      };
    })
    .sort((a, b) => b.createdAt - a.createdAt);

  return NextResponse.json({
    ok: true,
    total: rows.length,
    items: rows.slice(0, 200),
    summary: {
      customerCount: customers.length,
      paidCustomers: customers.filter((c) => orders.some((o) => o.customerEmail === c.email && o.status === 'paid')).length,
      totalRevenueUsd: orders.filter((o) => o.status === 'paid').reduce((s, o) => s + (o.amountUsd || 0), 0),
    },
  });
}
