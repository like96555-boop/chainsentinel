import { NextResponse } from 'next/server';
import { isAuthed } from '@/lib/session';
import { readStore, writeStore, newId } from '@/lib/config-store';
import { z } from 'zod';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// 黑名单库管理：警示榜与 /api/check 黑名单命中的数据源（后台化，不再靠改文件）
type BlackItem = { id: string; address: string; chain: 'tron' | 'btc' | 'eth' | 'any'; label: string; type: string; notes: string; source: string; level: string };

const schema = z.object({
  id: z.string().optional(),
  address: z.string().min(5).max(100),
  chain: z.enum(['tron', 'btc', 'eth', 'any']),
  label: z.string().min(1).max(50),
  type: z.enum(['phishing', 'laundering', 'mixer', 'fraud']).default('phishing'),
  notes: z.string().max(300).default(''),
});

const FILE = 'blacklist.json';

export async function GET(req: Request) {
  if (!isAuthed(req)) return NextResponse.json({ error: '未授权' }, { status: 401 });
  const { items } = readStore<BlackItem>(FILE, []);
  return NextResponse.json({ items });
}

export async function POST(req: Request) {
  if (!isAuthed(req)) return NextResponse.json({ error: '未授权' }, { status: 401 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || '参数校验失败' }, { status: 400 });
  const { items } = readStore<BlackItem>(FILE, []);
  if (items.some((b) => b.address === parsed.data.address)) return NextResponse.json({ error: '该地址已在黑名单中' }, { status: 409 });
  const item: BlackItem = { id: newId(), ...parsed.data, source: 'manual', level: 'red' };
  writeStore(FILE, [...items, item]);
  return NextResponse.json({ ok: true, item });
}

export async function PUT(req: Request) {
  if (!isAuthed(req)) return NextResponse.json({ error: '未授权' }, { status: 401 });
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success || !body?.id) return NextResponse.json({ error: parsed.success ? '缺少 id' : parsed.error.issues[0]?.message || '参数校验失败' }, { status: 400 });
  const { items } = readStore<BlackItem>(FILE, []);
  const next = items.map((b) => (b.id === body.id ? { ...b, ...parsed.data, source: 'manual' } : b));
  if (!next.some((b) => b.id === body.id)) return NextResponse.json({ error: '条目不存在' }, { status: 404 });
  writeStore(FILE, next);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  if (!isAuthed(req)) return NextResponse.json({ error: '未授权' }, { status: 401 });
  const id = new URL(req.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: '缺少 id' }, { status: 400 });
  const { items } = readStore<BlackItem>(FILE, []);
  writeStore(FILE, items.filter((b) => b.id !== id));
  return NextResponse.json({ ok: true });
}
