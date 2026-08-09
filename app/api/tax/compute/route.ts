import { NextResponse } from 'next/server';
import { computeTax, parseCsv, type TxRow } from '@/lib/tax';
import { rateLimit, clientIp } from '@/lib/rate-limit';
import { readBlacklist } from '@/lib/blacklist';
import { z } from 'zod';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const schema = z.object({
  csv: z.string().min(1).max(500_000),
});

// 税表审计 · 核算接口
// POST { csv: "date,symbol,type,qty,priceUsd,counterparty\n..." }
// 返回三种成本法（FIFO/LIFO/HIFO）核算结果 + 审计联动标记
export async function POST(req: Request) {
  const ip = clientIp(req);
  const rl = rateLimit(`tax:${ip}`, 20, 60_000);
  if (!rl.ok) return NextResponse.json({ error: '请求过于频繁，请稍后再试' }, { status: 429 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: '参数校验失败：请提交 csv 文本' }, { status: 400 });

  const rows: TxRow[] = parseCsv(parsed.data.csv);
  if (rows.length === 0) return NextResponse.json({ error: '未能解析出有效交易行，请检查 CSV 格式' }, { status: 400 });

  const blacklist = readBlacklist().map((b) => b.address);
  const results = computeTax(rows, blacklist);

  return NextResponse.json({
    ok: true,
    rows: rows.length,
    results,
    disclaimer: '核算结果仅为计算数据，不构成税务意见；重大事项请咨询持牌税务师。',
  });
}
