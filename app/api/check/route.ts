import { NextResponse } from 'next/server';
import { checkSchema } from '@/lib/validation';
import { rateLimit, clientIp } from '@/lib/rate-limit';
import { findInBlacklist } from '@/lib/blacklist';
import { scoreAddress } from '@/lib/tron';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const ip = clientIp(req);
  const rl = rateLimit(`check:${ip}`, 10, 60_000);
  if (!rl.ok) {
    return NextResponse.json({ error: '请求过于频繁，请稍后再试（每 IP 每分钟 10 次）' }, { status: 429 });
  }

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

  const { address } = parsed.data;

  // 黑名单命中 = 红色短路
  const hit = findInBlacklist(address);
  if (hit) {
    return NextResponse.json({
      level: 'red',
      score: 5,
      reasons: [
        `命中本地风险标签库：${hit.label}`,
        `标签备注：${hit.note}`,
        '建议立即停止与该地址的一切资金往来。',
      ],
      evidenceLinks: [`https://tronscan.org/#/address/${address}`],
      blacklist: { label: hit.label, source: hit.source },
      stats: null,
      trongridReachable: true,
    });
  }

  const result = await scoreAddress(address);
  return NextResponse.json(result);
}
