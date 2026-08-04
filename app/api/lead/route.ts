import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { leadSchema } from '@/lib/validation';
import { rateLimit, clientIp } from '@/lib/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const FILE = path.join(process.cwd(), 'data', 'leads.json');

export async function POST(req: Request) {
  const ip = clientIp(req);
  const rl = rateLimit(`lead:${ip}`, 10, 60_000);
  if (!rl.ok) {
    return NextResponse.json({ error: '提交过于频繁，请稍后再试' }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: '请求体必须是 JSON' }, { status: 400 });
  }
  const parsed = leadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || '参数校验失败' },
      { status: 400 }
    );
  }

  const lead = { ...parsed.data, createdAt: new Date().toISOString(), ip };
  try {
    const dir = path.dirname(FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    let list: unknown[] = [];
    if (fs.existsSync(FILE)) {
      list = JSON.parse(fs.readFileSync(FILE, 'utf8')) as unknown[];
      if (!Array.isArray(list)) list = [];
    }
    list.push(lead);
    fs.writeFileSync(FILE, JSON.stringify(list, null, 2), 'utf8');
  } catch (e) {
    console.error('[ChainSentinel] leads 写入失败', e);
    return NextResponse.json({ error: '服务器存储异常，请稍后再试' }, { status: 500 });
  }
  return NextResponse.json({ ok: true, message: '预约成功，顾问将在 1 个工作日内与您联系。' });
}
