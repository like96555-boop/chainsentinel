import { NextResponse } from 'next/server';
import { PLANS } from '@/lib/billing';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET /api/billing/plans — 公开套餐列表（定价区/订阅页展示；定价后台可维护） */
export async function GET() {
  return NextResponse.json({
    plans: PLANS().map((p) => ({
      id: p.id,
      name: p.name,
      priceMonthlyUsd: p.priceMonthlyUsd,
      tokenCount: p.tokenCount,
      quotaPerDay: p.quotaPerDay,
    })),
    currency: 'usd',
    billingNote: '按日计量扣费：每 API 请求计 1 次，超配额自动 402；Stripe 安全收款。',
  });
}
