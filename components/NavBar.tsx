'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { Globe2, Menu, Send, X } from 'lucide-react';
import LoginButton from '@/components/LoginButton';

/** 全局导航：/en 前缀显示英文，其余显示中文；含语言切换与 Telegram 联系入口 */
export default function NavBar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const isEn = pathname === '/en' || pathname.startsWith('/en/');

  const zh = [
    { href: '/', label: '首页' },
    { href: '/blog', label: '博客' },
    { href: '/alerts', label: '风险警示榜' },
    { href: '/smart-money', label: '聪明钱追踪' },
    { href: '/tax', label: '税务中心' },
    { href: '/agent', label: 'Agent API' },
    { href: '/dashboard', label: '订阅中心' },
  ];
  const en = [
    { href: '/en', label: 'Home' },
    { href: '/en/blog', label: 'Blog' },
    { href: '/en/agent', label: 'Agent API' },
    { href: '/dashboard', label: 'Plans' },
  ];
  const links = isEn ? en : zh;

  const isActive = (href: string) =>
    href === '/' || href === '/en'
      ? pathname === href
      : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <header className="sticky top-0 z-50 border-b border-cyber-800 bg-cyber-950/85 backdrop-blur">
      <nav className="mx-auto flex h-14 max-w-5xl items-center gap-2 px-3 sm:gap-4 sm:px-6">
        {/* 窄屏：菜单按钮，避免所有链接挤在一行被压成竖排 */}
        <button
          type="button"
          onClick={() => setMobileOpen((v) => !v)}
          aria-label={mobileOpen ? '关闭导航菜单' : '打开导航菜单'}
          aria-expanded={mobileOpen}
          className="shrink-0 rounded-md p-1.5 text-slate-300 transition hover:bg-cyber-800 sm:hidden"
        >
          {mobileOpen ? <X size={17} /> : <Menu size={17} />}
        </button>

        {/* 品牌：中英文显式分层，避免宽度不足时被浏览器被动折行 */}
        <a
          href={isEn ? '/en' : '/'}
          className="flex shrink-0 items-center gap-2 whitespace-nowrap"
          aria-label={isEn ? 'ChainSentinel home' : '链哨 ChainSentinel 首页'}
        >
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-neon-cyan/15 text-[12px] text-neon-cyan ring-1 ring-neon-cyan/25">
            ◆
          </span>
          {isEn ? (
            <span className="text-[15px] font-semibold tracking-tight text-slate-100">
              Chain<span className="text-neon-cyan">Sentinel</span>
            </span>
          ) : (
            <span className="flex flex-col leading-none">
              <span className="text-[14px] font-semibold tracking-[0.14em] text-slate-100">链哨</span>
              <span className="mt-[3px] hidden text-[8px] font-medium uppercase tracking-[0.22em] text-neon-cyan/80 sm:block">
                ChainSentinel
              </span>
            </span>
          )}
        </a>

        {/* 桌面链接区：标签禁止折行，极窄时横向滚动而不是压扁文字 */}
        <div className="no-scrollbar ml-auto hidden min-w-0 flex-1 items-center justify-end gap-0.5 overflow-x-auto sm:flex">
          {links.map((l) => {
            const active = isActive(l.href);
            return (
              <a
                key={l.href}
                href={l.href}
                className={`shrink-0 whitespace-nowrap rounded-md px-2 py-1.5 text-[12px] font-medium transition lg:px-2.5 lg:text-[13px] ${
                  active
                    ? 'text-neon-cyan'
                    : 'text-slate-400 hover:bg-cyber-800 hover:text-slate-100'
                }`}
              >
                {l.label}
              </a>
            );
          })}
        </div>

        {/* 操作区：矢量图标替代 emoji，保证与文字基线对齐 */}
        <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:ml-0">
          <a
            href="https://t.me/+85293877936"
            target="_blank"
            rel="noopener noreferrer"
            title={isEn ? 'Contact us on Telegram' : 'Telegram 联系客服'}
            aria-label={isEn ? 'Contact us on Telegram' : 'Telegram 联系客服'}
            className="hidden shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg border border-neon-cyan/30 bg-neon-cyan/10 px-2.5 py-1.5 text-xs font-medium text-neon-cyan transition hover:bg-neon-cyan/20 sm:inline-flex"
          >
            <Send size={12} className="shrink-0" />
            <span>{isEn ? 'Telegram' : 'Telegram 客服'}</span>
          </a>
          <a
            href={isEn ? '/' : '/en'}
            title={isEn ? '切换为中文' : 'Switch to English'}
            className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg border border-slate-600/60 bg-slate-800/60 px-2.5 py-1.5 text-[11px] font-medium text-slate-300 transition hover:border-neon-cyan/60 hover:text-neon-cyan sm:text-xs"
          >
            <Globe2 size={12} className="shrink-0" />
            <span>{isEn ? '中文' : 'EN'}</span>
          </a>
          <LoginButton lang={isEn ? 'en' : 'zh'} />
        </div>
      </nav>

      {/* 窄屏展开的完整导航：每个标签独占一格，文字完整不折行 */}
      {mobileOpen && (
        <div className="border-t border-cyber-800 bg-cyber-950/95 px-3 py-2 sm:hidden">
          <div className="mx-auto grid max-w-5xl grid-cols-2 gap-1">
            {links.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setMobileOpen(false)}
                className={`whitespace-nowrap rounded-md px-3 py-2 text-[13px] font-medium transition ${
                  isActive(l.href)
                    ? 'bg-neon-cyan/10 text-neon-cyan'
                    : 'text-slate-300 hover:bg-cyber-800'
                }`}
              >
                {l.label}
              </a>
            ))}
            <a
              href="https://t.me/+85293877936"
              target="_blank"
              rel="noopener noreferrer"
              className="col-span-2 whitespace-nowrap rounded-md px-3 py-2 text-[13px] font-medium text-neon-cyan hover:bg-cyber-800"
            >
              {isEn ? 'Contact us on Telegram' : 'Telegram 客服'}
            </a>
          </div>
        </div>
      )}
    </header>
  );
}
