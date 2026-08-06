'use client';

import { useEffect, useRef } from 'react';
import { createChart, ColorType, type IChartApi } from 'lightweight-charts';

type Candle = { time: number; open: number; high: number; low: number; close: number };

const UP = '#22c55e';
const DOWN = '#f43f5e';

export default function MiniKline({ symbol, candles }: { symbol: string; candles: Candle[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

  useEffect(() => {
    if (!ref.current || !candles.length) return;
    const el = ref.current;
    const chart = createChart(el, {
      width: el.clientWidth,
      height: 160,
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#64748b',
        fontSize: 10,
      },
      grid: {
        vertLines: { color: 'rgba(148, 163, 184, 0.06)' },
        horzLines: { color: 'rgba(148, 163, 184, 0.06)' },
      },
      rightPriceScale: { borderColor: 'rgba(148, 163, 184, 0.15)' },
      timeScale: { borderColor: 'rgba(148, 163, 184, 0.15)', timeVisible: false },
      crosshair: { mode: 0 },
    });
    chartRef.current = chart;
    const series = chart.addCandlestickSeries({
      upColor: UP,
      downColor: DOWN,
      borderUpColor: UP,
      borderDownColor: DOWN,
      wickUpColor: UP,
      wickDownColor: DOWN,
    });
    series.setData(candles.map((c) => ({ time: c.time as any, open: c.open, high: c.high, low: c.low, close: c.close })));
    chart.timeScale().fitContent();

    const ro = new ResizeObserver(() => {
      if (el.clientWidth > 0) chart.applyOptions({ width: el.clientWidth });
    });
    ro.observe(el);

    return () => {
      ro.disconnect();
      chart.remove();
      chartRef.current = null;
    };
  }, [candles]);

  const last = candles[candles.length - 1];
  const first = candles[0];
  const change = last && first ? ((last.close - first.open) / first.open) * 100 : 0;
  const up = change >= 0;

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-bold text-slate-200">{symbol}</span>
        <span className={`font-mono text-xs ${up ? 'text-emerald-400' : 'text-rose-400'}`}>
          {last ? `$${last.close.toLocaleString('en-US', { maximumFractionDigits: last.close >= 1000 ? 0 : 4 })}` : '—'} {up ? '▲' : '▼'}{change.toFixed(2)}%
        </span>
      </div>
      <div ref={ref} className="w-full" />
    </div>
  );
}
