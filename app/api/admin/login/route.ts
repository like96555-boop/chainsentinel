import { NextResponse } from 'next/server';
import { loginSchema } from '@/lib/validation';
import { createSessionToken, sessionCookieHeader, verifyAdminPassword } from '@/lib/session';
import { rateLimit, clientIp } from '@/lib/rate-limit';
import { logAudit } from '@/lib/audit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const ip = clientIp(req);
  const rl = rateLimit(`login:${ip}`, 10, 60_000);
  if (!rl.ok) {
    return NextResponse.json({ error: '尝试过于频繁，请稍后再试' }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: '请求体必须是 JSON' }, { status: 400 });
  }
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: '参数校验失败' }, { status: 400 });
  }
  if (!verifyAdminPassword(parsed.data.password)) {
    logAudit('登录失败', `IP ${ip} 密码错误`);
    return NextResponse.json({ error: '密码错误' }, { status: 401 });
  }
  logAudit('登录成功', `IP ${ip}`);
  return new NextResponse(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': sessionCookieHeader(createSessionToken()),
    },
  });
}
