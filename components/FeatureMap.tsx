'use client';

import { ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { FeatureBadge, getCatalog } from '@/components/feature-catalog';

/**
 * 首页「能力地图」：全站功能的唯一权威展示区。
 * 顶部导航的下拉菜单是这份清单的压缩版，两者共用 feature-catalog 数据。
 */
export default function FeatureMap({ lang = 'zh' }: { lang?: 'zh' | 'en' }) {
  const { groups, labels } = getCatalog(lang);
  const total = groups.reduce((n, g) => n + g.items.length, 0);

  return (
    <section id="features" className="mx-auto max-w-5xl scroll-mt-20 px-6 py-14">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-60px' }}
        transition={{ duration: 0.5 }}
        className="text-center"
      >
        <p className="text-[11px] font-semibold tracking-[0.18em] text-neon-cyan">{labels.eyebrow}</p>
        <h2 className="mt-3 text-balance text-2xl font-bold text-slate-100 sm:text-3xl">{labels.title}</h2>
        <p className="text-balance mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-slate-400">{labels.subtitle}</p>
        <p className="mx-auto mt-2 inline-flex items-center gap-1.5 rounded-full border border-cyber-700 bg-cyber-900/60 px-3 py-1 text-[11px] text-slate-400">
          <span className="h-1.5 w-1.5 rounded-full bg-neon-green" />
          {total} {lang === 'en' ? 'live capabilities' : '项已上线能力'}
        </p>
      </motion.div>

      <div className="mt-10 grid gap-8">
        {groups.map((g) => (
          <div key={g.id}>
            <div className="flex items-center gap-3 border-b border-cyber-800 pb-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-neon-cyan/10 text-neon-cyan ring-1 ring-neon-cyan/20">
                <g.icon size={17} />
              </span>
              <div className="min-w-0">
                <h3 className="whitespace-nowrap text-[15px] font-bold text-slate-100">{g.title}</h3>
                <p className="mt-0.5 text-[11px] leading-snug text-slate-500 sm:text-xs">{g.desc}</p>
              </div>
              <span className="ml-auto shrink-0 whitespace-nowrap text-[11px] text-slate-500">
                {g.items.length} {lang === 'en' ? 'items' : '项'}
              </span>
            </div>

            <div className={`mt-3 grid gap-3 sm:grid-cols-2 ${g.items.length === 2 ? 'lg:grid-cols-2' : 'lg:grid-cols-3'}`}>
              {g.items.map((it) => (
                <a
                  key={`${g.id}-${it.title}`}
                  href={it.href}
                  className="group flex flex-col rounded-xl border border-cyber-700 bg-cyber-900/50 p-4 transition hover:border-neon-cyan/50 hover:bg-cyber-800/50"
                >
                  <div className="flex items-start gap-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-cyber-800 text-neon-cyan/90 transition group-hover:bg-neon-cyan/15">
                      <it.icon size={16} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
                        <span className="text-[13px] font-semibold leading-snug text-slate-100 transition group-hover:text-neon-cyan">
                          {it.title}
                        </span>
                        <FeatureBadge item={it} compact />
                      </div>
                    </div>
                    <ArrowRight size={14} className="mt-1 shrink-0 text-slate-600 transition group-hover:translate-x-0.5 group-hover:text-neon-cyan" />
                  </div>
                  <p className="mt-3 text-xs leading-relaxed text-slate-400">{it.desc}</p>
                </a>
              ))}
            </div>
          </div>
        ))}
      </div>

      <p className="mt-8 rounded-xl border border-cyber-800 bg-cyber-950/50 px-4 py-3 text-center text-[11px] leading-relaxed text-slate-500">
        {labels.disclaimer}
      </p>
    </section>
  );
}
