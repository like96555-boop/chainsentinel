'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { FileSpreadsheet, Download, Calculator, AlertTriangle, Landmark } from 'lucide-react';

type Detail = { date: string; symbol: string; type: string; qty: number; proceeds: number; cost: number; pnl: number; counterparty?: string; auditFlag?: boolean };
type MethodResult = {
  method: string;
  symbols: { symbol: string; realizedPnl: number; income: number; remainingQty: number; remainingCost: number }[];
  details: Detail[];
  byYear: { year: number; realizedPnl: number; income: number }[];
  totals: { realizedPnl: number; income: number };
  auditFlagCount: number;
  errors: string[];
};

const METHOD_LABELS: Record<string, string> = { fifo: 'FIFO 先进先出', lifo: 'LIFO 后进先出', hifo: 'HIFO 高成本先出' };

const SAMPLE = `date,symbol,type,qty,priceUsd,counterparty
2024-01-05,BTC,buy,0.5,42000,binance
2024-03-10,BTC,buy,0.5,68000,okx
2024-06-15,BTC,sell,0.4,61000,binance
2024-09-01,ETH,income,1.2,2400,ledger-staking
2024-11-20,ETH,sell,1.2,3100,okx
2025-02-14,BTC,spend,0.2,96000,TDemoPhishSink11111111111111111111
2025-04-01,USDT,buy,500,1,binance`;

const fmt = (n: number) => (Number.isFinite(n) ? n.toLocaleString('en-US', { maximumFractionDigits: 2 }) : '—');
const pnlColor = (n: number) => (n > 0 ? 'text-neon-green' : n < 0 ? 'text-neon-red' : 'text-slate-400');

export default function TaxPage() {
  const [csv, setCsv] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<MethodResult[] | null>(null);
  const [err, setErr] = useState('');
  const [rowsCount, setRowsCount] = useState(0);
  const [disclaimer, setDisclaimer] = useState('');

  async function run() {
    if (!csv.trim()) { setErr('请粘贴交易流水 CSV（或先点"填入样例"）'); return; }
    setLoading(true); setErr(''); setResults(null);
    try {
      const res = await fetch('/api/tax/compute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csv }),
      });
      const j = await res.json();
      if (!res.ok) { setErr(j?.error || '计算失败'); return; }
      setResults(j.results); setRowsCount(j.rows); setDisclaimer(j.disclaimer);
    } catch {
      setErr('网络异常，请重试');
    } finally {
      setLoading(false);
    }
  }

  function exportCsv() {
    if (!results) return;
    const lines = ['成本法,日期,币种,类型,数量,处置收入USD,成本USD,盈亏USD,对手方,审计关注'];
    for (const r of results) {
      for (const d of r.details) {
        lines.push([r.method, d.date, d.symbol, d.type === 'spend' ? '支付' : '卖出', d.qty, d.proceeds, d.cost, d.pnl, d.counterparty || '', d.auditFlag ? '⚠️是' : ''].join(','));
      }
    }
    const blob = new Blob(['\ufeff' + lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = '链哨税表审计底稿.csv';
    a.click();
    URL.revokeObjectURL(a.href);
  }

  const totalAudit = results?.reduce((s, r) => s + (r.auditFlagCount || 0), 0) || 0;

  return (
    <main className="grid-bg mx-auto min-h-screen max-w-5xl px-6 py-10">
      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <div className="flex items-center gap-3">
          <Landmark size={26} className="text-neon-cyan" />
          <h1 className="text-2xl font-bold">税务中心 · 税表审计</h1>
        </div>
        <p className="mt-2 text-sm text-slate-400">
          香港口径成本核算（FIFO / LIFO / HIFO 三种成本法对比），自动生成年度盈亏汇总与逐笔处置底稿，
          对手方命中风险标签库自动标记「审计关注」。依据：香港《税务条例》Cap.112 及税务局 DIPN 59。
        </p>
      </motion.div>

      {/* 输入区 */}
      <section className="mt-6 rounded-2xl border border-cyber-700 bg-cyber-900/60 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileSpreadsheet size={18} className="text-neon-cyan" />
            <h2 className="text-base font-bold">粘贴交易流水（CSV）</h2>
          </div>
          <button onClick={() => { setCsv(SAMPLE); setErr(''); }} className="rounded-lg border border-cyber-700 px-3 py-1.5 text-xs text-slate-300 hover:border-neon-cyan/60">
            填入样例
          </button>
        </div>
        <p className="mt-1 font-mono text-[11px] text-slate-500">格式：date,symbol,type,qty,priceUsd,counterparty（type：buy 买入 / sell 卖出 / income 收入 / spend 支付）</p>
        <textarea
          value={csv}
          onChange={(e) => setCsv(e.target.value)}
          rows={8}
          spellCheck={false}
          placeholder={'date,symbol,type,qty,priceUsd,counterparty\n2024-01-05,BTC,buy,0.5,42000,binance\n2024-06-15,BTC,sell,0.4,61000,binance'}
          className="mt-3 w-full rounded-xl border border-cyber-700 bg-cyber-950/70 p-3 font-mono text-xs text-slate-200 outline-none focus:border-neon-cyan/60"
        />
        <div className="mt-3 flex items-center gap-3">
          <button onClick={run} disabled={loading} className="flex items-center gap-2 rounded-lg bg-neon-cyan/20 px-5 py-2.5 text-sm font-medium text-neon-cyan ring-1 ring-neon-cyan/40 transition hover:bg-neon-cyan/30 active:scale-95 disabled:opacity-50">
            <Calculator size={15} /> {loading ? '核算中…' : '开始核算（三成本法）'}
          </button>
          {results && (
            <button onClick={exportCsv} className="flex items-center gap-2 rounded-lg border border-cyber-700 px-4 py-2.5 text-sm text-slate-300 transition hover:border-neon-cyan/60">
              <Download size={15} /> 导出审计底稿 CSV（给会计师）
            </button>
          )}
        </div>
        {err && <p className="mt-3 text-xs text-neon-red">⚠️ {err}</p>}
      </section>

      {/* 结果区 */}
      {results && (
        <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="mt-6 space-y-5">
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <span className="rounded-lg border border-cyber-700 bg-cyber-900/60 px-3 py-1.5 text-slate-300">已核算 {rowsCount} 笔交易</span>
            <span className={`rounded-lg border px-3 py-1.5 ${totalAudit > 0 ? 'border-neon-red/40 bg-neon-red/10 text-neon-red' : 'border-cyber-700 text-slate-400'}`}>
              {totalAudit > 0 ? `⚠️ ${totalAudit} 笔交易命中风险标签库（审计关注）` : '✅ 无命中风险标签库的交易'}
            </span>
          </div>

          {results.map((r) => (
            <div key={r.method} className="rounded-2xl border border-cyber-700 bg-cyber-900/60 p-5">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-slate-100">{METHOD_LABELS[r.method]}</h3>
                <div className="flex gap-4 text-xs">
                  <span className="text-slate-400">已实现盈亏 <b className={pnlColor(r.totals.realizedPnl)}>{fmt(r.totals.realizedPnl)} USD</b></span>
                  <span className="text-slate-400">收入(质押/空投) <b className="text-neon-yellow">{fmt(r.totals.income)} USD</b></span>
                </div>
              </div>

              {/* 按年汇总 */}
              <table className="mt-3 w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-cyber-700 text-slate-500">
                    <th className="py-1.5 pr-4">年度</th>
                    <th className="py-1.5 pr-4">已实现盈亏 (USD)</th>
                    <th className="py-1.5">收入 (USD)</th>
                  </tr>
                </thead>
                <tbody>
                  {r.byYear.map((y) => (
                    <tr key={y.year} className="border-b border-cyber-800/60">
                      <td className="py-1.5 pr-4 text-slate-200">{y.year}</td>
                      <td className={`py-1.5 pr-4 ${pnlColor(y.realizedPnl)}`}>{fmt(y.realizedPnl)}</td>
                      <td className="py-1.5 text-neon-yellow">{fmt(y.income)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* 币种汇总 */}
              <table className="mt-3 w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-cyber-700 text-slate-500">
                    <th className="py-1.5 pr-4">币种</th>
                    <th className="py-1.5 pr-4">已实现盈亏</th>
                    <th className="py-1.5 pr-4">收入</th>
                    <th className="py-1.5 pr-4">剩余持仓</th>
                    <th className="py-1.5">成本基准</th>
                  </tr>
                </thead>
                <tbody>
                  {r.symbols.map((s) => (
                    <tr key={s.symbol} className="border-b border-cyber-800/60">
                      <td className="py-1.5 pr-4 font-mono text-slate-200">{s.symbol}</td>
                      <td className={`py-1.5 pr-4 ${pnlColor(s.realizedPnl)}`}>{fmt(s.realizedPnl)}</td>
                      <td className="py-1.5 pr-4 text-neon-yellow">{fmt(s.income)}</td>
                      <td className="py-1.5 pr-4 text-slate-300">{s.remainingQty.toFixed(6)}</td>
                      <td className="py-1.5 text-slate-400">{fmt(s.remainingCost)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* 审计关注明细 */}
              {r.auditFlagCount > 0 && (
                <div className="mt-3 rounded-lg border border-neon-red/30 bg-neon-red/5 p-3">
                  <p className="flex items-center gap-1.5 text-xs font-medium text-neon-red">
                    <AlertTriangle size={13} /> 审计关注交易（对手方命中风险标签库，建议会计师专项复核）
                  </p>
                  <table className="mt-2 w-full text-left text-xs">
                    <tbody>
                      {r.details.filter((d) => d.auditFlag).map((d, i) => (
                        <tr key={i} className="border-b border-cyber-800/60">
                          <td className="py-1 pr-3 font-mono text-slate-300">{d.date}</td>
                          <td className="py-1 pr-3 text-slate-200">{d.symbol}</td>
                          <td className="py-1 pr-3 text-slate-400">{d.qty.toFixed(6)}</td>
                          <td className={`py-1 pr-3 ${pnlColor(d.pnl)}`}>{fmt(d.pnl)} USD</td>
                          <td className="py-1 break-all font-mono text-neon-red/80">{d.counterparty}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))}

          <p className="text-xs leading-relaxed text-slate-500">⚠️ {disclaimer} 核算口径说明：income（质押/空投/挖矿）按取得日公允市值计入成本基准并计入收入（DIPN 59）；spend（支付）视同处置。汇率与税率请以持牌税务师/会计师复核为准。</p>
        </motion.section>
      )}
    </main>
  );
}
