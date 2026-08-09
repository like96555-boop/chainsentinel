import { NextResponse } from 'next/server';
import { isAuthed } from '@/lib/session';
import { readStore, writeStore, newId } from '@/lib/config-store';
import { z } from 'zod';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// 黑名单批量导入（外部威胁情报源 → 入库，来源统一标注 external-intel）
// POST { entries: [{ address, chain, label, type, notes }] } 最多 500 条/次
const entrySchema = z.object({
  address: z.string().min(5).max(100).refine((v) => {
    if (/^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(v)) return true;
    if (/^0x[0-9a-fA-F]{40}$/.test(v)) return true;
    if (/^(bc1[ac-hj-np-z02-9]{11,71}|[13][a-km-zA-HJ-NP-Z1-9]{25,34})$/.test(v)) return true;
    return false;
  }, { message: '地址格式不正确' }),
  chain: z.enum(['tron', 'btc', 'eth', 'any']),
  label: z.string().min(1).max(50),
  type: z.enum(['phishing', 'laundering', 'mixer', 'fraud']).default('phishing'),
  notes: z.string().max(300).default(''),
});

export async function POST(req: Request) {
  if (!isAuthed(req)) return NextResponse.json({ error: '未授权' }, { status: 401 });
  const body = await req.json().catch(() => null);
  const entries = Array.isArray(body?.entries) ? body.entries : null;
  if (!entries) return NextResponse.json({ error: '请提交 entries 数组' }, { status: 400 });
  if (entries.length === 0) return NextResponse.json({ error: 'entries 为空' }, { status: 400 });
  if (entries.length > 500) return NextResponse.json({ error: '单次最多 500 条' }, { status: 400 });

  const { items } = readStore<any>('blacklist.json', []);
  const existing = new Set(items.map((b) => b.address));
  let added = 0, skipped = 0;
  const errors: string[] = [];

  for (const raw of entries) {
    const parsed = entrySchema.safeParse(raw);
    if (!parsed.success) { skipped++; errors.push(`${raw?.address || '(空地址)'}: ${parsed.error.issues[0]?.message || '格式错误'}`); continue; }
    if (existing.has(parsed.data.address)) { skipped++; continue; }
    items.push({
      id: newId(),
      ...parsed.data,
      source: raw.source || 'external-intel', // 情报源导入统一标注
      level: 'red',
    });
    existing.add(parsed.data.address);
    added++;
  }

  if (added > 0) writeStore('blacklist.json', items);
  return NextResponse.json({ ok: true, added, skipped, errors: errors.slice(0, 10) });
}
