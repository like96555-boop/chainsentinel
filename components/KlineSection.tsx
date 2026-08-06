'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { CandlestickChart } from 'lucide-react';
import MiniKline from './MiniKline';

type Candle = { time: number; open: number; high: number; low: number; close: number };
type KlineItem = { symbol: string; pair: string; candles: Candle[] };

export default function KlineSection() {
  const [items, setItems] = useState<KlineItem[] | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await fetch('/api/market/kline');
        if (!r.ok) return;
        const j = await r.json();
        if (alive && Array.isArray(j.items) && j.items.length) setItems(j.items);
      } catch {
        /* 数据源不可用时隐藏 */
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  if (!items) return null;

  return (
    <section className="mx-auto max-w-5xl px-6 pb-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="mb-4 flex items-center gap-2"
      >
        <CandlestickChart size={18} className="text-neon-cyan" />
        <h3 className="text-lg font-bold text-slate-100">聪明钱关注标的 · 近 30 日走势</h3>
        <span className="text-xs text-slate-500">数据 Gate.io · 非投资建议</span>
      </motion.div>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {items.map((it, i) => (
          <motion.div
            key={it.symbol}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: i * 0.08 }}
          >
            <MiniKline symbol={it.symbol} candles={it.candles} />
          </motion.div>
        ))}
      </div>
    </section>
  );
}
