import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '链哨 · AI 客服管理台',
  description: 'ChainSentinel AI 客服配置中心（独立部署单元）',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body className="bg-slate-950 text-slate-200">{children}</body>
    </html>
  );
}
