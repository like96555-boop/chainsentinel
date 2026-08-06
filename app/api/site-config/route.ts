import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { readStore } from '@/lib/config-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Banner = { id: string; position: string; title: string; subtitle: string; emoji: string; bg: string; linkUrl: string; enabled: boolean; sort: number };

// 公开站点配置：横幅（仅 enabled）+ 公告 + 站点信息；不含任何密钥
export async function GET() {
  const { items } = readStore<Banner>('banners.json', []);
  let site = {
    siteName: '链哨 ChainSentinel',
    slogan: '3 秒识别黑钱地址',
    announcement: '',
    contactEmail: 'hello@chainsentinel.hk',
    footerText: '',
  };
  try {
    const p = path.join(process.cwd(), 'data', 'site-settings.json');
    if (fs.existsSync(p)) site = { ...site, ...JSON.parse(fs.readFileSync(p, 'utf8')) };
  } catch {
    /* 默认值 */
  }
  return NextResponse.json(
    {
      banners: items.filter((b) => b.enabled).sort((a, b) => a.sort - b.sort),
      announcement: site.announcement,
      siteName: site.siteName,
      slogan: site.slogan,
      contactEmail: site.contactEmail,
      footerText: site.footerText,
    },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
