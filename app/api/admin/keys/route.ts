import { NextResponse } from 'next/server';
import { isAuthed } from '@/lib/session';
import { readStore, writeStore, newId, mask } from '@/lib/config-store';
import { z } from 'zod';
import { dayKey } from '@/lib/billing';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type ApiKey = { id: string; name: string; key: string; dailyQuota: number; enabled: boolean; createdAt: number; lastUsedAt: number; usageByDay?: Record<string, number>; plan?: string };

const createSchema = z.object({ name: z.string().min(1).max(50), dailyQuota: z.number().int().min(1).max(1000000).default(1000) });
const updateSchema = z.object({ id: z.string(), enabled: z.boolean().optional(), dailyQuota: z.number().int().min(1).max(1000000).optional(), name: z.string().min(1).max(50).optional() });

export async function GET(req: Request) {
  if (!isAuthed(req)) return NextResponse.json({ error: '未授权' }, { status: 401 });
  const { items } = readStore<ApiKey>('api-keys.json', []);
  const today = dayKey();
  const totals = { usage: 0, today: 0 };
  return NextResponse.json({
    keys: items.map((k) => {
      const usage = Object.values(k.usageByDay || {}).reduce((a, b) => a + b, 0);
      const todayUsage = k.usageByDay?.[today] || 0;
      totals.usage += usage;
      totals.today += todayUsage;
      return {
        ...k,
        key: mask(k.key, 4, 4),
        usageByDay: undefined, // 明细不下发，避免超长响应
        usedToday: todayUsage,
        totalUsage: usage,
      };
    }),
    totals,
  });
}

export async function POST(req: Request) {
  if (!isAuthed(req)) return NextResponse.json({ error: '未授权' }, { status: 401 });
  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || '参数校验失败' }, { status: 400 });
  const { items } = readStore<ApiKey>('api-keys.json', []);
  const key = 'cs_live_' + Array.from(crypto.getRandomValues(new Uint8Array(18))).map((b) => b.toString(16).padStart(2, '0')).join('');
  const item: ApiKey = { id: newId(), name: parsed.data.name, key, dailyQuota: parsed.data.dailyQuota, enabled: true, createdAt: Date.now(), lastUsedAt: 0 };
  writeStore('api-keys.json', [...items, item]);
  return NextResponse.json({ ok: true, key: { ...item, key: `${item.key.slice(0, 8)}…${item.key.slice(-4)}`, fullKey: item.key } });
}

export async function PUT(req: Request) {
  if (!isAuthed(req)) return NextResponse.json({ error: '未授权' }, { status: 401 });
  const parsed = updateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || '参数校验失败' }, { status: 400 });
  const { items } = readStore<ApiKey>('api-keys.json', []);
  const next = items.map((k) => (k.id === parsed.data.id ? { ...k, ...parsed.data } : k));
  if (!next.some((k) => k.id === parsed.data.id)) return NextResponse.json({ error: '令牌不存在' }, { status: 404 });
  writeStore('api-keys.json', next);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  if (!isAuthed(req)) return NextResponse.json({ error: '未授权' }, { status: 401 });
  const id = new URL(req.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: '缺少 id' }, { status: 400 });
  const { items } = readStore<ApiKey>('api-keys.json', []);
  writeStore('api-keys.json', items.filter((k) => k.id !== id));
  return NextResponse.json({ ok: true });
}
