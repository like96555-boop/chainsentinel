import type { Metadata } from 'next';
import './globals.css';
import ChatWidget from '@/components/ChatWidget';

export const metadata: Metadata = {
  title: '链哨 ChainSentinel — 3 秒识别黑钱地址',
  description:
    '面向商户与机构的链上风控 SaaS：支持 TRON / BTC / ETH 多链地址风险识别、地址监控、税务合规报表。ChainSentinel Limited (Hong Kong)。',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen antialiased">
        {children}
        <ChatWidget />
      </body>
    </html>
  );
}
