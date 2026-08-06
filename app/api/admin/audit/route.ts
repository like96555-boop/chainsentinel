import { NextResponse } from 'next/server';
import { isAuthed } from '@/lib/session';
import { readAudit } from '@/lib/audit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// 操作日志（最近 200 条，安全审计用）
export async function GET(req: Request) {
  if (!isAuthed(req)) return NextResponse.json({ error: '未授权' }, { status: 401 });
  const logs = readAudit().map((l) => ({
    ts: l.ts,
    time: new Date(l.ts).toLocaleString('zh-CN', { hour12: false }),
    action: l.action,
    detail: l.detail,
    ip: l.ip,
  }));
  return NextResponse.json({ logs });
}
