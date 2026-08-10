import { NextRequest, NextResponse } from 'next/server';
import { customerOf, CUSTOMER_SESSION_COOKIE } from '@/lib/customer-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET /api/auth/me — 当前登录客户（无登录返回 401） */
export async function GET(req: NextRequest) {
  const email = customerOf(req.cookies.get(CUSTOMER_SESSION_COOKIE)?.value);
  if (!email) return NextResponse.json({ error: '未登录' }, { status: 401 });
  return NextResponse.json({ ok: true, email });
}
