import { NextResponse } from 'next/server';
import { checkSchema } from '@/lib/validation';
import { rateLimit, clientIp } from '@/lib/rate-limit';
import { authenticateKey } from '@/lib/billing';
import { performAddressCheck } from '@/lib/check-engine';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  // 0) API 计量：携带令牌（Bearer cs_live_*）走订阅计量扣费；未携带走免费层（IP 限流）
  const auth = authenticateKey(req);
  if (!auth.ok) {
    // 带了令牌但无效/停用/超配额 → 直接拒绝（不允许降级免费层绕过认证）
    if (!auth.missing) {
      return NextResponse.json(
        { error: auth.error, quota: auth.key ? { usedToday: auth.usedToday, remaining: auth.remaining } : undefined },
        { status: auth.status || 401 }
      );
    }
    // 未带令牌 → 免费层（IP 限流）
    const ip = clientIp(req);
    const rl = rateLimit(`check:${ip}`, 10, 60_000);
    if (!rl.ok) {
      return NextResponse.json({ error: '请求过于频繁，请稍后再试（每 IP 每分钟 10 次）' }, { status: 429 });
    }
  }
  const quota = auth.ok
    ? { usedToday: auth.usedToday, remaining: auth.remaining, plan: auth.key?.plan || 'free' }
    : null;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: '请求体必须是 JSON' }, { status: 400 });
  }
  const parsed = checkSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || '参数校验失败' },
      { status: 400 }
    );
  }

  const result = await performAddressCheck(parsed.data.address.trim(), quota);
  return NextResponse.json(result.body, { status: result.status });
}
