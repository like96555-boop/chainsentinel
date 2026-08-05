import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Gate.io 公共行情（免 key），服务端内存缓存 60 秒，防刷防限流
const PAIRS: Array<{ pair: string; symbol: string }> = [
  { pair: 'BTC_USDT', symbol: 'BTC' },
  { pair: 'ETH_USDT', symbol: 'ETH' },
  { pair: 'TRX_USDT', symbol: 'TRX' },
  { pair: 'SOL_USDT', symbol: 'SOL' },
];

type Quote = { symbol: string; price: number; change24h: number };

let cache: { at: number; data: Quote[] } | null = null;
const TTL = 60_000;

async function fetchPair(p: { pair: string; symbol: string }): Promise<Quote | null> {
  try {
    const res = await fetch(
      `https://api.gateio.ws/api/v4/spot/tickers?currency_pair=${p.pair}`,
      { signal: AbortSignal.timeout(8_000), cache: 'no-store' }
    );
    if (!res.ok) return null;
    const arr: unknown = await res.json();
    const t = Array.isArray(arr) ? (arr[0] as Record<string, string>) : null;
    if (!t || !t.last) return null;
    return { symbol: p.symbol, price: Number(t.last), change24h: Number(t.change_percentage || 0) };
  } catch {
    return null;
  }
}

export async function GET() {
  if (cache && Date.now() - cache.at < TTL) {
    return NextResponse.json(
      { quotes: cache.data, cachedAt: cache.at, source: 'Gate.io' },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  }
  const results = await Promise.all(PAIRS.map(fetchPair));
  const quotes = results.filter((q): q is Quote => q !== null);
  if (quotes.length === 0) {
    return NextResponse.json({ error: '行情数据源暂不可用' }, { status: 503 });
  }
  cache = { at: Date.now(), data: quotes };
  return NextResponse.json(
    { quotes, cachedAt: cache.at, source: 'Gate.io' },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
