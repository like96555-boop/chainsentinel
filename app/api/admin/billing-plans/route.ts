import { NextResponse } from 'next/server';
import { isAuthed } from '@/lib/session';
import { z } from 'zod';
import { DEFAULT_PLANS, readPlans, type PlanDef } from '@/lib/billing';
import { readStore, writeStore } from '@/lib/config-store';
import { stripeConfigStatus } from '@/lib/stripe';
import { getUsdtConfig, setUsdtConfig } from '@/lib/usdt';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const planUpdateSchema = z
  .object({
    id: z.enum(['free', 'pro', 'business']).optional(),
    name: z.string().min(1).max(50).optional(),
    priceMonthlyUsd: z.number().int().min(0).max(100000).optional(),
    tokenCount: z.number().int().min(0).max(100).optional(),
    quotaPerDay: z.number().int().min(1).max(100000000).optional(),
    priceId: z.string().max(128).optional(),
    usdtAddress: z.string().max(64).optional(),
  })
  .refine((o) => o.id !== undefined || o.usdtAddress !== undefined, {
    message: '至少提供套餐 id 或 USDT 收款地址之一',
  });

/** GET /api/admin/billing-plans — 套餐与支付配置状态（仅管理员） */
export async function GET(req: Request) {
  if (!isAuthed(req)) return NextResponse.json({ error: '未授权' }, { status: 401 });
  const plans = readPlans();
  const stripe = stripeConfigStatus();
  const usdt = getUsdtConfig();
  return NextResponse.json({
    plans,
    defaults: DEFAULT_PLANS,
    stripe,
    usdt: { address: usdt.address, configured: usdt.address.length > 0, note: 'TRON 主网 USDT(TRC-20) 收款地址（运营自持钱包，非托管）；未配置时 USDT 支付通道自动关闭（503）' },
    webhookHint: 'Stripe Dashboard → Webhooks → 端点：' + (process.env.NEXT_PUBLIC_BASE_URL || 'https://你的域名') + '/api/billing/webhook',
    paymentMethodsHint: '支付方式（卡/Apple Pay/Google Pay/FPS）在 Stripe Dashboard → Settings → Payment methods 勾选，无需改代码',
  });
}

/** PUT /api/admin/billing-plans — 更新套餐配置（仅管理员；价格/配额/PriceID/USDT地址后台可维护） */
export async function PUT(req: Request) {
  if (!isAuthed(req)) return NextResponse.json({ error: '未授权' }, { status: 401 });
  const parsed = planUpdateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || '参数校验失败' }, { status: 400 });
  }
  const { id, usdtAddress, ...planPatch } = parsed.data;
  if (usdtAddress !== undefined) {
    setUsdtConfig(usdtAddress.trim());
  }
  if (id) {
    const { items } = readStore<PlanDef>('billing-plans.json', DEFAULT_PLANS);
    const current = items.length ? items : DEFAULT_PLANS;
    const next = current.map((p) => (p.id === id ? { ...p, ...planPatch } : p));
    writeStore('billing-plans.json', next);
  }
  return NextResponse.json({ ok: true, plans: readPlans(), usdt: { ...getUsdtConfig(), configured: getUsdtConfig().address.length > 0 } });
}
