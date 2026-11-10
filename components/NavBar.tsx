'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { ArrowDown, ArrowRight, Globe2, Layers3, Menu, Send, X } from 'lucide-react';
import LoginButton from '@/components/LoginButton';
import SmartLink from '@/components/SmartLink';
import { getCatalog } from '@/components/feature-catalog';
import type { FeatureTone } from '@/components/feature-catalog';

const DOT: Record<FeatureTone, string> = {
  free: 'bg-neon-green',
  partial: 'bg-neon-yellow',
  login: 'bg-neon-cyan',
  contact: 'bg-violet-400',
  dev: 'bg-slate-400',
};

/**
 * 全局导航（v3）。
 *
 * 上一版的下拉菜单靠 hover / outside-click / scroll 三个监听器维持开合，
 * 而全站启用了平滑滚动 —— 点任意功能都会触发 scroll 把菜单关掉，观感就是「点开闪退」。
 * 这一版彻底去掉折叠状态：
 *   · 桌面：常用入口全部直接可见，「全部功能」是直达能力地图的链接，不是下拉；
 *   · 窄屏：一个面板，只由点击按钮 / 遮罩 / 链接 / Esc 开合，滚动和鼠标移动都不影响它；
 *   · 站内链接统一走客户端路由，不再整页刷新。
 */
export default function NavBar() {
  const pathname = usePathname() || '/';
  const [mobileOpen, setMobileOpen] = useState(false);
  const isEn = pathname === '/en' || pathname.startsWith('/en/');
  const { groups, labels } = getCatalog(isEn ? 'en' : 'zh');
  const total = groups.reduce((n, g) => n + g.items.length, 0);

  const homeHref = isEn ? '/en' : '/';
  const agentHref = isEn ? '/en/agent' : '/agent';
  const blogHref = isEn ? '/en/blog' : '/blog';
  const checkHref = isEn ? '/en#check' : '/#check';
  const pricingHref = isEn ? '/en#pricing' : '/#pricing';
  const consultHref = isEn ? '/en#consult' : '/#consult';

  // 关闭条件刻意保持最少：只有 Esc 与路由跳转。不监听 scroll / mouseleave / 外部点击。
  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [mobileOpen]);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const isActive = (path: string) =>
    path === homeHref ? pathname === path : pathname === path || pathname.startsWith(`${path}/`);

  const linkCls = (path: string) =>
    `shrink-0 whitespace-nowrap rounded-md px-2 py-1.5 text-[12px] font-medium transition lg:px-2.5 lg:text-[13px] ${
      isActive(path) ? 'text-neon-cyan' : 'text-slate-400 hover:bg-cyber-800 hover:text-slate-100'
    }`;

  const directLinks = [
    { href: checkHref, label: labels.navCheck, cls: '' },
    { href: '/alerts', label: labels.alerts, cls: 'hidden md:inline-block' },
    { href: '/tax', label: labels.tax, cls: 'hidden lg:inline-block' },
    { href: agentHref, label: labels.agent, cls: '' },
    { href: pricingHref, label: labels.pricing, cls: 'hidden md:inline-block' },
    { href: blogHref, label: labels.blog, cls: 'hidden xl:inline-block' },
  ];

  const quick = [
    { href: '/alerts', label: labels.alerts },
    { href: '/smart-money', label: labels.smartMoney },
    { href: '/tax', label: labels.tax },
    { href: agentHref, label: labels.agent },
    { href: pricingHref, label: labels.pricing },
    { href: blogHref, label: labels.blog },
    { href: consultHref, label: isEn ? 'Advisory' : '合规咨询' },
  ];

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-cyber-800 bg-cyber-950">
        <nav className="mx-auto flex h-14 max-w-5xl items-center gap-1.5 px-3 sm:gap-3 sm:px-6">
          <button
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label={mobileOpen ? labels.closeLabel : labels.openLabel}
            aria-expanded={mobileOpen}
            aria-controls="mobile-nav-panel"
            className="shrink-0 rounded-md p-1.5 text-slate-300 transition hover:bg-cyber-800 active:scale-95 sm:hidden"
          >
            {mobileOpen ? <X size={18} /> : <Menu size={18} />}
          </button>

          <SmartLink
            href={homeHref}
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
          </SmartLink>

          {/* 桌面：入口常驻，不折叠 */}
          <div className="ml-auto hidden min-w-0 items-center justify-end gap-0.5 sm:flex">
            {directLinks.map((l) => (
              <SmartLink key={l.label} href={l.href} className={`${linkCls(l.href)} ${l.cls}`}>
                {l.label}
              </SmartLink>
            ))}
          </div>

          {/* 全站唯一「全部功能」入口：直接跳能力地图，零状态、零闪退 */}
          <SmartLink
            href={labels.mapHref}
            className="nav-all-btn ml-auto inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg border border-neon-cyan/45 bg-neon-cyan/10 px-2.5 py-1.5 text-[11px] font-semibold text-neon-cyan sm:ml-0 sm:px-3 sm:text-xs"
          >
            <Layers3 size={13} className="shrink-0" />
            <span className="sr-only">{labels.navAll}</span>
            <span className="hidden sm:inline">{labels.navAll}</span>
            <span className="rounded-full bg-neon-cyan/20 px-1.5 py-px text-[10px] tabular-nums">{total}</span>
            <ArrowDown size={11} className="hidden shrink-0 sm:block" />
          </SmartLink>

          <div className="flex shrink-0 items-center gap-1.5">
            <a
              href="https://t.me/+85293877936"
              target="_blank"
              rel="noopener noreferrer"
              title={isEn ? 'Contact us on Telegram' : 'Telegram 联系客服'}
              aria-label={isEn ? 'Contact us on Telegram' : 'Telegram 联系客服'}
              className="hidden shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg border border-cyber-700 bg-cyber-900 px-2.5 py-1.5 text-xs text-slate-300 transition hover:border-neon-cyan/50 hover:text-neon-cyan xl:inline-flex"
            >
              <Send size={12} className="shrink-0" />
              Telegram
            </a>
            <SmartLink
              href={isEn ? '/' : '/en'}
              title={isEn ? '切换为中文' : 'Switch to English'}
              className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-lg border border-slate-600/60 bg-slate-800/60 px-2 py-1.5 text-[11px] font-medium text-slate-300 transition hover:border-neon-cyan/60 hover:text-neon-cyan sm:gap-1.5 sm:px-2.5 sm:text-xs"
            >
              <Globe2 size={12} className="shrink-0" />
              <span>{isEn ? '中文' : 'EN'}</span>
            </SmartLink>
            <LoginButton lang={isEn ? 'en' : 'zh'} />
          </div>
        </nav>
      </header>

      {/* 窄屏面板：常驻 DOM，仅靠 CSS 过渡显隐；滚动、鼠标移动、失焦都不会把它关掉 */}
      <div
        id="mobile-nav-root"
        className={`fixed inset-0 z-[60] sm:hidden ${mobileOpen ? '' : 'pointer-events-none'}`}
        aria-hidden={!mobileOpen}
      >
        <button
          type="button"
          aria-label={labels.closeLabel}
          onClick={() => setMobileOpen(false)}
          tabIndex={mobileOpen ? 0 : -1}
          className={`absolute inset-0 h-full w-full bg-black/70 backdrop-blur-sm transition-opacity duration-300 ${mobileOpen ? 'opacity-100' : 'opacity-0'}`}
        />

        <div
          id="mobile-nav-panel"
          className={`absolute inset-x-0 top-0 max-h-[88vh] overflow-y-auto overscroll-contain rounded-b-2xl border-b border-cyber-700 bg-cyber-950 px-4 pb-7 pt-3 shadow-[0_30px_70px_-20px_rgba(0,0,0,0.95)] transition-all duration-300 ease-out ${
            mobileOpen ? 'visible translate-y-0 opacity-100' : 'invisible -translate-y-5 opacity-0'
          }`}
        >
          <div className="mx-auto max-w-5xl">
            <div className="flex items-start gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-[15px] font-bold text-slate-100">{labels.mobileTitle}</p>
                <p className="mt-1 text-[11px] leading-snug text-slate-400">{labels.mobileSubtitle}</p>
              </div>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                aria-label={labels.closeLabel}
                tabIndex={mobileOpen ? 0 : -1}
                className="shrink-0 rounded-lg border border-cyber-700 bg-cyber-900 p-2 text-slate-300 transition hover:text-neon-cyan active:scale-95"
              >
                <X size={16} />
              </button>
            </div>

            <SmartLink
              href={labels.mapHref}
              onClick={() => setMobileOpen(false)}
              tabIndex={mobileOpen ? 0 : -1}
              className="mt-3 flex items-center gap-2 rounded-xl border border-neon-cyan/45 bg-neon-cyan/10 px-3.5 py-3 text-[13px] font-semibold text-neon-cyan transition active:scale-[0.99]"
            >
              <Layers3 size={15} className="shrink-0" />
              {labels.mobileCta}
              <span className="ml-auto whitespace-nowrap rounded-full bg-neon-cyan/20 px-2 py-0.5 text-[10px] tabular-nums">
                {total} {isEn ? 'live' : '项上线'}
              </span>
              <ArrowRight size={14} className="shrink-0" />
            </SmartLink>

            {/* 11 项能力直接铺开，2 列紧凑网格，一屏内可看全，不需要二次展开 */}
            <div className="mt-4 space-y-3">
              {groups.map((g) => (
                <div key={g.id} id={`nav-group-${g.id}`}>
                  <p className="flex items-center gap-1.5 px-1 pb-1.5 text-[11px] font-bold tracking-wide text-neon-cyan/90">
                    <g.icon size={13} className="shrink-0" />
                    {g.title}
                    <span className="font-normal text-slate-600">· {g.items.length}</span>
                  </p>
                  <div className="grid grid-cols-2 gap-1">
                    {g.items.map((it) => (
                      <SmartLink
                        key={`${g.id}-${it.title}`}
                        href={it.href}
                        external={it.external}
                        target={it.external ? '_blank' : undefined}
                        rel={it.external ? 'noopener noreferrer' : undefined}
                        onClick={() => setMobileOpen(false)}
                        tabIndex={mobileOpen ? 0 : -1}
                        title={it.desc}
                        className="flex min-w-0 items-center gap-1.5 rounded-lg border border-cyber-800 bg-cyber-900/70 px-2 py-2 text-[11.5px] leading-snug text-slate-200 transition hover:border-neon-cyan/40 hover:text-neon-cyan active:scale-[0.98]"
                      >
                        <it.icon size={13} className="shrink-0 text-neon-cyan/70" />
                        <span className="min-w-0 flex-1 truncate">{it.title}</span>
                        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${DOT[it.tone]}`} title={it.badge} />
                      </SmartLink>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <p className="mt-4 border-t border-cyber-800 px-1 pt-3 text-[10.5px] text-slate-500">
              {labels.tip}
            </p>

            <div className="mt-2 flex flex-wrap gap-1.5">
              {quick.map((q) => (
                <SmartLink
                  key={q.label}
                  href={q.href}
                  onClick={() => setMobileOpen(false)}
                  tabIndex={mobileOpen ? 0 : -1}
                  className="rounded-lg border border-cyber-800 bg-cyber-900/60 px-2.5 py-1.5 text-[11px] text-slate-300 transition hover:border-neon-cyan/40 hover:text-neon-cyan"
                >
                  {q.label}
                </SmartLink>
              ))}
              <a
                href="https://t.me/+85293877936"
                target="_blank"
                rel="noopener noreferrer"
                tabIndex={mobileOpen ? 0 : -1}
                className="inline-flex items-center gap-1 rounded-lg border border-cyber-800 bg-cyber-900/60 px-2.5 py-1.5 text-[11px] text-neon-cyan"
              >
                <Send size={11} />
                {labels.telegram}
              </a>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
