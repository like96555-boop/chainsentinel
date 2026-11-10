'use client';

import { ArrowRight, MousePointer2 } from 'lucide-react';
import { FeatureBadge, getCatalog } from '@/components/feature-catalog';
import SmartLink from '@/components/SmartLink';

/**
 * 首页「能力地图」：11 项已上线能力按 4 个场景并排铺开，桌面一屏看全。
 *
 * 交互原则：零折叠、零状态、零悬停开合。所有功能都是真实可点的链接，
 * 用户不需要先「打开」什么东西才能看见我们做什么，也就不会有点开就消失的问题。
 */
const GRADIENTS = [
  'from-neon-cyan/80 via-neon-green/30 to-transparent',
  'from-neon-red/70 via-neon-yellow/30 to-transparent',
  'from-violet-400/70 via-neon-cyan/30 to-transparent',
  'from-neon-green/70 via-neon-cyan/30 to-transparent',
];

export default function FeatureMap({ lang = 'zh' }: { lang?: 'zh' | 'en' }) {
  const { groups, labels } = getCatalog(lang);
  const items = groups.flatMap((g) => g.items);
  const total = items.length;
  const noSignup = items.filter((i) => i.tone !== 'login' && i.tone !== 'contact').length;

  return (
    <section id="features" className="relative mx-auto max-w-5xl px-4 py-14 sm:px-6">
      <div className="cap-reveal text-center">
        <p className="text-[11px] font-semibold tracking-[0.2em] text-neon-cyan">{labels.eyebrow}</p>
        <h2 className="text-balance mt-3 text-[26px] font-bold leading-tight text-slate-100 sm:text-3xl">
          {labels.title}
        </h2>
        <p className="text-balance mx-auto mt-3 max-w-2xl text-[13px] leading-relaxed text-slate-400 sm:text-sm">
          {labels.subtitle}
        </p>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-neon-green/30 bg-neon-green/10 px-3 py-1 text-[11px] font-medium text-neon-green">
            <span className="h-1.5 w-1.5 rounded-full bg-neon-green" />
            {total} {labels.statTotal}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-cyber-700 bg-cyber-900/70 px-3 py-1 text-[11px] text-slate-300">
            {groups.length} {labels.statGroups}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-cyber-700 bg-cyber-900/70 px-3 py-1 text-[11px] text-slate-300">
            {noSignup} {labels.statFree}
          </span>
        </div>
      </div>

      {/* 场景直达：纯锚点，平滑滚动，不需要任何开合状态 */}
      <div className="cap-reveal mt-7 flex flex-wrap items-center justify-center gap-2" style={{ animationDelay: '60ms' }}>
        <span className="mr-0.5 whitespace-nowrap text-[11px] text-slate-500">{labels.sceneLabel}</span>
        {groups.map((g) => (
          <SmartLink
            key={g.id}
            href={`#features-${g.id}`}
            className="scene-chip inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-cyber-700 bg-cyber-900/70 px-3 py-1.5 text-[11px] font-medium text-slate-300"
          >
            <g.icon size={12} className="shrink-0 text-neon-cyan/80" />
            {g.title}
            <span className="rounded-full bg-cyber-800 px-1.5 py-px text-[10px] tabular-nums text-slate-400">
              {g.items.length}
            </span>
          </SmartLink>
        ))}
      </div>

      {/* 四列总览墙：桌面一屏看全 11 项，窄屏自动纵向堆叠 */}
      <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {groups.map((g, gi) => (
          <div
            key={g.id}
            id={`features-${g.id}`}
            className="cap-card cap-reveal relative overflow-hidden rounded-2xl border border-cyber-700/80 bg-cyber-900/60"
            style={{ animationDelay: `${100 + gi * 70}ms` }}
          >
            <div className={`h-[2px] w-full bg-gradient-to-r ${GRADIENTS[gi % GRADIENTS.length]}`} />
            <div className="p-4">
              <div className="flex items-start gap-2.5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-neon-cyan/10 text-neon-cyan ring-1 ring-neon-cyan/20">
                  <g.icon size={17} />
                </span>
                <div className="min-w-0">
                  <h3 className="text-[14px] font-bold leading-tight text-slate-100">{g.title}</h3>
                  <p className="mt-1 text-[11px] leading-snug text-slate-500">{g.desc}</p>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between border-t border-cyber-800 pt-2.5 text-[10px] tabular-nums text-slate-500">
                <span>
                  0{gi + 1} / 0{groups.length}
                </span>
                <span>
                  {g.items.length} {lang === 'en' ? 'features' : '项功能'}
                </span>
              </div>

              <div className="mt-1.5 space-y-0.5">
                {g.items.map((it) => (
                  <SmartLink
                    key={`${g.id}-${it.title}`}
                    href={it.href}
                    external={it.external}
                    target={it.external ? '_blank' : undefined}
                    rel={it.external ? 'noopener noreferrer' : undefined}
                    className="cap-row group flex items-start gap-2 rounded-lg px-2 py-2"
                    aria-label={`${it.title} — ${it.desc}`}
                  >
                    <it.icon size={14} className="mt-[2px] shrink-0 text-neon-cyan/70" />
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-x-1 gap-y-0.5">
                        <span className="text-[12px] font-semibold leading-snug text-slate-200 transition group-hover:text-neon-cyan">
                          {it.title}
                        </span>
                        <FeatureBadge item={it} compact />
                      </span>
                      <span className="mt-1 block text-[10.5px] leading-[1.55] text-slate-500">{it.desc}</span>
                    </span>
                    <ArrowRight
                      size={12}
                      className="mt-1 shrink-0 text-slate-600 opacity-0 transition group-hover:translate-x-0.5 group-hover:text-neon-cyan group-hover:opacity-100"
                    />
                  </SmartLink>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      <p className="mt-6 flex flex-wrap items-center justify-center gap-1.5 rounded-xl border border-cyber-800 bg-cyber-950/60 px-4 py-3 text-center text-[11px] leading-relaxed text-slate-400">
        <MousePointer2 size={12} className="shrink-0 text-neon-cyan" />
        {labels.tip}
      </p>
      <p className="mx-auto mt-3 max-w-3xl text-center text-[10.5px] leading-relaxed text-slate-600">
        {labels.disclaimer}
      </p>
    </section>
  );
}
