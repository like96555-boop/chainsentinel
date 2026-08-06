'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

type Banner = { id: string; position: string; title: string; subtitle: string; emoji: string; bg: string; linkUrl: string; sort: number };
type SiteConfig = { banners: Banner[]; announcement: string; siteName: string; slogan: string; contactEmail: string; footerText: string };

// 模块级缓存：全站只请求一次 /api/site-config
let cached: Promise<SiteConfig> | null = null;
function loadSiteConfig(): Promise<SiteConfig> {
  if (!cached) {
    cached = fetch('/api/site-config')
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .catch(() => ({ banners: [], announcement: '', siteName: '链哨 ChainSentinel', slogan: '', contactEmail: '', footerText: '' }));
  }
  return cached;
}

export function useSiteConfig() {
  const [cfg, setCfg] = useState<SiteConfig | null>(null);
  useEffect(() => {
    let alive = true;
    loadSiteConfig().then((c) => alive && setCfg(c));
    return () => {
      alive = false;
    };
  }, []);
  return cfg;
}

export function BannerCarousel({ position }: { position: string }) {
  const cfg = useSiteConfig();
  const banners = (cfg?.banners || []).filter((b) => b.position === position);
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (banners.length < 2) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % banners.length), 5000);
    return () => clearInterval(t);
  }, [banners.length]);

  if (banners.length === 0) return null;
  const b = banners[Math.min(idx, banners.length - 1)];
  const inner = (
    <div
      className={`flex items-center gap-4 rounded-2xl border border-cyber-700 bg-gradient-to-r ${b.bg || 'from-cyan-500/20 to-blue-600/10'} px-6 py-5 backdrop-blur`}
    >
      <span className="text-3xl">{b.emoji}</span>
      <div className="min-w-0">
        <p className="truncate text-base font-bold text-slate-100">{b.title}</p>
        {b.subtitle && <p className="mt-0.5 truncate text-xs text-slate-400">{b.subtitle}</p>}
      </div>
      {b.linkUrl && (
        <a href={b.linkUrl} target="_blank" rel="noopener noreferrer" className="ml-auto shrink-0 rounded-lg bg-neon-cyan/20 px-4 py-2 text-xs font-medium text-neon-cyan ring-1 ring-neon-cyan/40 transition hover:bg-neon-cyan/30">
          查看 →
        </a>
      )}
    </div>
  );
  return (
    <div className="mx-auto w-full max-w-5xl px-6">
      <AnimatePresence mode="wait">
        <motion.div key={b.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.35 }}>
          {inner}
        </motion.div>
      </AnimatePresence>
      {banners.length > 1 && (
        <div className="mt-2 flex justify-center gap-1.5">
          {banners.map((x, i) => (
            <button key={x.id} onClick={() => setIdx(i)} className={`h-1.5 rounded-full transition-all ${i === Math.min(idx, banners.length - 1) ? 'w-5 bg-neon-cyan' : 'w-1.5 bg-slate-700'}`} />
          ))}
        </div>
      )}
    </div>
  );
}

export function AnnouncementBar() {
  const cfg = useSiteConfig();
  if (!cfg?.announcement) return null;
  return (
    <div className="border-b border-cyber-800 bg-neon-yellow/10 px-4 py-1.5 text-center text-xs text-neon-yellow">
      📢 {cfg.announcement}
    </div>
  );
}
