import { NextResponse } from 'next/server';
import { isAuthed } from '@/lib/session';
import { usageSnapshot } from '@/lib/billing';
import { readOrders } from '@/lib/orders';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET /api/admin/billing — 后台：用量统计 + 订阅订单（仅管理员） */
export async function GET(req: Request) {
  if (!isAuthed(req)) return NextResponse.json({ error: '未授权' }, { status: 401 });
  const usage = usageSnapshot();
  const orders = readOrders()
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 50)
    .map((o) => ({
      id: o.id,
      planId: o.planId,
      customerEmail: o.customerEmail,
      amountUsd: o.amountUsd,
      status: o.status,
      createdAt: o.createdAt,
    }));
  return NextResponse.json({ usage, orders });
}
