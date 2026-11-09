'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { ArrowRight, ChevronDown, Globe2, Menu, Send, X } from 'lucide-react';
import LoginButton from '@/components/LoginButton';
import { FeatureBadge, getCatalog } from '@/components/feature-catalog';

/**
 * 全局导航。
 * 设计取舍：不把功能塞进「一行短标签 + 隐藏横向滚动」，而是用一个分组的「产品功能」菜单
 * 承载完整能力清单（每项带一句说明 + 门槛标签），窄屏菜单同样展开全部分组。
 */
export default function NavBar() {
  const pathname = usePathname();
  const headerRef = useRef<HTMLElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const isEn = pathname === '/en' || pathname.startsWith('/en/');
  const { groups, labels } = getCatalog(isEn ? 'en' : 'zh');
  const totalFeatures = groups.reduce((n, g) => n + g.items.length, 0);

  const href = (path: string) => path;
  const homeHref = isEn ? '/en' : '/';
  const agentHref = isEn ? '/en/agent' : '/agent';
  const blogHref = isEn ? '/en/blog' : '/blog';
  const pricingHref = isEn ? '/en#pricing' : '/#pricing';
  const alertsHref = '/alerts';
  const smartMoneyHref = '/smart-money';

  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      if (headerRef.current && !headerRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
        setMobileOpen(false);
      }
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setMenuOpen(false);
        setMobileOpen(false);
      }
    }
    function onScroll() {
      setMenuOpen(false);
      setMobileOpen(false);
    }
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('scroll', onScroll);
    };
  }, []);

  const isActive = (path: string) =>
    path === '/' || path === '/en'
      ? pathname === path
      : pathname === path || pathname.startsWith(`${path}/`);

  const linkCls = (path: string) =>
    `shrink-0 whitespace-nowrap rounded-md px-2 py-1.5 text-[12px] font-medium transition lg:px-2.5 lg:text-[13px] ${
      isActive(path) ? 'text-neon-cyan' : 'text-slate-400 hover:bg-cyber-800 hover:text-slate-100'
    }`;

  return (
    <header
      ref={headerRef}
      onMouseLeave={() => setMenuOpen(false)}
      className="sticky top-0 z-50 border-b border-cyber-800 bg-cyber-950/85 backdrop-blur"
    >
      <nav className="mx-auto flex h-14 max-w-5xl items-center gap-2 px-3 sm:gap-4 sm:px-6">
        {/* 窄屏：菜单按钮（展开后是完整的功能分组，不是被压缩的链接列表） */}
        <button
          type="button"
          onClick={() => {
            setMobileOpen((v) => !v);
            setMenuOpen(false);
          }}
          aria-label={mobileOpen ? '关闭导航菜单' : '打开导航菜单'}
          aria-expanded={mobileOpen}
          className="shrink-0 rounded-md p-1.5 text-slate-300 transition hover:bg-cyber-800 sm:hidden"
        >
          {mobileOpen ? <X size={17} /> : <Menu size={17} />}
        </button>

        {/* 品牌：中英文显式分层，避免宽度不足时被浏览器被动折行 */}
        <a
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
        </a>

        {/* 桌面主导航：精简为场景入口 + 一个承载全部能力的下拉 */}
        <div className="ml-auto hidden min-w-0 flex-1 items-center justify-end gap-0.5 sm:flex">
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-expanded={menuOpen}
            aria-controls="feature-mega-menu"
            className={`inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-md px-2 py-1.5 text-[12px] font-semibold transition lg:px-2.5 lg:text-[13px] ${
              menuOpen ? 'bg-cyber-800 text-neon-cyan' : 'text-slate-200 hover:bg-cyber-800 hover:text-neon-cyan'
            }`}
          >
            {labels.menu}
            <ChevronDown size={12} className={`transition ${menuOpen ? 'rotate-180' : ''}`} />
          </button>
          <a href={href(alertsHref)} className={`${linkCls(alertsHref)} hidden lg:inline-block`}>
            {labels.alerts}
          </a>
          <a href={href(smartMoneyHref)} className={`${linkCls(smartMoneyHref)} hidden xl:inline-block`}>
            {labels.smartMoney}
          </a>
          <a href={pricingHref} className={linkCls(pricingHref)}>
            {labels.pricing}
          </a>
          <a href={blogHref} className={`${linkCls(blogHref)} hidden md:inline-block`}>
            {labels.blog}
          </a>
          <a href={agentHref} className={linkCls(agentHref)}>
            {labels.agent}
          </a>
        </div>

        {/* 操作区：矢量图标替代 emoji，保证与文字基线对齐 */}
        <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:ml-0">
          <a
            href="https://t.me/+85293877936"
            target="_blank"
            rel="noopener noreferrer"
            title={isEn ? 'Contact us on Telegram' : 'Telegram 联系客服'}
            aria-label={isEn ? 'Contact us on Telegram' : 'Telegram 联系客服'}
            className="hidden shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg border border-neon-cyan/30 bg-neon-cyan/10 px-2.5 py-1.5 text-xs font-medium text-neon-cyan transition hover:bg-neon-cyan/20 lg:inline-flex"
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

      {/* 桌面功能菜单：四组能力，每项一句说明 + 门槛标签 */}
      {menuOpen && (
        <div
          id="feature-mega-menu"
          className="absolute left-1/2 top-full hidden w-[min(900px,calc(100vw-24px))] -translate-x-1/2 rounded-2xl border border-cyber-700 bg-cyber-900 shadow-[0_24px_60px_-20px_rgba(0,0,0,0.85)] sm:block"
        >
          <div className="grid gap-3 p-3 sm:grid-cols-2">
            {groups.map((g) => (
              <div key={g.id} className="rounded-xl border border-cyber-800 bg-cyber-900/50 p-2.5">
                <div className="flex items-center gap-2 px-1.5 pb-2">
                  <g.icon size={14} className="shrink-0 text-neon-cyan" />
                  <span className="whitespace-nowrap text-[12px] font-bold text-slate-100">{g.title}</span>
                  <span className="ml-auto whitespace-nowrap text-[10px] text-slate-500">
                    {g.items.length} {isEn ? 'items' : '项'}
                  </span>
                </div>
                <div className="grid gap-0.5">
                  {g.items.map((it) => (
                    <a
                      key={`${g.id}-${it.title}`}
                      href={it.href}
                      onClick={() => setMenuOpen(false)}
                      className="group flex items-start gap-2.5 rounded-lg px-2 py-1.5 transition hover:bg-cyber-800/80"
                    >
                      <it.icon size={14} className="mt-0.5 shrink-0 text-neon-cyan/70" />
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                          <span className="whitespace-nowrap text-[12px] font-medium text-slate-200 group-hover:text-neon-cyan">
                            {it.title}
                          </span>
                          <FeatureBadge item={it} compact />
                        </span>
                        <span className="mt-0.5 block truncate text-[11px] leading-snug text-slate-500">
                          {it.desc}
                        </span>
                      </span>
                    </a>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between gap-3 border-t border-cyber-800 px-5 py-3">
            <p className="min-w-0 truncate text-[11px] text-slate-500">{labels.menuNote}</p>
            <a
              href={labels.mapHref}
              onClick={() => setMenuOpen(false)}
              className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap text-xs font-semibold text-neon-cyan transition hover:underline"
            >
              {labels.all}
              <ArrowRight size={13} />
            </a>
          </div>
        </div>
      )}

      {/* 窄屏：同样的四组能力完整展开，不再把功能藏进一行横向滚动 */}
      {mobileOpen && (
        <div className="max-h-[82vh] overflow-y-auto border-t border-cyber-800 bg-cyber-900 px-3 py-3 sm:hidden">
          <div className="mx-auto max-w-5xl">
            {/* 打开菜单第一眼就能去完整能力地图 */}
            <a
              href={labels.mapHref}
              onClick={() => setMobileOpen(false)}
              className="mb-3 flex items-center gap-1.5 rounded-lg border border-neon-cyan/40 bg-neon-cyan/10 px-3 py-2.5 text-[13px] font-semibold text-neon-cyan"
            >
              <ArrowRight size={14} className="shrink-0" />
              {labels.all}
              <span className="ml-auto whitespace-nowrap text-[11px] font-normal text-slate-400">
                {totalFeatures} {isEn ? 'live features' : '项已上线'}
              </span>
            </a>

            {groups.map((g) => (
              <div key={g.id} className="mb-3">
                <p className="flex items-center gap-2 px-2 py-1.5 text-[11px] font-bold tracking-wide text-neon-cyan/90">
                  <g.icon size={13} className="shrink-0" />
                  {g.title}
                  <span className="text-slate-600">· {g.items.length} {isEn ? 'items' : '项'}</span>
                </p>
                <div className="grid gap-0.5">
                  {g.items.map((it) => (
                    <a
                      key={`${g.id}-${it.title}`}
                      href={it.href}
                      onClick={() => setMobileOpen(false)}
                      className="flex items-start gap-2.5 rounded-lg px-3 py-2 transition hover:bg-cyber-800"
                    >
                      <it.icon size={15} className="mt-0.5 shrink-0 text-neon-cyan/80" />
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                          <span className="text-[13px] font-medium text-slate-100">{it.title}</span>
                          <FeatureBadge item={it} compact />
                        </span>
                        <span className="mt-0.5 block text-[11px] leading-snug text-slate-500">{it.desc}</span>
                      </span>
                    </a>
                  ))}
                </div>
              </div>
            ))}

            <div className="flex flex-wrap items-center gap-2 border-t border-cyber-800 pb-3 pt-3">
              <a href={homeHref} className="whitespace-nowrap rounded-md px-3 py-2 text-[13px] text-slate-300 hover:bg-cyber-800">{labels.home}</a>
              <a href={pricingHref} className="whitespace-nowrap rounded-md px-3 py-2 text-[13px] text-slate-300 hover:bg-cyber-800">{labels.pricing}</a>
              <a href={blogHref} className="whitespace-nowrap rounded-md px-3 py-2 text-[13px] text-slate-300 hover:bg-cyber-800">{labels.blog}</a>
              <a
                href="https://t.me/+85293877936"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-2 text-[13px] text-neon-cyan hover:bg-cyber-800"
              >
                <Send size={13} className="shrink-0" />
                {labels.telegram}
              </a>
            </div>

            {/* 列表末尾再给一次入口，滚到底不用往回找 */}
            <a
              href={labels.mapHref}
              onClick={() => setMobileOpen(false)}
              className="mt-1 flex items-center justify-center gap-1.5 rounded-lg border border-cyber-700 px-3 py-2 text-[12px] font-medium text-slate-300 hover:border-neon-cyan/50 hover:text-neon-cyan"
            >
              {labels.all}
              <ArrowRight size={13} className="shrink-0" />
            </a>
          </div>
        </div>
      )}
    </header>
  );
}
