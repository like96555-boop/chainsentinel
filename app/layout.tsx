import type { Metadata } from 'next';
import './globals.css';
import ChatWidget from '@/components/ChatWidget';
import { AnnouncementBar } from '@/components/BannerCarousel';

export const metadata: Metadata = {
  title: '链哨 ChainSentinel — 3 秒识别黑钱地址',
  description:
    '面向商户与机构的链上风控 SaaS：支持 TRON / BTC / ETH 多链地址风险识别、地址监控、税务合规报表。ChainSentinel Limited (Hong Kong)。',
  icons: {
    icon: [{ url: '/icon.svg', type: 'image/svg+xml' }],
  },
};

const NAV_LINKS = [
  { href: '/', label: '首页' },
  { href: '/alerts', label: '风险警示榜' },
  { href: '/smart-money', label: '聪明钱追踪' },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen antialiased">
        <AnnouncementBar />
        <header className="sticky top-0 z-50 border-b border-cyber-800 bg-cyber-950/85 backdrop-blur">
          <nav className="mx-auto flex max-w-5xl items-center gap-6 px-6 py-3">
            <a href="/" className="flex items-center gap-2 text-sm font-bold tracking-wide">
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-neon-cyan/20 text-neon-cyan">
                ◆
              </span>
              <span>
                链哨<span className="text-neon-cyan">ChainSentinel</span>
              </span>
            </a>
            <div className="ml-auto flex items-center gap-1 sm:gap-2">
              {NAV_LINKS.map((l) => (
                <a
                  key={l.href}
                  href={l.href}
                  className="rounded-lg px-2.5 py-1.5 text-xs text-slate-400 transition hover:bg-cyber-800 hover:text-neon-cyan sm:text-sm"
                >
                  {l.label}
                </a>
              ))}
            </div>
          </nav>
        </header>
        {children}
        <ChatWidget />
      </body>
    </html>
  );
}
