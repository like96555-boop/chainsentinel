import { NextResponse } from 'next/server';
import { z } from 'zod';
import { registerCustomer } from '@/lib/customer-auth';

export const runtime = 'nodejs';

const schema = z.object({
  email: z.string().max(200),
  password: z.string().min(8).max(200),
});

/** POST /api/auth/register — 客户注册 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: '邮箱或密码格式不正确（密码至少 8 位）' }, { status: 400 });
  }
  const r = registerCustomer(parsed.data.email, parsed.data.password);
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: 409 });
  return NextResponse.json({ ok: true, email: r.email });
}
