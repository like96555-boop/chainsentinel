import { NextResponse } from 'next/server';
import { getStatsSnapshot } from '@/lib/stats';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET /api/stats — 主页实时统计（公开只读，仅返回计数，不含任何地址/明细） */
export async function GET() {
  return NextResponse.json({ ok: true, ...getStatsSnapshot() });
}
