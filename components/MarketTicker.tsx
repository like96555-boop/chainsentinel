'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, RefreshCw } from 'lucide-react';

type Quote = { symbol: string; price: number; change24h: number };

function fmtPrice(p: number): string {
  if (p >= 1000) return p.toLocaleString('en-US', { maximumFractionDigits: 0 });
  if (p >= 10) return p.toLocaleString('en-US', { maximumFractionDigits: 2 });
  return p.toLocaleString('en-US', { maximumFractionDigits: 4 });
}

export default function MarketTicker() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [at, setAt] = useState<number>(0);

  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        const r = await fetch('/api/market');
        if (!r.ok) return;
        const j = await r.json();
        if (alive && Array.isArray(j.quotes) && j.quotes.length) {
          setQuotes(j.quotes);
          setAt(j.cachedAt || Date.now());
        }
      } catch {
        /* 数据源不可用时静默隐藏 */
      }
    }
    load();
    const t = setInterval(load, 60_000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);

  if (quotes.length === 0) return null;

  return (
    <section className="mx-auto max-w-5xl px-6">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.15 }}
        className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 rounded-2xl border border-slate-800 bg-slate-900/60 px-6 py-4 backdrop-blur"
      >
        {quotes.map((q) => {
          const up = q.change24h >= 0;
          return (
            <div key={q.symbol} className="flex items-center gap-2">
              <span className="text-sm font-bold text-slate-200">{q.symbol}</span>
              <span className="font-mono text-sm text-slate-300">${fmtPrice(q.price)}</span>
              <span
                className={`flex items-center gap-0.5 font-mono text-xs ${
                  up ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {up ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                {up ? '+' : ''}
                {q.change24h.toFixed(2)}%
              </span>
            </div>
          );
        })}
        <span className="flex items-center gap-1 text-[10px] text-slate-600">
          <RefreshCw size={10} />
          60s 更新 · 来源 Gate.io · 非投资建议
        </span>
      </motion.div>
    </section>
  );
}
