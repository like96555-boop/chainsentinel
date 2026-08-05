import { NextResponse } from 'next/server';
import { smartMoneyItemSchema, smartMoneyUpdateSchema } from '@/lib/validation';
import { isAuthed } from '@/lib/session';
import {
  assertChainMatches,
  readSmartMoneySeeds,
  writeSmartMoneySeeds,
} from '@/lib/smart-money';
import type { SmartMoneySeed } from '@/lib/smart-money';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function requireAuth(req: Request): NextResponse | null {
  if (!isAuthed(req)) {
    return NextResponse.json({ error: '未登录或会话已过期' }, { status: 401 });
  }
  return null;
}

/** 统一返回写回后的列表 */
function respondWithList(): NextResponse {
  const seeds = readSmartMoneySeeds();
  return NextResponse.json({
    ok: true,
    items: seeds.map((s) => ({
      address: s.address,
      chain: s.chain,
      name: s.name,
      enabled: s.enabled !== false,
      demo: !!s.demo,
    })),
  });
}

/** GET /api/admin/smart-money — 监控列表（配置视图，不触发链上查询） */
export async function GET(req: Request) {
  const denied = requireAuth(req);
  if (denied) return denied;
  return respondWithList();
}

/** POST /api/admin/smart-money — 新增监控地址 */
export async function POST(req: Request) {
  const denied = requireAuth(req);
  if (denied) return denied;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: '请求体必须是 JSON' }, { status: 400 });
  }
  const parsed = smartMoneyItemSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || '参数校验失败' },
      { status: 400 }
    );
  }
  const { address, chain, name, enabled } = parsed.data;
  if (!assertChainMatches(address, chain)) {
    return NextResponse.json({ error: `地址格式与所选链（${chain.toUpperCase()}）不匹配` }, { status: 400 });
  }
  const seeds = readSmartMoneySeeds();
  if (seeds.some((s) => s.address.toLowerCase() === address.toLowerCase())) {
    return NextResponse.json({ error: '该地址已在监控列表中' }, { status: 409 });
  }
  const next: SmartMoneySeed[] = [...seeds, { address, chain, name, enabled, demo: false }];
  writeSmartMoneySeeds(next);
  return respondWithList();
}

/** PUT /api/admin/smart-money — 更新监控地址（name / chain / enabled） */
export async function PUT(req: Request) {
  const denied = requireAuth(req);
  if (denied) return denied;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: '请求体必须是 JSON' }, { status: 400 });
  }
  const parsed = smartMoneyUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || '参数校验失败' },
      { status: 400 }
    );
  }
  const { address, ...patch } = parsed.data;
  const seeds = readSmartMoneySeeds();
  const idx = seeds.findIndex((s) => s.address.toLowerCase() === address.toLowerCase());
  if (idx < 0) {
    return NextResponse.json({ error: '地址不在监控列表中' }, { status: 404 });
  }
  if (patch.chain && !assertChainMatches(seeds[idx].address, patch.chain)) {
    return NextResponse.json({ error: `地址格式与所选链（${patch.chain.toUpperCase()}）不匹配` }, { status: 400 });
  }
  seeds[idx] = { ...seeds[idx], ...patch };
  writeSmartMoneySeeds(seeds);
  return respondWithList();
}

/** DELETE /api/admin/smart-money?address= — 删除监控地址 */
export async function DELETE(req: Request) {
  const denied = requireAuth(req);
  if (denied) return denied;

  const url = new URL(req.url);
  const address = (url.searchParams.get('address') || '').trim();
  if (!address) {
    return NextResponse.json({ error: '缺少 address 参数' }, { status: 400 });
  }
  const seeds = readSmartMoneySeeds();
  const next = seeds.filter((s) => s.address.toLowerCase() !== address.toLowerCase());
  if (next.length === seeds.length) {
    return NextResponse.json({ error: '地址不在监控列表中' }, { status: 404 });
  }
  writeSmartMoneySeeds(next);
  return respondWithList();
}
