import { NextResponse } from 'next/server';
import { z } from 'zod';
import { isAuthed } from '@/lib/session';
import { readAiConfig, writeAiConfig, type AiConfig } from '@/lib/ai-config';
import { logAudit } from '@/lib/audit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * 后台 AI 客服配置（仅管理员）。
 * 3001 独立管理台撤除后，这是图形化编辑 data/ai-config.json 的唯一入口。
 * 与公开的 /api/ai-config 严格分离：后者只下发问候语/快捷问题，不含提示词全文。
 */
const schema = z.object({
  enabled: z.boolean(),
  model: z.string().min(1).max(80),
  temperature: z.number().min(0).max(2),
  greeting: z.string().max(300),
  systemPrompt: z.string().max(8000),
  faqItems: z.array(z.string().max(500)).max(100),
  quickQuestions: z.array(z.string().max(100)).max(20),
});

function deny() {
  return NextResponse.json({ error: '未授权' }, { status: 401 });
}

export async function GET(req: Request) {
  if (!isAuthed(req)) return deny();
  return NextResponse.json(
    { config: readAiConfig() },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}

export async function PUT(req: Request) {
  if (!isAuthed(req)) return deny();
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || '配置校验失败' },
      { status: 400 },
    );
  }
  try {
    const cfg: AiConfig = parsed.data;
    writeAiConfig(cfg);
    logAudit('AI 客服配置修改', `model=${cfg.model} enabled=${cfg.enabled}`, req);
    return NextResponse.json({ ok: true, config: cfg });
  } catch {
    return NextResponse.json({ error: '配置写入失败' }, { status: 500 });
  }
}
