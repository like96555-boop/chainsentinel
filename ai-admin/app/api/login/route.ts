import { NextResponse } from 'next/server';
import { createToken, AI_ADMIN_PASSWORD, COOKIE_NAME } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: '请求体必须是 JSON' }, { status: 400 });
  }
  const password = (body as { password?: unknown })?.password;
  if (typeof password !== 'string' || password.length > 200) {
    return NextResponse.json({ error: '参数校验失败' }, { status: 400 });
  }
  if (!AI_ADMIN_PASSWORD) {
    return NextResponse.json({ error: '服务未配置 AI_ADMIN_PASSWORD（项目根 .env），无法登录' }, { status: 500 });
  }
  if (password !== AI_ADMIN_PASSWORD) {
    return NextResponse.json({ error: '密码错误' }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true });
  res.headers.set(
    'Set-Cookie',
    `${COOKIE_NAME}=${createToken()}; Path=/; HttpOnly; SameSite=Lax; Max-Age=7200`
  );
  return res;
}
