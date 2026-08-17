'use client';

import { usePathname } from 'next/navigation';
import LoginButton from '@/components/LoginButton';

/** 全局导航：/en 前缀显示英文，其余显示中文；含语言切换与 Telegram 联系入口 */
export default function NavBar() {
  const pathname = usePathname();
  const isEn = pathname === '/en' || pathname.startsWith('/en/');

  const zh = [
    { href: '/', label: '首页' },
    { href: '/blog', label: '博客' },
    { href: '/alerts', label: '风险警示榜' },
    { href: '/smart-money', label: '聪明钱追踪' },
    { href: '/tax', label: '税务中心' },
    { href: '/dashboard', label: '订阅中心' },
  ];
  const en = [
    { href: '/en', label: 'Home' },
    { href: '/en/blog', label: 'Blog' },
    { href: '/dashboard', label: 'Plans' },
  ];
  const links = isEn ? en : zh;
  const brand = isEn ? (
    <>
      Chain<span className="text-neon-cyan">Sentinel</span>
    </>
  ) : (
    <>
      链哨<span className="text-neon-cyan">ChainSentinel</span>
    </>
  );

  return (
    <header className="sticky top-0 z-50 border-b border-cyber-800 bg-cyber-950/85 backdrop-blur">
      <nav className="mx-auto flex max-w-5xl items-center gap-4 px-6 py-3 sm:gap-6">
        <a href={isEn ? '/en' : '/'} className="flex items-center gap-2 text-sm font-bold tracking-wide">
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-neon-cyan/20 text-neon-cyan">◆</span>
          <span>{brand}</span>
        </a>
        <div className="ml-auto flex items-center gap-1 sm:gap-2">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="rounded-lg px-2 py-1.5 text-xs text-slate-400 transition hover:bg-cyber-800 hover:text-neon-cyan sm:text-sm"
            >
              {l.label}
            </a>
          ))}
          <a
            href="https://t.me/+85293877936"
            target="_blank"
            rel="noopener noreferrer"
            title={isEn ? 'Contact us on Telegram' : 'Telegram 联系客服'}
            className="ml-1 inline-flex items-center gap-1 rounded-lg border border-neon-cyan/30 bg-neon-cyan/10 px-2.5 py-1.5 text-xs text-neon-cyan transition hover:bg-neon-cyan/20"
          >
            ✈ {isEn ? 'Telegram' : 'Telegram 客服'}
          </a>
          <a
            href={isEn ? '/' : '/en'}
            title={isEn ? '切换为中文' : 'Switch to English'}
            className="ml-1 inline-flex items-center gap-1 rounded-lg border border-slate-600/60 bg-slate-800/60 px-2.5 py-1.5 text-xs text-slate-300 transition hover:border-neon-cyan/60 hover:text-neon-cyan"
          >
            🌐 {isEn ? '中文' : 'EN'}
          </a>
          <LoginButton lang={isEn ? 'en' : 'zh'} />
        </div>
      </nav>
    </header>
  );
}
