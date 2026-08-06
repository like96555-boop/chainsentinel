import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { isAuthed } from '@/lib/auth';
import { z } from 'zod';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const CONFIG_PATH = path.join(process.cwd(), '..', 'data', 'ai-config.json');

const configSchema = z.object({
  enabled: z.boolean(),
  model: z.string().max(64),
  temperature: z.number().min(0).max(2),
  greeting: z.string().max(300),
  systemPrompt: z.string().max(8000),
  faqItems: z.array(z.string().max(1000)).max(100),
  quickQuestions: z.array(z.string().max(100)).max(10),
});

export async function GET(req: Request) {
  if (!isAuthed(req)) return NextResponse.json({ error: '未授权' }, { status: 401 });
  try {
    const raw = fs.readFileSync(CONFIG_PATH, 'utf8');
    return NextResponse.json({ config: JSON.parse(raw) });
  } catch {
    return NextResponse.json({ error: '配置读取失败' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  if (!isAuthed(req)) return NextResponse.json({ error: '未授权' }, { status: 401 });
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: '请求体必须是 JSON' }, { status: 400 });
  }
  const parsed = configSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || '参数校验失败' }, { status: 400 });
  }
  try {
    const dir = path.dirname(CONFIG_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const tmp = CONFIG_PATH + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(parsed.data, null, 2), 'utf8');
    fs.renameSync(tmp, CONFIG_PATH);
    return NextResponse.json({ ok: true, config: parsed.data });
  } catch (e) {
    console.error('[ai-admin] 配置写入失败', e);
    return NextResponse.json({ error: '配置写入失败' }, { status: 500 });
  }
}
