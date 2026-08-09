import { NextResponse } from 'next/server';
import { PLANS, effectivePrice, isPromoting } from '@/lib/billing';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET /api/billing/plans — 公开套餐列表（定价区/订阅页展示；定价与促销后台可维护） */
export async function GET() {
  return NextResponse.json({
    plans: PLANS().map((p) => {
      const price = effectivePrice(p);
      return {
        id: p.id,
        name: p.name,
        priceMonthlyUsd: price,
        originalPriceUsd: p.priceMonthlyUsd,
        promoting: isPromoting(p),
        promoEndsAt: p.promoEndsAt || null,
        tokenCount: p.tokenCount,
        quotaPerDay: p.quotaPerDay,
      };
    }),
    currency: 'usd',
    billingNote: '按日计量扣费：每 API 请求计 1 次，超配额自动 402；Stripe / USDT 双通道收款。',
  });
}
