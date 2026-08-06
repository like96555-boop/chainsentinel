import { NextResponse } from 'next/server';
import { isAuthed } from '@/lib/session';
import { readStore, writeStore, newId, mask } from '@/lib/config-store';
import { z } from 'zod';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const EVENTS = ['address.flagged', 'address.checked', 'payment.blocked', 'smartmoney.activity'] as const;

type Webhook = { id: string; name: string; url: string; events: string[]; secret: string; enabled: boolean; createdAt: number; lastSentAt: number };

const schema = z.object({
  id: z.string().optional(),
  name: z.string().min(1).max(50),
  url: z.string().url(),
  events: z.array(z.enum(EVENTS)).min(1),
  enabled: z.boolean().default(true),
});

export async function GET(req: Request) {
  if (!isAuthed(req)) return NextResponse.json({ error: '未授权' }, { status: 401 });
  const { items } = readStore<Webhook>('webhooks.json', []);
  return NextResponse.json({ webhooks: items.map((w) => ({ ...w, secret: w.secret ? mask(w.secret, 0, 4) : '' })) });
}

export async function POST(req: Request) {
  if (!isAuthed(req)) return NextResponse.json({ error: '未授权' }, { status: 401 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || '参数校验失败' }, { status: 400 });
  const { items } = readStore<Webhook>('webhooks.json', []);
  const item: Webhook = { id: newId(), name: parsed.data.name, url: parsed.data.url, events: [...parsed.data.events], secret: '', enabled: parsed.data.enabled, createdAt: Date.now(), lastSentAt: 0 };
  writeStore('webhooks.json', [...items, item]);
  return NextResponse.json({ ok: true, webhook: item });
}

export async function PUT(req: Request) {
  if (!isAuthed(req)) return NextResponse.json({ error: '未授权' }, { status: 401 });
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success || !body?.id) return NextResponse.json({ error: parsed.success ? '缺少 id' : parsed.error.issues[0]?.message || '参数校验失败' }, { status: 400 });
  const { items } = readStore<Webhook>('webhooks.json', []);
  const next = items.map((w) => (w.id === body.id ? { ...w, name: parsed.data.name, url: parsed.data.url, events: [...parsed.data.events], enabled: parsed.data.enabled } : w));
  if (!next.some((w) => w.id === body.id)) return NextResponse.json({ error: 'Webhook 不存在' }, { status: 404 });
  writeStore('webhooks.json', next);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  if (!isAuthed(req)) return NextResponse.json({ error: '未授权' }, { status: 401 });
  const id = new URL(req.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: '缺少 id' }, { status: 400 });
  const { items } = readStore<Webhook>('webhooks.json', []);
  writeStore('webhooks.json', items.filter((w) => w.id !== id));
  return NextResponse.json({ ok: true });
}
