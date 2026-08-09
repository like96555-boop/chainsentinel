'use client';

import { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BannerCarousel } from '@/components/BannerCarousel';
import {
  ShieldAlert,
  ExternalLink,
  Search,
  Copy,
  Check,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Inbox,
  AlertTriangle,
  FileWarning,
} from 'lucide-react';
import { ALERT_TYPE_META, ALERT_CHAIN_META, ALERT_TYPES, sourceBadgeOf } from '@/lib/alerts-meta';
import type { AlertType, AlertChain } from '@/lib/alerts-meta';

interface AlertItem {
  address: string;
  maskedAddress: string;
  chain: AlertChain;
  type: AlertType;
  typeLabel: string;
  firstSeen: string;
  txCount: number;
  notes: string;
  evidenceUrl: string;
  demo: boolean;
  source: string;
}

interface AlertsResponse {
  total: number;
  page: number;
  pageSize: number;
  items: AlertItem[];
}

const CHAIN_FILTERS: Array<{ key: 'all' | AlertChain; label: string }> = [
  { key: 'all', label: '全部' },
  { key: 'tron', label: 'TRON' },
  { key: 'btc', label: 'BTC' },
  { key: 'eth', label: 'ETH' },
];

const PAGE_SIZE = 10;

function SkeletonRows() {
  return (
    <div className="space-y-3 p-5">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex animate-pulse items-center gap-4">
          <div className="h-5 w-16 rounded-full bg-cyber-800" />
          <div className="h-5 w-48 rounded bg-cyber-800" />
          <div className="ml-auto h-5 w-24 rounded bg-cyber-800" />
        </div>
      ))}
    </div>
  );
}

export default function AlertsPage() {
  const [chain, setChain] = useState<'all' | AlertChain>('all');
  const [type, setType] = useState<AlertType | 'all'>('all');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<AlertsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState('');

  const load = useCallback(async (c: 'all' | AlertChain, t: AlertType | 'all', p: number) => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ chain: c, page: String(p), pageSize: String(PAGE_SIZE) });
      if (t !== 'all') params.set('type', t);
      const res = await fetch(`/api/alerts?${params}`);
      const json = await res.json();
      if (!res.ok) {
        setError(json?.error || `加载失败（HTTP ${res.status}）`);
        setData(null);
      } else {
        setData(json as AlertsResponse);
      }
    } catch {
      setError('网络异常，请稍后再试。');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(chain, type, page);
  }, [load, chain, type, page]);

  function pickChain(c: 'all' | AlertChain) {
    setChain(c);
    setPage(1);
  }
  function pickType(t: AlertType | 'all') {
    setType(t);
    setPage(1);
  }

  async function copyAddress(a: string) {
    try {
      await navigator.clipboard.writeText(a);
      setCopied(a);
      setTimeout(() => setCopied(''), 1200);
    } catch {
      /* clipboard 不可用时静默 */
    }
  }

  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;

  return (
    <main className="grid-bg mx-auto min-h-screen max-w-5xl px-6 py-10">
      {/* 营销横幅：警示榜顶部 */}
      <div className="mb-6">
        <BannerCarousel position="alerts-top" />
      </div>
      {/* 页头 */}
      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-neon-red/10">
            <ShieldAlert size={22} className="text-neon-red" />
          </span>
          <div>
            <h1 className="text-2xl font-extrabold sm:text-3xl">链上风险警示榜</h1>
            <p className="mt-1 text-sm text-slate-400">免费公开的链上风险情报</p>
          </div>
        </div>
      </motion.div>

      {/* 筛选 chips */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.1 }}
        className="mt-7 flex flex-wrap items-center gap-2"
      >
        <span className="text-xs text-slate-500">链：</span>
        {CHAIN_FILTERS.map((c) => (
          <button
            key={c.key}
            onClick={() => pickChain(c.key)}
            className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition active:scale-95 ${
              chain === c.key
                ? 'border-neon-cyan/60 bg-neon-cyan/15 text-neon-cyan'
                : 'border-cyber-700 text-slate-400 hover:border-neon-cyan/40 hover:text-slate-200'
            }`}
          >
            {c.label}
          </button>
        ))}
        <span className="ml-3 text-xs text-slate-500">类型：</span>
        {[{ key: 'all' as const, label: '全部' }, ...ALERT_TYPES.map((t) => ({ key: t, label: ALERT_TYPE_META[t].label }))].map((t) => (
          <button
            key={t.key}
            onClick={() => pickType(t.key)}
            className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition active:scale-95 ${
              type === t.key
                ? 'border-neon-yellow/60 bg-neon-yellow/15 text-neon-yellow'
                : 'border-cyber-700 text-slate-400 hover:border-neon-yellow/40 hover:text-slate-200'
            }`}
          >
            {t.label}
          </button>
        ))}
      </motion.div>

      {/* 榜单卡片 */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.18 }}
        className="mt-5 overflow-hidden rounded-2xl border border-cyber-700 bg-cyber-900/60"
      >
        {loading && <SkeletonRows />}

        {!loading && error && (
          <div className="flex flex-col items-center gap-4 px-6 py-16 text-center">
            <AlertTriangle size={36} className="text-neon-yellow" />
            <p className="text-sm text-slate-300">{error}</p>
            <button
              onClick={() => load(chain, type, page)}
              className="flex items-center gap-2 rounded-lg border border-cyber-700 px-4 py-2 text-sm text-slate-200 transition hover:border-neon-cyan/60 hover:text-neon-cyan active:scale-95"
            >
              <RotateCcw size={14} /> 重试
            </button>
          </div>
        )}

        {!loading && !error && data && data.items.length === 0 && (
          <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
            <Inbox size={36} className="text-slate-600" />
            <p className="text-sm text-slate-400">当前筛选条件下暂无风险地址记录</p>
            <button
              onClick={() => {
                pickChain('all');
                pickType('all');
              }}
              className="rounded-lg border border-cyber-700 px-4 py-2 text-xs text-slate-300 transition hover:border-neon-cyan/60"
            >
              清除筛选
            </button>
          </div>
        )}

        {!loading && !error && data && data.items.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead>
                <tr className="border-b border-cyber-700 text-xs text-slate-500">
                  <th className="px-5 py-3.5 font-medium">风险类型</th>
                  <th className="px-5 py-3.5 font-medium">地址</th>
                  <th className="px-5 py-3.5 font-medium">首次标记</th>
                  <th className="px-5 py-3.5 font-medium">关联交易</th>
                  <th className="px-5 py-3.5 font-medium">证据</th>
                  <th className="px-5 py-3.5 font-medium">操作</th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence initial={false}>
                  {data.items.map((item, i) => {
                    const tm = ALERT_TYPE_META[item.type];
                    const cm = ALERT_CHAIN_META[item.chain];
                    return (
                      <motion.tr
                        key={item.address}
                        initial={{ opacity: 0, y: 14 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.35, delay: i * 0.06 }}
                        className="group border-b border-cyber-800/70 transition hover:bg-cyber-800/40"
                      >
                        <td className="px-5 py-4">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${tm.badge}`}>
                              <span className={`h-1.5 w-1.5 rounded-full ${tm.dot}`} />
                              {tm.label}
                            </span>
                            <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${cm.badge}`}>{cm.label}</span>
                            {(() => {
                              const sb = sourceBadgeOf(item.source);
                              return (
                                <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${sb.cls}`}>{sb.label}</span>
                              );
                            })()}
                            {item.demo && (
                              <span className="rounded-full border border-slate-600/60 px-2 py-0.5 text-[10px] text-slate-500">演示</span>
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <div className="group/addr relative inline-flex items-center gap-2">
                            <span className="font-mono text-xs text-slate-300">{item.maskedAddress}</span>
                            <button
                              onClick={() => copyAddress(item.address)}
                              title="复制完整地址"
                              className="rounded-md p-1 text-slate-500 opacity-0 transition hover:bg-cyber-700 hover:text-neon-cyan group-hover/addr:opacity-100 active:scale-90"
                            >
                              {copied === item.address ? <Check size={13} className="text-neon-green" /> : <Copy size={13} />}
                            </button>
                            {/* hover 显示完整地址 */}
                            <div className="pointer-events-none absolute left-0 top-full z-20 mt-1.5 hidden whitespace-nowrap rounded-lg border border-cyber-700 bg-cyber-950/95 px-3 py-2 font-mono text-[11px] text-neon-cyan shadow-xl group-hover/addr:block">
                              {item.address}
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-xs text-slate-400">{item.firstSeen.slice(0, 10)}</td>
                        <td className="px-5 py-4">
                          <span className="font-mono text-xs font-semibold text-slate-200">
                            {item.txCount.toLocaleString('zh-CN')}
                          </span>
                          <span className="ml-1 text-[10px] text-slate-500">笔</span>
                        </td>
                        <td className="px-5 py-4">
                          <a
                            href={item.evidenceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-neon-cyan hover:underline"
                          >
                            链上证据 <ExternalLink size={11} />
                          </a>
                        </td>
                        <td className="px-5 py-4">
                          <a
                            href={`/?addr=${encodeURIComponent(item.address)}`}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-cyber-700 px-3 py-1.5 text-xs text-slate-200 transition hover:border-neon-cyan/60 hover:text-neon-cyan active:scale-95"
                          >
                            <Search size={12} /> 核查此地址
                          </a>
                        </td>
                      </motion.tr>
                    );
                  })}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        )}

        {/* 分页器 */}
        {!loading && !error && data && data.total > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-cyber-700 px-5 py-3.5">
            <p className="text-xs text-slate-500">
              共 <span className="font-semibold text-slate-300">{data.total}</span> 条风险地址 · 第 {data.page}/{totalPages} 页
              {data.items.length > 0 && (
                <span className="ml-2 text-slate-600">来源：公开情报 + 本地黑名单（{data.items[0].source === 'blacklist' ? '黑名单' : '情报种子'}）</span>
              )}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={data.page <= 1}
                className="flex items-center gap-1 rounded-lg border border-cyber-700 px-3 py-1.5 text-xs text-slate-300 transition hover:border-neon-cyan/60 disabled:opacity-30 active:scale-95"
              >
                <ChevronLeft size={13} /> 上一页
              </button>
              <span className="px-1 font-mono text-xs text-slate-400">
                {data.page}/{totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={data.page >= totalPages}
                className="flex items-center gap-1 rounded-lg border border-cyber-700 px-3 py-1.5 text-xs text-slate-300 transition hover:border-neon-cyan/60 disabled:opacity-30 active:scale-95"
              >
                下一页 <ChevronRight size={13} />
              </button>
            </div>
          </div>
        )}
      </motion.div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="mt-5 flex items-start gap-2 text-xs leading-relaxed text-slate-500"
      >
        <FileWarning size={14} className="mt-0.5 shrink-0 text-neon-yellow" />
        标注「演示」的地址为模拟种子数据，仅用于功能展示；真实名单会持续收录公开披露的钓鱼归集、洗钱通道、混币入口与诈骗资金地址，并随证据链更新。
      </motion.p>
      <p className="mt-2 text-[10px] leading-relaxed text-slate-600">
        归类依据：风险类型按行为特征划分（钓鱼归集=多笔小额汇入单一地址；洗钱通道=高频中转且来源分散；混币入口=与混币协议交互；诈骗资金=关联公开报案/披露事件）。每条记录可点击链上证据复核原始交易；标记时间与交易数来自公开链上数据。
      </p>
    </main>
  );
}
