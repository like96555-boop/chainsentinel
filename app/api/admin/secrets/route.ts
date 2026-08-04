import { NextResponse } from 'next/server';
import { isAuthed } from '@/lib/session';
import { getMaskedSecrets, setSecrets, SECRET_KEYS, SecretKey } from '@/lib/secrets';
import { secretsPutSchema } from '@/lib/validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  if (!isAuthed(req)) return NextResponse.json({ error: '未授权' }, { status: 401 });
  // 只返回掩码，绝不含明文
  return NextResponse.json({ secrets: getMaskedSecrets() });
}

export async function PUT(req: Request) {
  if (!isAuthed(req)) return NextResponse.json({ error: '未授权' }, { status: 401 });
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: '请求体必须是 JSON' }, { status: 400 });
  }
  const parsed = secretsPutSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || '参数校验失败' },
      { status: 400 }
    );
  }
  const input: Partial<Record<SecretKey, string>> = {};
  for (const k of SECRET_KEYS) {
    const v = parsed.data[k];
    if (typeof v === 'string') input[k] = v;
  }
  try {
    setSecrets(input);
  } catch (e) {
    console.error('[ChainSentinel] 密钥写入失败', e);
    return NextResponse.json({ error: '密钥写入失败' }, { status: 500 });
  }
  return NextResponse.json({ ok: true, secrets: getMaskedSecrets() });
}
