import { NextResponse } from 'next/server';
import { isAuthed } from '@/lib/session';
import { readStore, writeStore, newId } from '@/lib/config-store';
import { z } from 'zod';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const POSITIONS = ['home-top', 'home-pricing', 'alerts-top', 'smartmoney-top'] as const;

type Banner = {
  id: string; position: string; title: string; subtitle: string; emoji: string;
  bg: string; linkUrl: string; enabled: boolean; sort: number; createdAt: number;
};

const schema = z.object({
  id: z.string().optional(),
  position: z.enum(POSITIONS),
  title: z.string().min(1).max(60),
  subtitle: z.string().max(120).default(''),
  emoji: z.string().max(8).default('📣'),
  bg: z.string().max(40).default('from-cyan-500/20 to-blue-600/10'),
  linkUrl: z.string().max(300).default(''),
  enabled: z.boolean().default(true),
  sort: z.number().int().default(0),
});

export async function GET(req: Request) {
  if (!isAuthed(req)) return NextResponse.json({ error: '未授权' }, { status: 401 });
  const { items } = readStore<Banner>('banners.json', []);
  return NextResponse.json({ banners: items.sort((a, b) => a.sort - b.sort) });
}

export async function POST(req: Request) {
  if (!isAuthed(req)) return NextResponse.json({ error: '未授权' }, { status: 401 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || '参数校验失败' }, { status: 400 });
  const { items } = readStore<Banner>('banners.json', []);
  const item: Banner = { id: newId(), ...parsed.data, createdAt: Date.now() };
  writeStore('banners.json', [...items, item]);
  return NextResponse.json({ ok: true, banner: item });
}

export async function PUT(req: Request) {
  if (!isAuthed(req)) return NextResponse.json({ error: '未授权' }, { status: 401 });
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success || !body?.id) return NextResponse.json({ error: parsed.success ? '缺少 id' : parsed.error.issues[0]?.message || '参数校验失败' }, { status: 400 });
  const { items } = readStore<Banner>('banners.json', []);
  const next = items.map((b) => (b.id === body.id ? { ...b, ...parsed.data } : b));
  if (!next.some((b) => b.id === body.id)) return NextResponse.json({ error: '横幅不存在' }, { status: 404 });
  writeStore('banners.json', next);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  if (!isAuthed(req)) return NextResponse.json({ error: '未授权' }, { status: 401 });
  const id = new URL(req.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: '缺少 id' }, { status: 400 });
  const { items } = readStore<Banner>('banners.json', []);
  writeStore('banners.json', items.filter((b) => b.id !== id));
  return NextResponse.json({ ok: true });
}
