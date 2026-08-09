import { NextResponse } from 'next/server';
import { z } from 'zod';
import { findByToken, dayKey } from '@/lib/billing';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const usageSchema = z.object({ token: z.string().min(8).max(80).regex(/^cs_/, '令牌格式不正确（cs_ 开头）') }).strict();

/**
 * GET /api/billing/usage?token=cs_live_xxx — 查询某令牌的用量（仅返回该令牌自身数据）
 * 供客户中心「我的令牌」输入查询；不暴露其他令牌信息。
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const parsed = usageSchema.safeParse({ token: url.searchParams.get('token') || '' });
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || '参数校验失败' }, { status: 400 });
  }
  const key = findByToken(parsed.data.token);
  if (!key) return NextResponse.json({ error: '令牌不存在或已吊销' }, { status: 404 });
  if (!key.enabled) return NextResponse.json({ error: '令牌已停用' }, { status: 403 });
  const today = dayKey();
  const usageByDay = key.usageByDay || {};
  const totalUsage = Object.values(usageByDay).reduce((a, b) => a + b, 0);
  const last7: Array<{ date: string; count: number }> = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86_400_000);
    const k = new Intl.DateTimeFormat('zh-CN', {
      timeZone: 'Asia/Shanghai',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
      .format(d)
      .replace(/\//g, '-');
    last7.push({ date: k, count: usageByDay[k] || 0 });
  }
  return NextResponse.json({
    token: `${key.key.slice(0, 8)}…${key.key.slice(-4)}`,
    name: key.name,
    plan: key.plan || 'custom',
    dailyQuota: key.dailyQuota,
    usedToday: usageByDay[today] || 0,
    remainingToday: Math.max(0, key.dailyQuota - (usageByDay[today] || 0)),
    totalUsage,
    periodEndsAt: key.periodEndsAt || null,
    lastUsedAt: key.lastUsedAt,
    trend: last7,
  });
}
