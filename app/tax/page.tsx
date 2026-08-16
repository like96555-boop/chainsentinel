'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { FileSpreadsheet, Download, Calculator, AlertTriangle, Landmark, Printer, FileText } from 'lucide-react';

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
type Report = {
  reportId: string;
  reportTitle: string;
  preparedDate: string;
  period: { from: string; to: string };
  clientName: string;
  preparedBy: string;
  basis: string[];
  summary: { method: string; methodZh: string; disposalCount: number; realizedPnl: number; income: number; auditFlagCount: number }[];
  auditFindings: { date: string; symbol: string; typeZh: string; qty: number; proceeds: number; cost: number; pnl: number; counterparty: string; label: string; source: string }[];
  byYear: { year: number; realizedPnl: number; income: number }[];
  detailsByMethod: { method: string; details: Detail[] }[];
  disclaimer: string;
  certification: string[];
};

const METHOD_LABELS: Record<string, string> = { fifo: '先进先出法（FIFO）', lifo: '后进先出法（LIFO）', hifo: '高成本先出法（HIFO）' };

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
  const [clientName, setClientName] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<MethodResult[] | null>(null);
  const [report, setReport] = useState<Report | null>(null);
  const [err, setErr] = useState('');
  const [rowsCount, setRowsCount] = useState(0);
  const [disclaimer, setDisclaimer] = useState('');

  async function run() {
    if (!csv.trim()) { setErr('请粘贴交易流水 CSV（或先点"填入样例"）'); return; }
    setLoading(true); setErr(''); setResults(null); setReport(null);
    try {
      const res = await fetch('/api/tax/compute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csv, clientName: clientName.trim() }),
      });
      const j = await res.json();
      if (!res.ok) { setErr(j?.error || '计算失败'); return; }
      setResults(j.results); setReport(j.report); setRowsCount(j.rows); setDisclaimer(j.disclaimer);
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
        lines.push([r.method, d.date, d.symbol, d.type === 'spend' ? '支付' : '卖出', d.qty, d.proceeds, d.cost, d.pnl, d.counterparty || '', d.auditFlag ? '是' : ''].join(','));
      }
    }
    const blob = new Blob(['\ufeff' + lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `税表审计底稿-${clientName || '未命名客户'}.csv`;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }

  const totalAudit = results?.reduce((s, r) => s + (r.auditFlagCount || 0), 0) || 0;
  const auditFindings = report?.auditFindings || [];

  return (
    <main className="grid-bg mx-auto min-h-screen max-w-5xl px-6 py-10">
      {/* ===== 屏幕端：输入区（打印时隐藏） ===== */}
      <div className="no-print">
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <div className="flex items-center gap-3">
            <Landmark size={26} className="text-neon-cyan" />
            <h1 className="text-2xl font-bold">税务中心 · 税表审计</h1>
          </div>
          <p className="mt-2 text-sm text-slate-400">
            香港口径成本核算（FIFO / LIFO / HIFO 三种成本法对比），自动生成专业税务核算报告——
            含执行摘要、编制依据、审计联动发现与明细底稿，可直接打印交会计师/税务师复核或作为申报草稿。
            依据：香港《税务条例》Cap.112 及税务局 DIPN 59。
          </p>
        </motion.div>

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
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <input
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="客户名称（报告抬头用，如：XX Trading Limited）"
              className="rounded-xl border border-cyber-700 bg-cyber-950/70 px-3 py-2.5 text-sm text-slate-200 outline-none focus:border-neon-cyan/60"
            />
          </div>
          <textarea
            value={csv}
            onChange={(e) => setCsv(e.target.value)}
            rows={8}
            spellCheck={false}
            placeholder={'date,symbol,type,qty,priceUsd,counterparty\n2024-01-05,BTC,buy,0.5,42000,binance\n2024-06-15,BTC,sell,0.4,61000,binance'}
            className="mt-3 w-full rounded-xl border border-cyber-700 bg-cyber-950/70 p-3 font-mono text-xs text-slate-200 outline-none focus:border-neon-cyan/60"
          />
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <button onClick={run} disabled={loading} className="flex items-center gap-2 rounded-lg bg-neon-cyan/20 px-5 py-2.5 text-sm font-medium text-neon-cyan ring-1 ring-neon-cyan/40 transition hover:bg-neon-cyan/30 active:scale-95 disabled:opacity-50">
              <Calculator size={15} /> {loading ? '核算中…' : '开始核算（三成本法）'}
            </button>
            {report && (
              <>
                <button onClick={() => window.print()} className="flex items-center gap-2 rounded-lg bg-neon-cyan/90 px-4 py-2.5 text-sm font-semibold text-cyber-950 transition hover:bg-neon-cyan">
                  <Printer size={15} /> 打印报告（存 PDF 交会计师）
                </button>
                <button onClick={exportCsv} className="flex items-center gap-2 rounded-lg border border-cyber-700 px-4 py-2.5 text-sm text-slate-300 transition hover:border-neon-cyan/60">
                  <Download size={15} /> 导出明细底稿 CSV
                </button>
              </>
            )}
          </div>
          {err && <p className="mt-3 text-xs text-neon-red">⚠️ {err}</p>}
        </section>
      </div>

      {/* ===== 专业报告区（屏幕深色主题 + 打印白底黑字） ===== */}
      {report && results && (
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          id="tax-report"
          className="report-paper mt-6 rounded-2xl border border-cyber-700 bg-cyber-900/60 p-6 sm:p-8"
        >
          {/* 报告头 */}
          <div className="flex flex-wrap items-start justify-between gap-3 border-b-2 border-slate-200 pb-4 print:border-gray-800">
            <div>
              <p className="text-xs text-slate-400 print:text-gray-500">ChainSentinel Limited (Hong Kong)</p>
              <h2 className="mt-1 text-lg font-extrabold text-slate-100 print:text-black">{report.reportTitle}</h2>
              <p className="mt-1 text-xs text-slate-400 print:text-gray-600">报告编号：{report.reportId}</p>
            </div>
            <div className="text-right text-xs text-slate-400 print:text-gray-600">
              <p>编制日期：{report.preparedDate}</p>
              <p>报告期间：{report.period.from} 至 {report.period.to}</p>
              <p>编制机构：ChainSentinel Limited</p>
            </div>
          </div>

          {/* 客户与编制信息 */}
          <div className="mt-4 grid gap-2 text-xs sm:grid-cols-2">
            <p className="text-slate-300 print:text-black"><span className="text-slate-500 print:text-gray-600">客户名称：</span>{report.clientName}</p>
            <p className="text-slate-300 print:text-black"><span className="text-slate-500 print:text-gray-600">编制方式：</span>{report.preparedBy}</p>
          </div>

          {/* 执行摘要 */}
          <h3 className="mt-6 flex items-center gap-2 text-sm font-bold text-slate-100 print:text-black">
            <FileText size={15} className="text-neon-cyan print:text-black" /> 一、执行摘要（三种成本法对比）
          </h3>
          <div className="mt-2 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-cyber-600 text-slate-500 print:border-gray-400 print:text-gray-600">
                  <th className="py-2 pr-4">成本基准</th>
                  <th className="py-2 pr-4">处置笔数</th>
                  <th className="py-2 pr-4">已实现收益/亏损 (USD)</th>
                  <th className="py-2 pr-4">收入-质押/空投 (USD)</th>
                  <th className="py-2">审计关注笔数</th>
                </tr>
              </thead>
              <tbody>
                {report.summary.map((s) => (
                  <tr key={s.method} className="border-b border-cyber-800/60 print:border-gray-300">
                    <td className="py-2 pr-4 font-medium text-slate-200 print:text-black">{s.methodZh}</td>
                    <td className="py-2 pr-4 text-slate-300 print:text-black">{s.disposalCount}</td>
                    <td className={`py-2 pr-4 font-semibold ${pnlColor(s.realizedPnl)}`}>{fmt(s.realizedPnl)}</td>
                    <td className="py-2 pr-4 text-neon-yellow print:text-black">{fmt(s.income)}</td>
                    <td className={`py-2 ${s.auditFlagCount > 0 ? 'font-semibold text-neon-red print:text-black' : 'text-slate-400 print:text-gray-600'}`}>{s.auditFlagCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-[11px] text-slate-500 print:text-gray-600">已核算 {rowsCount} 笔交易；口径差异说明：三种成本基准下的已实现收益因匹配顺序不同而存在差异，最终申报口径由持牌税务师按客户情况选定。</p>

          {/* 审计联动发现 */}
          <h3 className="mt-6 flex items-center gap-2 text-sm font-bold text-slate-100 print:text-black">
            <AlertTriangle size={15} className="text-neon-red print:text-black" /> 二、审计联动发现（对手方命中风险标签库）
          </h3>
          {auditFindings.length > 0 ? (
            <>
              <div className="mt-2 overflow-x-auto rounded-lg border border-neon-red/30 bg-neon-red/5 p-3 print:border-gray-400">
                <p className="text-[11px] leading-relaxed text-neon-red print:text-black">
                  ⚠️ 以下 {auditFindings.length} 笔处置交易的对手方地址命中风险标签库（含 OFAC SDN 制裁名单与公开安全事件记录）。
                  涉及资金可能来源于/流向受制裁或涉诉主体，建议会计师复核并考虑在申报中单独披露；重大金额建议咨询律师。
                </p>
                <table className="mt-2 w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-neon-red/20 text-neon-red/80 print:text-gray-700">
                      <th className="py-1.5 pr-3">日期</th>
                      <th className="py-1.5 pr-3">币种</th>
                      <th className="py-1.5 pr-3">类型</th>
                      <th className="py-1.5 pr-3">数量</th>
                      <th className="py-1.5 pr-3">盈亏 (USD)</th>
                      <th className="py-1.5 pr-3">命中标签</th>
                      <th className="py-1.5 pr-3">数据来源</th>
                      <th className="py-1.5">对手方地址</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditFindings.map((f, i) => (
                      <tr key={i} className="border-b border-cyber-800/40 print:border-gray-300">
                        <td className="py-1.5 pr-3 font-mono text-slate-300 print:text-black">{f.date}</td>
                        <td className="py-1.5 pr-3 text-slate-200 print:text-black">{f.symbol}</td>
                        <td className="py-1.5 pr-3 text-slate-400 print:text-gray-700">{f.typeZh}</td>
                        <td className="py-1.5 pr-3 text-slate-300 print:text-black">{f.qty.toFixed(6)}</td>
                        <td className={`py-1.5 pr-3 ${pnlColor(f.pnl)}`}>{fmt(f.pnl)}</td>
                        <td className="py-1.5 pr-3 text-neon-red/90 print:text-black">{f.label}</td>
                        <td className="py-1.5 pr-3 text-slate-400 print:text-gray-700">{f.source}</td>
                        <td className="py-1.5 break-all font-mono text-slate-300 print:text-black">{f.counterparty}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <p className="mt-2 text-xs text-slate-400 print:text-gray-600">✅ 未发现对手方命中风险标签库的交易。</p>
          )}

          {/* 按年汇总 */}
          <h3 className="mt-6 text-sm font-bold text-slate-100 print:text-black">三、按年度汇总（FIFO 口径）</h3>
          <div className="mt-2 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-cyber-600 text-slate-500 print:border-gray-400 print:text-gray-600">
                  <th className="py-2 pr-4">课税年度</th>
                  <th className="py-2 pr-4">已实现收益/亏损 (USD)</th>
                  <th className="py-2">收入-质押/空投 (USD)</th>
                </tr>
              </thead>
              <tbody>
                {report.byYear.map((y) => (
                  <tr key={y.year} className="border-b border-cyber-800/60 print:border-gray-300">
                    <td className="py-2 pr-4 text-slate-200 print:text-black">{y.year}</td>
                    <td className={`py-2 pr-4 ${pnlColor(y.realizedPnl)}`}>{fmt(y.realizedPnl)}</td>
                    <td className="py-2 text-neon-yellow print:text-black">{fmt(y.income)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 编制依据 */}
          <h3 className="mt-6 text-sm font-bold text-slate-100 print:text-black">四、编制依据与方法说明</h3>
          <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-xs leading-relaxed text-slate-300 print:text-black">
            {report.basis.map((b, i) => (
              <li key={i}>{b}</li>
            ))}
          </ol>

          {/* 明细底稿 */}
          <h3 className="mt-6 text-sm font-bold text-slate-100 print:text-black">五、处置明细底稿（按成本法）</h3>
          <p className="mt-1 text-[11px] text-slate-500 print:text-gray-600">本底稿为核算过程数据，供复核与存档；完整底稿亦可导出 CSV（Excel 打开）。</p>
          <div className="mt-2 space-y-4">
            {report.detailsByMethod.map((m) => (
              <div key={m.method}>
                <p className="text-xs font-semibold text-slate-200 print:text-black">{METHOD_LABELS[m.method] || m.method}</p>
                <div className="mt-1 overflow-x-auto">
                  <table className="w-full text-left text-[11px]">
                    <thead>
                      <tr className="border-b border-cyber-600 text-slate-500 print:border-gray-400 print:text-gray-600">
                        <th className="py-1.5 pr-3">日期</th>
                        <th className="py-1.5 pr-3">币种</th>
                        <th className="py-1.5 pr-3">类型</th>
                        <th className="py-1.5 pr-3">数量</th>
                        <th className="py-1.5 pr-3">处置收入 USD</th>
                        <th className="py-1.5 pr-3">成本 USD</th>
                        <th className="py-1.5 pr-3">盈亏 USD</th>
                        <th className="py-1.5 pr-3">对手方</th>
                        <th className="py-1.5">审计关注</th>
                      </tr>
                    </thead>
                    <tbody>
                      {m.details.map((d, i) => (
                        <tr key={i} className="border-b border-cyber-800/40 print:border-gray-300">
                          <td className="py-1.5 pr-3 font-mono text-slate-300 print:text-black">{d.date}</td>
                          <td className="py-1.5 pr-3 text-slate-200 print:text-black">{d.symbol}</td>
                          <td className="py-1.5 pr-3 text-slate-400 print:text-gray-700">{d.type === 'spend' ? '支付' : '卖出'}</td>
                          <td className="py-1.5 pr-3 text-slate-300 print:text-black">{d.qty.toFixed(6)}</td>
                          <td className="py-1.5 pr-3 text-slate-300 print:text-black">{fmt(d.proceeds)}</td>
                          <td className="py-1.5 pr-3 text-slate-300 print:text-black">{fmt(d.cost)}</td>
                          <td className={`py-1.5 pr-3 ${pnlColor(d.pnl)}`}>{fmt(d.pnl)}</td>
                          <td className="py-1.5 pr-3 break-all font-mono text-slate-400 print:text-gray-700">{d.counterparty || '—'}</td>
                          <td className={`py-1.5 ${d.auditFlag ? 'font-semibold text-neon-red print:text-black' : 'text-slate-500 print:text-gray-500'}`}>{d.auditFlag ? '⚠️ 是' : ''}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>

          {/* 声明与签署栏 */}
          <div className="mt-6 rounded-lg border border-cyber-700 bg-cyber-950/50 p-4 text-xs leading-relaxed text-slate-400 print:border-gray-400 print:text-gray-700">
            <p className="font-semibold text-slate-300 print:text-black">声明</p>
            <p className="mt-1">{report.disclaimer}</p>
            <p className="mt-1">{disclaimer} 汇率与税率请以持牌税务师/会计师复核为准。</p>
          </div>
          <div className="mt-4 grid gap-3 text-xs text-slate-400 sm:grid-cols-3 print:text-gray-700">
            {report.certification.map((c, i) => (
              <p key={i}>{c}</p>
            ))}
          </div>
          <p className="mt-4 text-[10px] text-slate-500 print:text-gray-500">
            本报告由 ChainSentinel 自动生成 · {report.reportId} · 页面仅供复核与转交专业人士使用，不作为最终申报文件。
          </p>
        </motion.section>
      )}
    </main>
  );
}
