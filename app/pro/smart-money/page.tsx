'use client';

import { motion } from 'framer-motion';
import { Lock, TrendingUp, Wallet, ArrowUpRight, ArrowDownRight, Crown } from 'lucide-react';

const ROWS = [
  { addr: 'TXk…9f2', label: '聪明钱 · 做市商', pnl: '+412,500 USDT', win: '78%', up: true },
  { addr: 'TQr…a71', label: '机构托管', pnl: '+198,300 USDT', win: '71%', up: true },
  { addr: 'TMn…55c', label: '高频套利', pnl: '+96,120 USDT', win: '66%', up: true },
  { addr: 'TFb…e08', label: '巨鲸持仓', pnl: '-12,400 USDT', win: '52%', up: false },
  { addr: 'TZp…3d9', label: '聪明钱 · 早期建仓', pnl: '+58,900 USDT', win: '69%', up: true },
];

export default function SmartMoneyPage() {
  return (
    <main className="grid-bg mx-auto min-h-screen max-w-5xl px-6 py-14">
      <div className="flex items-center gap-3">
        <TrendingUp className="text-neon-yellow" size={26} />
        <h1 className="text-3xl font-bold">聪明钱追踪</h1>
        <span className="rounded-full border border-neon-yellow/40 bg-neon-yellow/10 px-3 py-0.5 text-xs text-neon-yellow">
          PRO
        </span>
      </div>
      <p className="mt-2 text-sm text-slate-400">追踪 TRON 网络高胜率地址的实时建仓动向与盈亏画像。</p>

      {/* 真实页面骨架 + 解锁层 */}
      <div className="relative mt-8 overflow-hidden rounded-2xl border border-cyber-700 bg-cyber-900/60">
        <div className="grid gap-4 p-6 sm:grid-cols-3">
          {[
            { k: '追踪地址数', v: '3,214' },
            { k: '24h 聪明钱净流入', v: '+2.8M USDT' },
            { k: '平均胜率', v: '67.4%' },
          ].map((s) => (
            <div key={s.k} className="rounded-xl border border-cyber-700 bg-cyber-950/60 p-4">
              <p className="text-xs text-slate-500">{s.k}</p>
              <p className="mt-1 text-xl font-bold text-slate-200">{s.v}</p>
            </div>
          ))}
        </div>
        <table className="w-full border-t border-cyber-700 text-sm">
          <thead>
            <tr className="text-left text-xs text-slate-500">
              <th className="px-6 py-3">地址</th>
              <th className="px-6 py-3">标签</th>
              <th className="px-6 py-3">30 日盈亏</th>
              <th className="px-6 py-3">胜率</th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map((r) => (
              <tr key={r.addr} className="border-t border-cyber-800 text-slate-300">
                <td className="px-6 py-3 font-mono text-xs">{r.addr}</td>
                <td className="px-6 py-3">
                  <span className="flex items-center gap-1.5">
                    <Wallet size={13} className="text-slate-500" />
                    {r.label}
                  </span>
                </td>
                <td className={`px-6 py-3 ${r.up ? 'text-neon-green' : 'text-neon-red'}`}>
                  <span className="flex items-center gap-1">
                    {r.up ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
                    {r.pnl}
                  </span>
                </td>
                <td className="px-6 py-3">{r.win}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Feature Gate 解锁层 */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute inset-0 flex flex-col items-center justify-center bg-cyber-950/70 p-6 text-center backdrop-blur-[6px]"
        >
          <Lock size={36} className="text-neon-yellow" />
          <h2 className="mt-4 text-xl font-bold">专业版功能 · 尚未解锁</h2>
          <p className="mt-2 max-w-md text-sm text-slate-400">
            以上为功能演示界面（示例数据）。升级专业版即可实时追踪聪明钱地址、接收建仓告警，
            并解锁地址簇关联分析与税务报表导出。
          </p>
          <p className="mt-4 text-3xl font-extrabold text-neon-cyan">
            ¥9,800<span className="text-sm font-normal text-slate-400">/年</span>
          </p>
          <a
            href="/#consult"
            className="mt-5 flex items-center gap-2 rounded-lg bg-neon-yellow/90 px-6 py-2.5 text-sm font-bold text-cyber-950 transition hover:bg-neon-yellow"
          >
            <Crown size={16} />
            升级专业版
          </a>
          <a
            href="/smart-money"
            className="mt-3 flex items-center gap-1.5 text-xs text-neon-cyan hover:underline"
          >
            🎁 已开放免费公开版：查看真实链上聪明钱动向（TRON / BTC / ETH）→
          </a>
        </motion.div>
      </div>

      <a href="/" className="mt-8 inline-block text-sm text-neon-cyan hover:underline">
        ← 返回首页
      </a>
    </main>
  );
}
