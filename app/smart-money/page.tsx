'use client';

import { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TrendingUp,
  Lock,
  Crown,
  ChevronDown,
  ArrowUpRight,
  ArrowDownRight,
  ExternalLink,
  Wallet,
  Clock,
  RotateCcw,
  Inbox,
  AlertTriangle,
  Activity,
} from 'lucide-react';

type SmartChain = 'tron' | 'btc' | 'eth';

interface CardItem {
  name: string;
  chain: SmartChain;
  address: string;
  maskedAddress: string;
  demo: boolean;
  balance: string | null;
  balanceValue: number | null;
  txCount: number | null;
  lastActive: string | null;
  lastActiveTs: number | null;
  eventsCount: number;
  degraded: boolean;
  degradedReason?: string;
  updatedAt: number;
}

interface EventItem {
  address: string;
  chain: SmartChain;
  direction: 'in' | 'out';
  token: string;
  amount: number;
  amountText: string;
  counterparty: string | null;
  counterpartyMasked: string | null;
  ts: number | null;
  tsText: string;
  txHash: string | null;
  txShort: string | null;
  evidenceUrl: string | null;
}

interface EventsResponse {
  address: string;
  chain: SmartChain;
  events: EventItem[];
  degraded?: { message: string; snapshot?: Record<string, unknown> };
}

const CHAIN_META: Record<SmartChain, { label: string; badge: string; dot: string }> = {
  tron: { label: 'TRON', badge: 'border-red-400/40 bg-red-400/10 text-red-300', dot: 'bg-red-400' },
  btc: { label: 'BTC', badge: 'border-orange-400/40 bg-orange-400/10 text-orange-300', dot: 'bg-orange-400' },
  eth: { label: 'ETH', badge: 'border-indigo-400/40 bg-indigo-400/10 text-indigo-300', dot: 'bg-indigo-400' },
};

const FREE_CARDS = 3; // 免费模式可见地址数
const FREE_EVENTS = 3; // 免费模式每地址可见动态条数

function SkeletonCards() {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="animate-pulse rounded-2xl border border-cyber-700 bg-cyber-900/60 p-5">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-cyber-800" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-2/3 rounded bg-cyber-800" />
              <div className="h-3 w-1/2 rounded bg-cyber-800" />
            </div>
          </div>
          <div className="mt-5 h-8 w-2/3 rounded bg-cyber-800" />
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="h-12 rounded-xl bg-cyber-800" />
            <div className="h-12 rounded-xl bg-cyber-800" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function SmartMoneyPage() {
  const [cards, setCards] = useState<CardItem[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState<Record<string, EventsResponse | 'loading' | 'error'>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/smart-money/list');
      const json = await res.json();
      if (!res.ok) {
        setError(json?.error || `加载失败（HTTP ${res.status}）`);
        setCards(null);
      } else {
        setCards(json.items as CardItem[]);
      }
    } catch {
      setError('网络异常，请稍后再试。');
      setCards(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function toggleCard(card: CardItem) {
    // 点击 100ms 内反馈：先展开 loading 态；已展开则收起
    setExpanded((prev) => {
      const cur = prev[card.address];
      if (cur) {
        const next = { ...prev };
        delete next[card.address];
        return next;
      }
      return { ...prev, [card.address]: 'loading' };
    });
    try {
      const res = await fetch(`/api/smart-money/events?address=${encodeURIComponent(card.address)}&chain=${card.chain}`);
      const json = await res.json();
      if (!res.ok) {
        setExpanded((prev) => ({ ...prev, [card.address]: 'error' }));
      } else {
        setExpanded((prev) => ({ ...prev, [card.address]: json as EventsResponse }));
      }
    } catch {
      setExpanded((prev) => ({ ...prev, [card.address]: 'error' }));
    }
  }

  const visibleCards = cards ? cards.slice(0, FREE_CARDS) : [];

  return (
    <main className="grid-bg mx-auto min-h-screen max-w-5xl px-6 py-10">
      {/* 页头 */}
      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-neon-yellow/10">
            <TrendingUp size={22} className="text-neon-yellow" />
          </span>
          <div>
            <h1 className="text-2xl font-extrabold sm:text-3xl">聪明钱动向</h1>
            <p className="mt-1 text-sm text-slate-400">机构与巨鲸的链上足迹</p>
          </div>
        </div>
        <div className="mt-4 flex items-start gap-2 rounded-xl border border-cyber-700 bg-cyber-900/50 px-4 py-3 text-xs text-slate-400">
          <AlertTriangle size={14} className="mt-0.5 shrink-0 text-neon-yellow" />
          <span>数据来自公开链上信息，非投资建议。</span>
        </div>
      </motion.div>

      {/* 加载态：骨架屏 */}
      {loading && (
        <div className="mt-8">
          <SkeletonCards />
        </div>
      )}

      {/* 错误态 */}
      {!loading && error && (
        <div className="mt-8 flex flex-col items-center gap-4 rounded-2xl border border-cyber-700 bg-cyber-900/60 px-6 py-16 text-center">
          <AlertTriangle size={36} className="text-neon-yellow" />
          <p className="text-sm text-slate-300">{error}</p>
          <button
            onClick={load}
            className="flex items-center gap-2 rounded-lg border border-cyber-700 px-4 py-2 text-sm text-slate-200 transition hover:border-neon-cyan/60 hover:text-neon-cyan active:scale-95"
          >
            <RotateCcw size={14} /> 重试
          </button>
        </div>
      )}

      {/* 空态 */}
      {!loading && !error && cards && cards.length === 0 && (
        <div className="mt-8 flex flex-col items-center gap-3 rounded-2xl border border-cyber-700 bg-cyber-900/60 px-6 py-16 text-center">
          <Inbox size={36} className="text-slate-600" />
          <p className="text-sm text-slate-400">暂无监控中的聪明钱地址</p>
        </div>
      )}

      {/* 地址卡网格 */}
      {!loading && !error && cards && cards.length > 0 && (
        <div className="mt-8">
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {visibleCards.map((card, i) => {
              const cm = CHAIN_META[card.chain];
              const isExpanded = expanded[card.address] !== undefined;
              const expData = expanded[card.address];
              return (
                <motion.div
                  key={card.address}
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.45, delay: i * 0.08 }}
                  className={`overflow-hidden rounded-2xl border bg-cyber-900/60 transition ${
                    isExpanded ? 'border-neon-cyan/50' : 'border-cyber-700 hover:border-neon-cyan/40'
                  }`}
                >
                  <button
                    onClick={() => toggleCard(card)}
                    className="w-full p-5 text-left transition active:scale-[0.99]"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <span className={`flex h-9 w-9 items-center justify-center rounded-full border ${cm.badge}`}>
                          <Wallet size={16} />
                        </span>
                        <div>
                          <p className="text-sm font-bold text-slate-100">{card.name}</p>
                          <p className="mt-0.5 font-mono text-[11px] text-slate-500">{card.maskedAddress}</p>
                        </div>
                      </div>
                      <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${cm.badge}`}>
                        {cm.label}
                      </span>
                    </div>

                    <div className="mt-4">
                      {card.degraded ? (
                        <p className="text-sm text-neon-yellow">数据暂不可用{card.degradedReason ? `（${card.degradedReason}）` : ''}</p>
                      ) : (
                        <p className="text-xl font-extrabold text-neon-cyan">{card.balance ?? '—'}</p>
                      )}
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3">
                      <div className="rounded-xl border border-cyber-700 bg-cyber-950/60 p-3">
                        <p className="text-[10px] text-slate-500">交易数</p>
                        <p className="mt-0.5 font-mono text-sm font-semibold text-slate-200">
                          {card.txCount === null ? '—' : card.txCount.toLocaleString('zh-CN')}
                        </p>
                      </div>
                      <div className="rounded-xl border border-cyber-700 bg-cyber-950/60 p-3">
                        <p className="flex items-center gap-1 text-[10px] text-slate-500">
                          <Clock size={10} /> 最近活跃
                        </p>
                        <p className="mt-0.5 text-xs font-semibold text-slate-300">
                          {card.lastActive ? card.lastActive.slice(0, 10) : '—'}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1.5 text-slate-500">
                        <Activity size={12} />
                        动态 {card.eventsCount} 条
                        {card.demo && <span className="rounded-full border border-slate-600/60 px-1.5 py-px text-[9px] text-slate-500">演示</span>}
                      </span>
                      <span className={`flex items-center gap-1 font-semibold ${isExpanded ? 'text-neon-cyan' : 'text-slate-400'}`}>
                        {isExpanded ? '收起' : '查看时间线'}
                        <ChevronDown size={13} className={`transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
                      </span>
                    </div>
                  </button>

                  {/* 展开时间线 */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.35, ease: 'easeInOut' }}
                        className="overflow-hidden border-t border-cyber-700/70"
                      >
                        <div className="p-4">
                          {expData === 'loading' && (
                            <div className="space-y-3">
                              {Array.from({ length: 3 }).map((_, k) => (
                                <div key={k} className="h-10 animate-pulse rounded-lg bg-cyber-800" />
                              ))}
                            </div>
                          )}
                          {expData === 'error' && (
                            <div className="flex flex-col items-center gap-3 py-4 text-center">
                              <p className="text-xs text-slate-400">动态加载失败</p>
                              <button
                                onClick={() => toggleCard(card)}
                                className="rounded-lg border border-cyber-700 px-3 py-1.5 text-xs text-slate-300 transition hover:border-neon-cyan/60 active:scale-95"
                              >
                                重试
                              </button>
                            </div>
                          )}
                          {expData && expData !== 'loading' && expData !== 'error' && (
                            <>
                              {expData.degraded && (
                                <div className="mb-3 rounded-lg border border-neon-yellow/30 bg-neon-yellow/5 px-3 py-2.5 text-[11px] leading-relaxed text-slate-300">
                                  {expData.degraded.message}
                                  {expData.degraded.snapshot && (
                                    <div className="mt-1.5 font-mono text-[10px] text-slate-400">
                                      余额 {Number(expData.degraded.snapshot.balanceEth ?? 0).toFixed(4)} ETH · 已发交易{' '}
                                      {Number(expData.degraded.snapshot.txCount ?? 0)} 笔
                                    </div>
                                  )}
                                </div>
                              )}
                              {expData.events.length === 0 && !expData.degraded && (
                                <p className="py-3 text-center text-xs text-slate-500">该地址暂无近期动态</p>
                              )}
                              <div className="space-y-2.5">
                                {expData.events.slice(0, FREE_EVENTS).map((ev, k) => (
                                  <motion.div
                                    key={`${ev.txHash || ev.ts}-${k}`}
                                    initial={{ opacity: 0, x: -12 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ duration: 0.3, delay: k * 0.07 }}
                                    className="flex items-center gap-2.5 rounded-lg border border-cyber-800 bg-cyber-950/60 px-3 py-2.5"
                                  >
                                    <span
                                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                                        ev.direction === 'in' ? 'bg-neon-green/15 text-neon-green' : 'bg-neon-red/15 text-neon-red'
                                      }`}
                                    >
                                      {ev.direction === 'in' ? <ArrowDownRight size={14} /> : <ArrowUpRight size={14} />}
                                    </span>
                                    <div className="min-w-0 flex-1">
                                      <p className={`truncate text-xs font-semibold ${ev.direction === 'in' ? 'text-neon-green' : 'text-neon-red'}`}>
                                        {ev.amountText}
                                      </p>
                                      <p className="truncate text-[10px] text-slate-500">
                                        {ev.direction === 'in' ? '来自' : '转出至'} {ev.counterpartyMasked || '—'} · {ev.tsText}
                                      </p>
                                    </div>
                                    {ev.evidenceUrl && (
                                      <a
                                        href={ev.evidenceUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        title={ev.txHash || ''}
                                        className="shrink-0 rounded-md border border-cyber-700 p-1.5 text-slate-400 transition hover:border-neon-cyan/60 hover:text-neon-cyan"
                                      >
                                        <ExternalLink size={12} />
                                      </a>
                                    )}
                                  </motion.div>
                                ))}
                                {expData.events.length > FREE_EVENTS && (
                                  <div className="relative overflow-hidden rounded-lg border border-cyber-800">
                                    {expData.events.slice(FREE_EVENTS).map((ev, k) => (
                                      <div
                                        key={`${ev.txHash || ev.ts}-l-${k}`}
                                        className="flex items-center gap-2.5 border-b border-cyber-800/60 bg-cyber-950/60 px-3 py-2.5 blur-[3px]"
                                      >
                                        <span className="h-7 w-7 rounded-full bg-cyber-800" />
                                        <div className="flex-1 space-y-1.5">
                                          <div className="h-3 w-2/3 rounded bg-cyber-800" />
                                          <div className="h-2.5 w-1/2 rounded bg-cyber-800" />
                                        </div>
                                      </div>
                                    ))}
                                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-cyber-950/55 text-center">
                                      <Lock size={16} className="text-neon-yellow" />
                                      <p className="text-[11px] text-slate-300">
                                        剩余 {expData.events.length - FREE_EVENTS} 条动态仅专业版可见
                                      </p>
                                      <a
                                        href="/#pricing"
                                        className="flex items-center gap-1.5 rounded-lg bg-neon-yellow/90 px-3 py-1.5 text-[11px] font-bold text-cyber-950 transition hover:bg-neon-yellow active:scale-95"
                                      >
                                        <Crown size={12} /> 升级解锁
                                      </a>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>

          {/* Feature Gate 锁层 */}
          {cards.length > FREE_CARDS && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="relative mt-5 overflow-hidden rounded-2xl border border-cyber-700 bg-cyber-900/60"
            >
              <div className="grid gap-4 p-5 sm:grid-cols-2">
                {cards.slice(FREE_CARDS).map((card, i) => {
                  const cm = CHAIN_META[card.chain];
                  return (
                    <div key={card.address} className="rounded-xl border border-cyber-700 bg-cyber-950/60 p-4 blur-[2px]">
                      <div className="flex items-center gap-3">
                        <span className={`flex h-8 w-8 items-center justify-center rounded-full border ${cm.badge}`}>
                          <Wallet size={14} />
                        </span>
                        <div>
                          <p className="text-sm font-bold text-slate-200">{card.name}</p>
                          <p className="font-mono text-[10px] text-slate-500">{card.maskedAddress}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-cyber-950/60 p-6 text-center backdrop-blur-[3px]">
                <Lock size={30} className="text-neon-yellow" />
                <p className="text-sm font-semibold text-slate-200">
                  还有 {cards.length - FREE_CARDS} 个监控地址未解锁
                </p>
                <p className="max-w-sm text-xs text-slate-400">
                  免费版展示前 {FREE_CARDS} 个地址与每地址前 {FREE_EVENTS} 条动态；升级专业版解锁完整监控列表、全部时间线与实时告警。
                </p>
                <a
                  href="/#pricing"
                  className="flex items-center gap-2 rounded-lg bg-neon-yellow/90 px-5 py-2.5 text-sm font-bold text-cyber-950 transition hover:bg-neon-yellow active:scale-95"
                >
                  <Crown size={15} /> 升级专业版
                </a>
              </div>
            </motion.div>
          )}

          <p className="mt-4 text-center text-[11px] text-slate-600">
            免费版每日刷新 · 数据源：公共 RPC / Blockstream / TronGrid，延迟约 5~15 分钟
          </p>
        </div>
      )}
    </main>
  );
}
