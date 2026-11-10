'use client';

import { ArrowDown, Layers3 } from 'lucide-react';
import { getCatalog } from '@/components/feature-catalog';
import type { LucideIcon } from 'lucide-react';
import SmartLink from '@/components/SmartLink';

/**
 * 首屏能力速览：第一次进站、还没滚动就能看见「除了查地址还有什么」。
 * 与能力地图的分场景导航刻意区分：这里是最高频的直达入口，那里是完整清单。
 */
export default function FeatureQuickLinks({ lang = 'zh' }: { lang?: 'zh' | 'en' }) {
  const { labels } = getCatalog(lang);
  const isEn = lang === 'en';
  const direct: { icon: LucideIcon; label: string; href: string }[] = isEn
    ? [
        { icon: Layers3, label: 'Risk alerts', href: '/alerts' },
        { icon: Layers3, label: 'Smart money', href: '/smart-money' },
        { icon: Layers3, label: 'Tax centre', href: '/tax' },
        { icon: Layers3, label: 'Agent API', href: '/en/agent' },
      ]
    : [
        { icon: Layers3, label: '风险警示榜', href: '/alerts' },
        { icon: Layers3, label: '聪明钱追踪', href: '/smart-money' },
        { icon: Layers3, label: '税务报表', href: '/tax' },
        { icon: Layers3, label: 'Agent API', href: '/agent' },
      ];

  return (
    <div className="mx-auto max-w-5xl px-4 pb-8 sm:px-6">
      <div className="flex flex-wrap items-center justify-center gap-2">
        <span className="mr-0.5 whitespace-nowrap text-[11px] text-slate-500 sm:text-xs">
          {isEn ? 'Popular right now:' : '大家都在用：'}
        </span>
        {direct.map((d) => (
          <SmartLink
            key={d.label}
            href={d.href}
            className="quick-chip inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-cyber-700 bg-cyber-900/70 px-3 py-1.5 text-[11px] font-medium text-slate-300 sm:text-xs"
          >
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-neon-cyan/70" />
            {d.label}
          </SmartLink>
        ))}
        <SmartLink
          href={labels.mapHref}
          className="quick-chip inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-neon-cyan/45 bg-neon-cyan/10 px-3 py-1.5 text-[11px] font-semibold text-neon-cyan sm:text-xs"
        >
          <Layers3 size={12} className="shrink-0" />
          {labels.navAll}
          <span className="rounded-full bg-neon-cyan/20 px-1.5 py-px text-[10px] tabular-nums">11</span>
          <ArrowDown size={11} className="shrink-0" />
        </SmartLink>
      </div>
    </div>
  );
}
