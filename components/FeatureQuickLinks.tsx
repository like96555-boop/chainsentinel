'use client';

import { ArrowRight, Layers3 } from 'lucide-react';
import { getCatalog } from '@/components/feature-catalog';

/**
 * 首屏能力速览：让第一次进站的客户不用滚动就知道「这个站除了查地址还有什么」。
 * 采用 flex-wrap 而不是隐藏滚动条，保证所有入口可见、不裁切。
 */
export default function FeatureQuickLinks({ lang = 'zh' }: { lang?: 'zh' | 'en' }) {
  const { quick, labels } = getCatalog(lang);

  return (
    <div className="mx-auto max-w-5xl px-4 pb-10 sm:px-6">
      <div className="flex flex-wrap items-center justify-center gap-2">
        <span className="mr-1 whitespace-nowrap text-[11px] font-medium text-slate-500 sm:text-xs">
          {labels.quickLabel}
        </span>
        {quick.map((q) => (
          <a
            key={q.label}
            href={q.href}
            className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-cyber-700 bg-cyber-900/70 px-3 py-1.5 text-[11px] font-medium text-slate-300 transition hover:border-neon-cyan/50 hover:text-neon-cyan sm:text-xs"
          >
            <q.icon size={12} className="shrink-0 text-neon-cyan/80" />
            {q.label}
          </a>
        ))}
        <a
          href={labels.mapHref}
          className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-neon-cyan/40 bg-neon-cyan/10 px-3 py-1.5 text-[11px] font-semibold text-neon-cyan transition hover:bg-neon-cyan/20 sm:text-xs"
        >
          <Layers3 size={12} className="shrink-0" />
          {labels.quickCta}
          <ArrowRight size={12} className="shrink-0" />
        </a>
      </div>
    </div>
  );
}
