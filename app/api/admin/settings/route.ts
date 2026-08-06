import { NextResponse } from 'next/server';
import { isAuthed } from '@/lib/session';
import fs from 'fs';
import path from 'path';
import { z } from 'zod';
import { logAudit } from '@/lib/audit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SETTINGS_PATH = path.join(process.cwd(), 'data', 'site-settings.json');

const schema = z.object({
  siteName: z.string().min(1).max(60),
  slogan: z.string().max(100).default(''),
  announcement: z.string().max(300).default(''),
  contactEmail: z.string().email(),
  footerText: z.string().max(300).default(''),
  seoKeywords: z.string().max(200).default(''),
});

export async function GET(req: Request) {
  if (!isAuthed(req)) return NextResponse.json({ error: '未授权' }, { status: 401 });
  try {
    return NextResponse.json({ settings: JSON.parse(fs.readFileSync(SETTINGS_PATH, 'utf8')) });
  } catch {
    return NextResponse.json({ settings: null });
  }
}

export async function PUT(req: Request) {
  if (!isAuthed(req)) return NextResponse.json({ error: '未授权' }, { status: 401 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || '参数校验失败' }, { status: 400 });
  try {
    const dir = path.dirname(SETTINGS_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const tmp = SETTINGS_PATH + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(parsed.data, null, 2), 'utf8');
    fs.renameSync(tmp, SETTINGS_PATH);
    logAudit('站点设置修改', `siteName=${parsed.data.siteName}`, req);
    return NextResponse.json({ ok: true, settings: parsed.data });
  } catch {
    return NextResponse.json({ error: '写入失败' }, { status: 500 });
  }
}
