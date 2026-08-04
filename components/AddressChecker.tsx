'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, ShieldAlert, ShieldQuestion, Search, Loader2, ExternalLink } from 'lucide-react';

interface CheckResult {
  level: 'red' | 'yellow' | 'green';
  score: number;
  reasons: string[];
  evidenceLinks: string[];
}

const LEVEL_UI = {
  green: {
    icon: ShieldCheck,
    ring: 'border-neon-green/50',
    text: 'text-neon-green',
    glow: 'shadow-[0_0_40px_-8px_rgba(34,255,157,0.45)]',
    label: '低风险 · 可收款',
  },
  yellow: {
    icon: ShieldQuestion,
    ring: 'border-neon-yellow/50',
    text: 'text-neon-yellow',
    glow: 'shadow-[0_0_40px_-8px_rgba(255,214,10,0.4)]',
    label: '中风险 · 建议复核',
  },
  red: {
    icon: ShieldAlert,
    ring: 'border-neon-red/60',
    text: 'text-neon-red',
    glow: 'shadow-[0_0_40px_-8px_rgba(255,77,94,0.5)]',
    label: '高风险 · 立即停止往来',
  },
} as const;

export default function AddressChecker() {
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CheckResult | null>(null);
  const [error, setError] = useState('');

  async function check() {
    const a = address.trim();
    if (!a || loading) return;
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
        setError(json?.error || `查询失败（HTTP ${res.status}）`);
      } else {
        setResult(json as CheckResult);
      }
    } catch {
      setError('网络异常，请稍后再试。');
    } finally {
      setLoading(false);
    }
  }

  const ui = result ? LEVEL_UI[result.level] : null;

  return (
    <div className="w-full max-w-2xl">
      <div className="flex overflow-hidden rounded-xl border border-cyber-700 bg-cyber-900/80 backdrop-blur transition focus-within:border-neon-cyan/60">
        <input
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && check()}
          placeholder="粘贴 TRON 地址（T 开头 34 位），立即免费检测"
          className="flex-1 bg-transparent px-4 py-3.5 text-sm outline-none placeholder:text-slate-500"
        />
        <button
          onClick={check}
          disabled={loading}
          className="flex items-center gap-2 bg-neon-cyan/90 px-5 text-sm font-semibold text-cyber-950 transition hover:bg-neon-cyan disabled:opacity-50"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
          {loading ? '扫描中' : '免费检测'}
        </button>
      </div>

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
              <div>
                <p className={`text-lg font-bold ${ui.text}`}>{ui.label}</p>
                <p className="text-xs text-slate-400">安全评分 {result.score}/100</p>
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
            <div className="mt-4 flex flex-wrap gap-3">
              {result.evidenceLinks.map((l) => (
                <a
                  key={l}
                  href={l}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-neon-cyan hover:underline"
                >
                  链上证据 <ExternalLink size={12} />
                </a>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
