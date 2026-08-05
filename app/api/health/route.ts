import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const startedAt = Date.now();

/** 运维监控探针：状态 / 版本 /  uptime / 支持链 / 进程内存 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    version: process.env.npm_package_version || '0.1.0',
    uptime: Math.floor((Date.now() - startedAt) / 1000),
    chains: ['tron', 'btc', 'eth'],
    memoryRssMb: Math.round(process.memoryUsage().rss / 1024 / 1024),
  });
}
