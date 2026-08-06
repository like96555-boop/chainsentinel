import { NextResponse } from 'next/server';
import { readAiConfig, publicAiConfig } from '@/lib/ai-config';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// AI 客服公开配置（问候语/快捷问题/开关）——供前端客服窗渲染；不含提示词全文与任何密钥
export async function GET() {
  const cfg = readAiConfig();
  return NextResponse.json(publicAiConfig(cfg), {
    headers: { 'Cache-Control': 'no-store' },
  });
}
