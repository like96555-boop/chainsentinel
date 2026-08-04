import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { isAuthed } from '@/lib/session';
import { readBlacklist } from '@/lib/blacklist';
import { getSecret } from '@/lib/secrets';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const STARTED = Date.now();

export async function GET(req: Request) {
  if (!isAuthed(req)) return NextResponse.json({ error: '未授权' }, { status: 401 });

  // TronGrid 连通性（仅探测公共端点，不带 key 也可）
  let trongrid: { ok: boolean; latencyMs: number | null; status: number | null } = {
    ok: false,
    latencyMs: null,
    status: null,
  };
  const t0 = Date.now();
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 6000);
    const res = await fetch('https://api.trongrid.io/wallet/getnowblock', {
      signal: ctrl.signal,
      cache: 'no-store',
    });
    clearTimeout(timer);
    trongrid = { ok: res.ok, latencyMs: Date.now() - t0, status: res.status };
  } catch {
    trongrid = { ok: false, latencyMs: Date.now() - t0, status: null };
  }

  // 预约线索
  let leads: unknown[] = [];
  const leadFile = path.join(process.cwd(), 'data', 'leads.json');
  try {
    if (fs.existsSync(leadFile)) {
      const parsed = JSON.parse(fs.readFileSync(leadFile, 'utf8'));
      if (Array.isArray(parsed)) leads = parsed;
    }
  } catch {
    leads = [];
  }

  return NextResponse.json({
    trongrid,
    secrets: {
      kimiConfigured: getSecret('KIMI_API_KEY').length > 0,
      kimiBaseUrlConfigured: getSecret('KIMI_BASE_URL').length > 0,
      trongridKeyConfigured: getSecret('TRONGRID_API_KEY').length > 0,
    },
    blacklistCount: readBlacklist().length,
    leads,
    uptimeSec: Math.floor((Date.now() - STARTED) / 1000),
    node: process.version,
  });
}
