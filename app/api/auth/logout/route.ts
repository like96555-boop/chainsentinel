import { NextRequest, NextResponse } from 'next/server';
import { logoutCustomer, CUSTOMER_SESSION_COOKIE } from '@/lib/customer-auth';

export const runtime = 'nodejs';

/** POST /api/auth/logout — 注销 */
export async function POST(req: NextRequest) {
  const token = req.cookies.get(CUSTOMER_SESSION_COOKIE)?.value;
  if (token) logoutCustomer(token);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(CUSTOMER_SESSION_COOKIE, '', { httpOnly: true, path: '/', maxAge: 0 });
  return res;
}
