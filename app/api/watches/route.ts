import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { customerOf, CUSTOMER_SESSION_COOKIE } from '@/lib/customer-auth';
import { listWatches, addWatch, removeWatch, guessChain } from '@/lib/customer-watches';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function emailOf(req: NextRequest): string | null {
  return customerOf(req.cookies.get(CUSTOMER_SESSION_COOKIE)?.value);
}

/** GET /api/watches — 我的监控钱包列表（登录） */
export async function GET(req: NextRequest) {
  const email = emailOf(req);
  if (!email) return NextResponse.json({ error: '请先登录' }, { status: 401 });
  return NextResponse.json({ ok: true, items: listWatches(email) });
}

const addSchema = z.object({
  address: z.string().min(10).max(64),
  name: z.string().max(50).optional(),
});

/** POST /api/watches — 添加监控地址（登录） */
export async function POST(req: NextRequest) {
  const email = emailOf(req);
  if (!email) return NextResponse.json({ error: '请先登录' }, { status: 401 });
  const body = await req.json().catch(() => null);
  const parsed = addSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: '参数错误' }, { status: 400 });
  const r = addWatch(email, parsed.data.address, parsed.data.name || '');
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: 400 });
  return NextResponse.json({ ok: true, item: r.item });
}

/** DELETE /api/watches?address= — 删除监控地址（登录） */
export async function DELETE(req: NextRequest) {
  const email = emailOf(req);
  if (!email) return NextResponse.json({ error: '请先登录' }, { status: 401 });
  const address = new URL(req.url).searchParams.get('address') || '';
  if (!guessChain(address)) return NextResponse.json({ error: '地址格式不正确' }, { status: 400 });
  removeWatch(email, address);
  return NextResponse.json({ ok: true });
}
