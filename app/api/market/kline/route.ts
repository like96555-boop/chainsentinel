import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Gate.io 免费 K 线（1 日线，近 30 根），服务端缓存 60s
const PAIRS = ['BTC_USDT', 'ETH_USDT', 'TRX_USDT', 'SOL_USDT'];
const SYMBOLS: Record<string, string> = {
  BTC_USDT: 'BTC',
  ETH_USDT: 'ETH',
  TRX_USDT: 'TRX',
  SOL_USDT: 'SOL',
};

type Candle = { time: number; open: number; high: number; low: number; close: number };
type PairKline = { symbol: string; pair: string; candles: Candle[] };

let cache: { at: number; data: PairKline[] } | null = null;
const TTL = 60_000;

async function fetchKline(pair: string): Promise<PairKline | null> {
  try {
    const res = await fetch(
      `https://api.gateio.ws/api/v4/spot/candlesticks?currency_pair=${pair}&interval=1d&limit=30`,
      { signal: AbortSignal.timeout(8_000), cache: 'no-store' }
    );
    if (!res.ok) return null;
    const arr: unknown = await res.json();
    if (!Array.isArray(arr)) return null;
    const candles: Candle[] = arr
      .map((raw) => {
        const v = Array.isArray(raw) ? raw : (raw as { value?: unknown }).value;
        if (!Array.isArray(v) || v.length < 6) return null;
        const [ts, , close, high, low, open] = v as string[];
        const t = Number(ts);
        const o = Number(open);
        const h = Number(high);
        const l = Number(low);
        const c = Number(close);
        if (!t || !o || !h || !l || !c) return null;
        return { time: t, open: o, high: h, low: l, close: c };
      })
      .filter((c): c is Candle => c !== null);
    if (candles.length === 0) return null;
    return { symbol: SYMBOLS[pair] || pair, pair, candles };
  } catch {
    return null;
  }
}

export async function GET() {
  if (cache && Date.now() - cache.at < TTL) {
    return NextResponse.json({ items: cache.data, cachedAt: cache.at, source: 'Gate.io' }, { headers: { 'Cache-Control': 'no-store' } });
  }
  const items = (await Promise.all(PAIRS.map(fetchKline))).filter((k): k is PairKline => k !== null);
  if (items.length === 0) {
    return NextResponse.json({ error: 'K线数据源暂不可用' }, { status: 503 });
  }
  cache = { at: Date.now(), data: items };
  return NextResponse.json({ items, cachedAt: cache.at, source: 'Gate.io' }, { headers: { 'Cache-Control': 'no-store' } });
}
