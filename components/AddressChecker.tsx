'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, ShieldAlert, ShieldQuestion, Search, Loader2, ExternalLink, RotateCcw, History } from 'lucide-react';

type ChainId = 'tron' | 'btc' | 'eth';

interface CheckResult {
  chain?: ChainId;
  level: 'red' | 'yellow' | 'green';
  score: number;
  reasons: string[];
  evidenceLinks: string[];
  blacklist?: { label: string; source?: string; sourceLabel?: string };
}

interface RecentItem {
  address: string;
  chain: ChainId;
  level: 'red' | 'yellow' | 'green';
  at: number;
}

const LEVEL_UI = {
  green: {
    icon: ShieldCheck,
    ring: 'border-neon-green/50',
    text: 'text-neon-green',
    glow: 'shadow-[0_0_40px_-8px_rgba(34,255,157,0.45)]',
  },
  yellow: {
    icon: ShieldQuestion,
    ring: 'border-neon-yellow/50',
    text: 'text-neon-yellow',
    glow: 'shadow-[0_0_40px_-8px_rgba(255,214,10,0.4)]',
  },
  red: {
    icon: ShieldAlert,
    ring: 'border-neon-red/60',
    text: 'text-neon-red',
    glow: 'shadow-[0_0_40px_-8px_rgba(255,77,94,0.5)]',
  },
} as const;

const CHAIN_META: Record<ChainId, { label: string; cls: string }> = {
  tron: { label: 'TRON', cls: 'border-red-400/40 bg-red-400/10 text-red-300' },
  btc: { label: 'BTC', cls: 'border-orange-400/40 bg-orange-400/10 text-orange-300' },
  eth: { label: 'ETH', cls: 'border-indigo-400/40 bg-indigo-400/10 text-indigo-300' },
};

const RECENT_KEY = 'cs_recent_checks';

const T = {
  zh: {
    levelLabel: { green: '低风险 · 可收款', yellow: '中风险 · 建议复核', red: '高风险 · 立即停止往来' } as Record<'red' | 'yellow' | 'green', string>,
    placeholder: '支持 TRON / BTC / ETH 地址，粘贴立即免费检测',
    scanning: '扫描中',
    check: '免费检测',
    recent: '最近查询',
    queryFailed: (s: string) => `查询失败（HTTP ${s}）`,
    networkError: '网络异常，请稍后再试。',
    score: (s: number) => `安全评分 ${s}/100`,
    basis: '判定依据：',
    source: '数据来源：',
    blacklistHit: (label: string) => `命中本地风险标签库（精确地址匹配），标签「${label}」`,
    logic: '判定逻辑：',
    logicDetail: '未命中本地黑名单，按链上公开数据评估（合约识别 / 余额 / 近期交易活跃度），数据来自 TronGrid / Blockstream / 公共 RPC。',
    notMarked: '未标注',
    evidence: '链上证据',
    again: '再查一个',
    footnote: '数据来源：链上公开数据（TronGrid / Blockstream / 公共 RPC）+ 本地黑名单库；判定依据见上方逐条理由与链上证据（可点击复核）。结果仅为风险提示，不构成法律意见。',
  },
  en: {
    levelLabel: { green: 'Low risk · Safe to receive', yellow: 'Medium risk · Review recommended', red: 'High risk · Stop immediately' } as Record<'red' | 'yellow' | 'green', string>,
    placeholder: 'Paste a TRON / BTC / ETH address to check it for free',
    scanning: 'Scanning',
    check: 'Check free',
    recent: 'Recent checks',
    queryFailed: (s: string) => `Check failed (HTTP ${s})`,
    networkError: 'Network error, please try again.',
    score: (s: number) => `Risk score ${s}/100`,
    basis: 'Basis: ',
    source: 'Source: ',
    blacklistHit: (label: string) => `Matched local risk label database (exact address match), label: "${label}"`,
    logic: 'Logic: ',
    logicDetail:
      'No local blacklist match. Evaluated against public on-chain data (contract detection / balance / recent activity), sourced from TronGrid / Blockstream / public RPC.',
    notMarked: 'Unlabeled',
    evidence: 'On-chain evidence',
    again: 'Check another',
    footnote:
      'Data sources: public on-chain data (TronGrid / Blockstream / public RPC) + local risk label database. Results are risk signals only and do not constitute legal advice.',
  },
} as const;

type Lang = 'zh' | 'en';

function loadRecent(): RecentItem[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr.slice(0, 5) : [];
  } catch {
    return [];
  }
}

function saveRecent(item: RecentItem) {
  try {
    const list = loadRecent().filter((r) => r.address !== item.address);
    list.unshift(item);
    localStorage.setItem(RECENT_KEY, JSON.stringify(list.slice(0, 5)));
  } catch {
    /* 隐私模式等场景下静默失败 */
  }
}

export default function AddressChecker({ lang = 'zh' }: { lang?: Lang } = {}) {
  const t = T[lang];
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CheckResult | null>(null);
  const [error, setError] = useState('');
  const [recent, setRecent] = useState<RecentItem[]>([]);
  const prefilledRef = useRef(false);

  useEffect(() => {
    setRecent(loadRecent());
  }, []);

  // 支持 /?addr=<地址> 自动填入并核查（警示榜「核查此地址」入口）
  useEffect(() => {
    if (prefilledRef.current) return;
    prefilledRef.current = true;
    const a = new URLSearchParams(window.location.search).get('addr')?.trim();
    if (a) check(a);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function check(target?: string) {
    const a = (target ?? address).trim();
    if (!a || loading) return;
    if (target) setAddress(target);
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await fetch('/api/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: a }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json?.error || t.queryFailed(String(res.status)));
      } else {
        const r = json as CheckResult;
        setResult(r);
        if (r.chain) {
          saveRecent({ address: a, chain: r.chain, level: r.level, at: Date.now() });
          setRecent(loadRecent());
        }
      }
    } catch {
      setError(t.networkError);
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setResult(null);
    setError('');
    setAddress('');
  }

  const ui = result ? LEVEL_UI[result.level] : null;
  const chainMeta = result?.chain ? CHAIN_META[result.chain] : null;

  return (
    <div className="w-full max-w-2xl">
      <div className="flex overflow-hidden rounded-xl border border-cyber-700 bg-cyber-900/80 backdrop-blur transition focus-within:border-neon-cyan/60">
        <input
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && check()}
          placeholder={t.placeholder}
          className="flex-1 bg-transparent px-4 py-3.5 text-sm outline-none placeholder:text-slate-500"
        />
        <button
          onClick={() => check()}
          disabled={loading}
          className="flex items-center gap-2 bg-neon-cyan/90 px-5 text-sm font-semibold text-cyber-950 transition hover:bg-neon-cyan disabled:opacity-50"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
          {loading ? t.scanning : t.check}
        </button>
      </div>

      {/* 最近查询记录（本地存储，点击可复查） */}
      {recent.length > 0 && !result && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="flex items-center gap-1 text-xs text-slate-500">
            <History size={12} /> {t.recent}
          </span>
          {recent.map((r) => (
            <button
              key={r.address}
              onClick={() => check(r.address)}
              disabled={loading}
              title={r.address}
              className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition hover:border-neon-cyan/60 disabled:opacity-40 ${
                CHAIN_META[r.chain]?.cls || 'border-cyber-700 text-slate-300'
              }`}
            >
              <span className="font-semibold">{CHAIN_META[r.chain]?.label}</span>
              <span className="max-w-[120px] truncate">{r.address}</span>
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  r.level === 'green' ? 'bg-neon-green' : r.level === 'yellow' ? 'bg-neon-yellow' : 'bg-neon-red'
                }`}
              />
            </button>
          ))}
        </div>
      )}

      {error && <p className="mt-3 text-sm text-neon-red">{error}</p>}

      <AnimatePresence>
        {result && ui && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={`relative mt-5 overflow-hidden rounded-xl border bg-cyber-900/80 p-5 backdrop-blur ${ui.ring} ${ui.glow}`}
          >
            {/* 扫描线动画 */}
            <div className="pointer-events-none absolute inset-x-0 top-0 h-1/2 animate-scan-line bg-gradient-to-b from-transparent via-neon-cyan/10 to-transparent" />
            <div className="flex items-center gap-3">
              <ui.icon size={30} className={ui.text} />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className={`text-lg font-bold ${ui.text}`}>{t.levelLabel[result.level]}</p>
                  {chainMeta && (
                    <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${chainMeta.cls}`}>
                      {chainMeta.label}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400">{t.score(result.score)}</p>
              </div>
            </div>
            <ul className="mt-4 space-y-1.5">
              {result.reasons.map((r, i) => (
                <li key={i} className="flex gap-2 text-sm text-slate-300">
                  <span className="text-slate-500">•</span>
                  {r}
                </li>
              ))}
            </ul>
            {/* 数据来源与判定逻辑（透明化） */}
            <div className="mt-4 rounded-lg border border-cyber-700/70 bg-cyber-950/50 px-3 py-2.5 text-xs leading-relaxed text-slate-400">
              {result.blacklist ? (
                <>
                  <p>
                    <span className="font-medium text-slate-300">{t.basis}</span>
                    {t.blacklistHit(result.blacklist.label)}
                  </p>
                  <p>
                    <span className="font-medium text-slate-300">{t.source}</span>
                    {result.blacklist.sourceLabel || result.blacklist.source || t.notMarked}
                  </p>
                </>
              ) : (
                <p>
                  <span className="font-medium text-slate-300">{t.logic}</span>
                  {t.logicDetail}
                </p>
              )}
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              {result.evidenceLinks.map((l) => (
                <a
                  key={l}
                  href={l}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-neon-cyan hover:underline"
                >
                  {t.evidence} <ExternalLink size={12} />
                </a>
              ))}
              <button
                onClick={reset}
                className="ml-auto flex items-center gap-1.5 rounded-lg border border-cyber-700 px-3 py-1.5 text-xs text-slate-300 transition hover:border-neon-cyan/60 hover:text-neon-cyan"
              >
                <RotateCcw size={12} /> {t.again}
              </button>
            </div>
            <p className="mt-3 border-t border-cyber-700/60 pt-2 text-[10px] leading-relaxed text-slate-500">{t.footnote}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
