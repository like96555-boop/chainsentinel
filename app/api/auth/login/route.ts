import { NextResponse } from 'next/server';
import { z } from 'zod';
import { loginCustomer, CUSTOMER_SESSION_COOKIE } from '@/lib/customer-auth';

export const runtime = 'nodejs';

const schema = z.object({
  email: z.string().max(200),
  password: z.string().min(1).max(200),
});

/** POST /api/auth/login — 客户登录（HttpOnly Cookie 会话） */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: '参数错误' }, { status: 400 });

  const r = loginCustomer(parsed.data.email, parsed.data.password);
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: 401 });

  const res = NextResponse.json({ ok: true, email: r.email });
  res.cookies.set(CUSTOMER_SESSION_COOKIE, r.token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 30 * 86_400,
  });
  return res;
}
