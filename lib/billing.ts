// 链哨 · API 订阅计量扣费引擎
// 令牌（cs_live_*）即计量单位：每次携带令牌的 API 请求计 1 次，按日配额扣减，超配额返回 402。
// 数据落盘 data/api-keys.json（条目扩展 usageByDay / plan / periodEndsAt 字段，向后兼容旧条目）。
// 订阅状态机：active(有效) / past_due(逾期) / canceled(已取消) / trialing(试用)
// 设计原则：计量先于业务——认证失败/超配额直接短路，不进入下游查询。

import fs from 'fs';
import path from 'path';
import { readStore, writeStore } from './config-store';

export type SubscriptionStatus = 'trialing' | 'active' | 'past_due' | 'canceled';

export interface ApiKeyEntry {
  id: string;
  name: string;
  key: string;
  dailyQuota: number;
  enabled: boolean;
  createdAt: number;
  lastUsedAt: number;
  /** 按自然日（Asia/Shanghai）累计用量 */
  usageByDay?: Record<string, number>;
  /** 套餐名（free / pro / business） */
  plan?: string;
  /** 订阅周期结束时间戳（续费后顺延） */
  periodEndsAt?: number;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  subscriptionStatus?: SubscriptionStatus;
}

export interface PlanDef {
  id: 'free' | 'pro' | 'business';
  name: string;
  priceMonthlyUsd: number;
  /** 包含令牌数 */
  tokenCount: number;
  /** 每令牌日配额 */
  quotaPerDay: number;
  priceId: string; // Stripe Price ID（未配置时留空，mock 模式忽略）
  /** 促销价（USD/月）；与 promoEndsAt 同时生效时前台按促销价收款 */
  promoPriceUsd?: number;
  /** 促销截止时间戳（ms） */
  promoEndsAt?: number;
}

/** 当前生效价格：促销期内返回促销价，否则原价 */
export function effectivePrice(p: PlanDef): number {
  if (
    typeof p.promoPriceUsd === 'number' &&
    p.promoPriceUsd >= 0 &&
    typeof p.promoEndsAt === 'number' &&
    p.promoEndsAt > Date.now()
  ) {
    return p.promoPriceUsd;
  }
  return p.priceMonthlyUsd;
}

/** 是否促销中 */
export function isPromoting(p: PlanDef): boolean {
  return effectivePrice(p) !== p.priceMonthlyUsd;
}

/** 套餐定义（定价可在后台维护：data/billing-plans.json；未配置时用以下默认值） */
export const DEFAULT_PLANS: PlanDef[] = [
  { id: 'free', name: '免费版', priceMonthlyUsd: 0, tokenCount: 0, quotaPerDay: 100, priceId: '' },
  { id: 'pro', name: '专业版', priceMonthlyUsd: 29, tokenCount: 1, quotaPerDay: 1000, priceId: '' },
  { id: 'business', name: '商业版', priceMonthlyUsd: 199, tokenCount: 5, quotaPerDay: 10000, priceId: '' },
];

const PLANS_FILE = 'billing-plans.json';

/** 读取套餐：后台配置优先（data/billing-plans.json），缺省回退默认值 */
export function readPlans(): PlanDef[] {
  const { items } = readStore<PlanDef>(PLANS_FILE, DEFAULT_PLANS);
  if (!items.length) return DEFAULT_PLANS;
  // 校验/兜底：必须包含三档且字段完整
  const byId = new Map(items.map((p) => [p.id, p]));
  const merged = DEFAULT_PLANS.map((d) => ({ ...d, ...(byId.get(d.id) || {}) }));
  return merged;
}

export function PLANS(): PlanDef[] {
  return readPlans();
}

export function planOf(id: string): PlanDef | undefined {
  return readPlans().find((p) => p.id === id);
}

/** 自然日键（Asia/Shanghai，避免服务器 UTC 跨日错乱） */
export function dayKey(ts: number | Date = Date.now()): string {
  const t = typeof ts === 'number' ? ts : ts.getTime();
  return new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
    .format(t)
    .replace(/\//g, '-');
}

/** 读全部令牌（带用量字段兜底） */
export function readKeys(): ApiKeyEntry[] {
  const { items } = readStore<ApiKeyEntry>('api-keys.json', []);
  return items.map((k) => ({ ...k, usageByDay: k.usageByDay || {} }));
}

function persist(keys: ApiKeyEntry[]): void {
  writeStore('api-keys.json', keys);
}

/** 按明文令牌查找 */
export function findByToken(token: string): ApiKeyEntry | null {
  return readKeys().find((k) => k.key === token) || null;
}

export interface AuthResult {
  ok: boolean;
  status?: number;
  /** 未携带令牌（true）vs 令牌无效/停用/超配额（false/undefined） */
  missing?: boolean;
  error?: string;
  key?: ApiKeyEntry;
  usedToday?: number;
  remaining?: number;
}

/**
 * 认证并计量一次 API 请求：
 * - 无 Authorization 头 → ok:false,status:401（调用方可决定是否放行免费层）
 * - 令牌不存在 → 401；已停用 → 403
 * - 当日用量已达配额 → 402（需付费/升级）
 * - 正常：用量 +1 落盘，返回剩余额度
 */
export function authenticateKey(req: Request): AuthResult {
  const auth = req.headers.get('authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  if (!token) {
    return { ok: false, status: 401, missing: true, error: '缺少 API 令牌。请在请求头携带 Authorization: Bearer <cs_live_xxx>' };
  }

  const keys = readKeys();
  const key = keys.find((k) => k.key === token);
  if (!key) {
    return { ok: false, status: 401, error: 'API 令牌无效或已吊销' };
  }
  if (!key.enabled) {
    return { ok: false, status: 403, error: 'API 令牌已停用，请联系管理员' };
  }

  const today = dayKey();
  const usedToday = key.usageByDay?.[today] || 0;
  const quota = key.dailyQuota > 0 ? key.dailyQuota : 0;
  if (quota > 0 && usedToday >= quota) {
    return {
      ok: false,
      status: 402,
      error: `当日配额已用完（${usedToday}/${quota}）。请升级套餐或等待次日重置。`,
      key,
      usedToday,
      remaining: 0,
    };
  }

  // 计量落盘：用量 +1，更新 lastUsedAt
  const next = keys.map((k) => {
    if (k.key !== token) return k;
    return {
      ...k,
      usageByDay: { ...(k.usageByDay || {}), [today]: usedToday + 1 },
      lastUsedAt: Date.now(),
    };
  });
  try {
    persist(next);
  } catch (e) {
    // 落盘失败不阻断业务（计量尽力而为），但记录
    console.error('[billing] 用量落盘失败', e);
  }
  return {
    ok: true,
    key: next.find((k) => k.key === token),
    usedToday: usedToday + 1,
    remaining: Math.max(0, quota - (usedToday + 1)),
  };
}

/** 后台用量快照（今日/总用量/7 日趋势），供后台模块展示 */
export function usageSnapshot(): {
  keys: Array<{
    id: string;
    name: string;
    maskedKey: string;
    enabled: boolean;
    plan: string;
    dailyQuota: number;
    usedToday: number;
    totalUsage: number;
    lastUsedAt: number;
    status: string;
  }>;
  totals: { totalUsage: number; todayUsage: number };
  trend: Array<{ date: string; count: number }>;
} {
  const keys = readKeys();
  const today = dayKey();
  const last7: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86_400_000);
    last7.push(dayKey(d));
  }
  const trend = last7.map((date) => {
    let count = 0;
    for (const k of keys) count += k.usageByDay?.[date] || 0;
    return { date, count };
  });
  let totalUsage = 0;
  let todayUsage = 0;
  const rows = keys.map((k) => {
    const u = Object.values(k.usageByDay || {}).reduce((a, b) => a + b, 0);
    const t = k.usageByDay?.[today] || 0;
    totalUsage += u;
    todayUsage += t;
    return {
      id: k.id,
      name: k.name,
      maskedKey: `${k.key.slice(0, 8)}…${k.key.slice(-4)}`,
      enabled: k.enabled,
      plan: k.plan || 'free',
      dailyQuota: k.dailyQuota,
      usedToday: t,
      totalUsage: u,
      lastUsedAt: k.lastUsedAt,
      status: k.subscriptionStatus || (k.enabled ? 'active' : 'disabled'),
    };
  });
  return { keys: rows, totals: { totalUsage, todayUsage }, trend };
}

/** 订阅创建：生成令牌并按套餐设定配额（供 checkout 完成回调 / mock 流程调用） */
export function activateSubscription(opts: {
  planId: 'pro' | 'business';
  customerEmail: string;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  periodEndsAt?: number;
}): { keys: ApiKeyEntry[]; created: ApiKeyEntry[] } {
  const plan = planOf(opts.planId);
  if (!plan) throw new Error('未知套餐: ' + opts.planId);
  const keys = readKeys();
  const created: ApiKeyEntry[] = [];
  const tokenCount = plan.tokenCount;
  for (let i = 0; i < tokenCount; i++) {
    const raw = Array.from(crypto.getRandomValues(new Uint8Array(18)))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
    const item: ApiKeyEntry = {
      id: Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4),
      name: `${plan.name}令牌${tokenCount > 1 ? ` ${i + 1}` : ''}`,
      key: 'cs_live_' + raw,
      dailyQuota: plan.quotaPerDay,
      enabled: true,
      createdAt: Date.now(),
      lastUsedAt: 0,
      usageByDay: {},
      plan: plan.id,
      periodEndsAt: opts.periodEndsAt,
      stripeCustomerId: opts.stripeCustomerId,
      stripeSubscriptionId: opts.stripeSubscriptionId,
      subscriptionStatus: 'active',
    };
    keys.push(item);
    created.push(item);
  }
  persist(keys);
  return { keys, created };
}

/** 订阅终止：停用该订阅下的所有令牌（保留数据，历史用量可查） */
export function deactivateSubscription(stripeSubscriptionId: string): void {
  const keys = readKeys().map((k) =>
    k.stripeSubscriptionId === stripeSubscriptionId ? { ...k, enabled: false, subscriptionStatus: 'canceled' as const } : k
  );
  persist(keys);
}

/** 续费/周期延长：重置周期并保持启用 */
export function renewSubscription(stripeSubscriptionId: string, periodEndsAt: number): void {
  const keys = readKeys().map((k) =>
    k.stripeSubscriptionId === stripeSubscriptionId
      ? { ...k, enabled: true, subscriptionStatus: 'active' as const, periodEndsAt }
      : k
  );
  persist(keys);
}
