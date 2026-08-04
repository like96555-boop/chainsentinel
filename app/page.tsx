'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Radar,
  ShieldCheck,
  FileBarChart,
  Lock,
  Check,
  Landmark,
  Loader2,
} from 'lucide-react';
import AddressChecker from '@/components/AddressChecker';
import Counter from '@/components/Counter';

const fadeUp = {
  initial: { opacity: 0, y: 32 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-60px' },
  transition: { duration: 0.55 },
} as const;

function LeadForm() {
  const [form, setForm] = useState({ name: '', contact: '', company: '', interest: 'rwa', message: '' });
  const [state, setState] = useState<'idle' | 'busy' | 'ok' | 'err'>('idle');
  const [msg, setMsg] = useState('');

  async function submit() {
    if (state === 'busy') return;
    setState('busy');
    setMsg('');
    try {
      const res = await fetch('/api/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!res.ok) {
        setState('err');
        setMsg(json?.error || '提交失败，请稍后再试');
      } else {
        setState('ok');
        setMsg(json?.message || '预约成功');
      }
    } catch {
      setState('err');
      setMsg('网络异常，请稍后再试');
    }
  }

  const inputCls =
    'w-full rounded-lg border border-cyber-700 bg-cyber-950 px-3 py-2.5 text-sm outline-none placeholder:text-slate-500 focus:border-neon-cyan/60';

  return (
    <div className="grid gap-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <input className={inputCls} placeholder="姓名 / 称呼 *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <input className={inputCls} placeholder="联系方式（微信 / Telegram / 邮箱）*" value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} />
      </div>
      <input className={inputCls} placeholder="公司 / 机构名称" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
      <select className={inputCls} value={form.interest} onChange={(e) => setForm({ ...form, interest: e.target.value })}>
        <option value="rwa">RWA 资产代币化合规咨询</option>
        <option value="stablecoin">稳定币收付合规方案</option>
        <option value="api">风控 API 接入</option>
        <option value="license">商业授权 / 私有化部署</option>
        <option value="other">其他</option>
      </select>
      <textarea className={`${inputCls} min-h-[84px]`} placeholder="补充说明（可选）" value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />
      <button
        onClick={submit}
        disabled={state === 'busy'}
        className="flex items-center justify-center gap-2 rounded-lg bg-neon-cyan/90 px-4 py-2.5 text-sm font-semibold text-cyber-950 transition hover:bg-neon-cyan disabled:opacity-50"
      >
        {state === 'busy' && <Loader2 size={15} className="animate-spin" />}
        预约合规顾问
      </button>
      {msg && <p className={`text-sm ${state === 'ok' ? 'text-neon-green' : 'text-neon-red'}`}>{msg}</p>}
    </div>
  );
}

const FEATURES = [
  {
    icon: Radar,
    title: '地址监控',
    desc: '7×24 监控对手方地址与关联簇，风险标签变更即时推送，资金链路全程可视。',
  },
  {
    icon: ShieldCheck,
    title: '收款前拦截',
    desc: 'Payment Firewall 在收银台前置拦截脏 U，API 3 秒返回红绿灯结论，避免账户被冻结。',
  },
  {
    icon: FileBarChart,
    title: '税务报表',
    desc: '按司法辖区生成链上收支台账与合规报表，一键导出，审计留痕可追溯。',
  },
];

const PLANS = [
  {
    name: '社区版',
    price: '免费',
    unit: '',
    cta: '立即使用',
    highlight: false,
    items: ['每日 100 次地址查询', '基础黑名单匹配', '网页端红绿灯报告'],
  },
  {
    name: '专业版',
    price: '¥9,800',
    unit: '/年',
    cta: '升级专业版',
    highlight: true,
    items: [
      '无限次查询 + REST API',
      'Webhook 实时告警',
      '聪明钱追踪 🔒',
      '地址簇关联分析 🔒',
      '税务合规报表导出 🔒',
    ],
  },
  {
    name: '商业授权',
    price: '¥50,000',
    unit: ' 起',
    cta: '联系销售',
    highlight: false,
    items: ['私有化部署', '源码授权', '定制风险标签库', '专属合规顾问'],
  },
];

export default function LandingPage() {
  return (
    <main className="grid-bg">
      {/* Hero */}
      <section className="relative mx-auto flex min-h-[88vh] max-w-5xl flex-col items-center justify-center px-6 pt-16 text-center">
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mb-4 rounded-full border border-neon-cyan/30 bg-neon-cyan/10 px-4 py-1 text-xs text-neon-cyan"
        >
          TRON 网络 · USDT 收款风控 SaaS
        </motion.p>
        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="bg-gradient-to-r from-slate-100 via-neon-cyan to-neon-green bg-clip-text text-5xl font-extrabold leading-tight text-transparent sm:text-6xl"
        >
          3 秒识别黑钱地址
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="mt-5 max-w-xl text-base text-slate-400 sm:text-lg"
        >
          收款前一键检测对手方地址。命中黑产标签、混币资金、诈骗归集——
          <span className="text-slate-200">红灯即停</span>，守住您的账户安全。
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mt-8 flex w-full justify-center"
        >
          <AddressChecker />
        </motion.div>
        <p className="mt-3 text-xs text-slate-500">免注册 · 每 IP 每分钟 10 次 · 结果仅供参考不构成法律意见</p>
      </section>

      {/* 信任区 */}
      <motion.section {...fadeUp} className="mx-auto max-w-5xl px-6 py-14">
        <div className="grid gap-6 rounded-2xl border border-cyber-700 bg-cyber-900/60 p-8 text-center sm:grid-cols-3">
          {[
            { label: '已监控地址', value: 1280000, suffix: '+' },
            { label: '已拦截风险交易', value: 46300, suffix: '+' },
            { label: '风险标签库规模', value: 3200000, suffix: '+' },
          ].map((s) => (
            <div key={s.label}>
              <p className="text-3xl font-extrabold text-neon-cyan sm:text-4xl">
                <Counter target={s.value} suffix={s.suffix} />
              </p>
              <p className="mt-2 text-sm text-slate-400">{s.label}</p>
            </div>
          ))}
        </div>
      </motion.section>

      {/* 功能区 */}
      <section className="mx-auto max-w-5xl px-6 py-14">
        <motion.h2 {...fadeUp} className="text-center text-3xl font-bold">
          三位一体，守住每一笔收款
        </motion.h2>
        <div className="mt-10 grid gap-6 sm:grid-cols-3">
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.title}
              {...fadeUp}
              transition={{ duration: 0.55, delay: i * 0.12 }}
              className="rounded-2xl border border-cyber-700 bg-cyber-900/60 p-6 transition hover:border-neon-cyan/50"
            >
              <f.icon size={30} className="text-neon-green" />
              <h3 className="mt-4 text-lg font-bold">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* 定价区 */}
      <section className="mx-auto max-w-5xl px-6 py-14">
        <motion.h2 {...fadeUp} className="text-center text-3xl font-bold">
          透明定价
        </motion.h2>
        <div className="mt-10 grid gap-6 sm:grid-cols-3">
          {PLANS.map((p, i) => (
            <motion.div
              key={p.name}
              {...fadeUp}
              transition={{ duration: 0.55, delay: i * 0.12 }}
              className={`flex flex-col rounded-2xl border p-6 ${
                p.highlight
                  ? 'border-neon-cyan/60 bg-cyber-800/70 shadow-[0_0_50px_-12px_rgba(56,224,255,0.4)]'
                  : 'border-cyber-700 bg-cyber-900/60'
              }`}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold">{p.name}</h3>
                {p.highlight && <Lock size={15} className="text-neon-yellow" />}
              </div>
              <p className="mt-4 text-3xl font-extrabold text-neon-cyan">
                {p.price}
                <span className="text-sm font-normal text-slate-400">{p.unit}</span>
              </p>
              <ul className="mt-5 flex-1 space-y-2.5">
                {p.items.map((it) => (
                  <li key={it} className="flex items-start gap-2 text-sm text-slate-300">
                    <Check size={15} className="mt-0.5 shrink-0 text-neon-green" />
                    {it}
                  </li>
                ))}
              </ul>
              <a
                href={p.name === '商业授权' ? '#consult' : '#'}
                className={`mt-6 rounded-lg px-4 py-2.5 text-center text-sm font-semibold transition ${
                  p.highlight
                    ? 'bg-neon-cyan/90 text-cyber-950 hover:bg-neon-cyan'
                    : 'border border-cyber-700 text-slate-200 hover:border-neon-cyan/60'
                }`}
              >
                {p.cta}
              </a>
            </motion.div>
          ))}
        </div>
        <p className="mt-4 text-center text-xs text-slate-500">带 🔒 功能为专业版及以上专属</p>
      </section>

      {/* RWA / 稳定币合规咨询 */}
      <motion.section id="consult" {...fadeUp} className="mx-auto max-w-5xl px-6 py-14">
        <div className="grid gap-8 rounded-2xl border border-cyber-700 bg-cyber-900/60 p-8 md:grid-cols-2">
          <div>
            <Landmark size={30} className="text-neon-yellow" />
            <h2 className="mt-4 text-2xl font-bold">RWA / 稳定币合规咨询</h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-400">
              依托香港持牌顾问网络，为 RWA 资产代币化、稳定币收付、跨境结算提供
              合规架构设计、链上风控体系搭建与审计支持。预约后 1 个工作日内响应。
            </p>
            <ul className="mt-4 space-y-2 text-sm text-slate-300">
              <li>· 香港 / 新加坡 / 迪拜合规路径评估</li>
              <li>· 商户收 U 反洗钱（AML）体系搭建</li>
              <li>· 链上资金溯源与冻结应对支持</li>
            </ul>
          </div>
          <LeadForm />
        </div>
      </motion.section>

      {/* 页脚 */}
      <footer className="border-t border-cyber-800 py-8 text-center text-xs text-slate-500">
        <p>© 2026 ChainSentinel Limited (Hong Kong). All rights reserved.</p>
        <p className="mt-1">风控结果仅为风险提示，不构成法律意见或投资建议。</p>
      </footer>
    </main>
  );
}
