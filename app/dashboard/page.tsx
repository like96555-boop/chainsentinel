'use client';

import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  CreditCard,
  KeyRound,
  Copy,
  Check,
  Zap,
  ShieldCheck,
  BarChart3,
  RefreshCw,
  Loader2,
  CircleCheck,
} from 'lucide-react';

interface Plan {
  id: string;
  name: string;
  priceMonthlyUsd: number;
  originalPriceUsd?: number;
  promoting?: boolean;
  tokenCount: number;
  quotaPerDay: number;
}

const PLANS_FALLBACK: Plan[] = [
  { id: 'free', name: '免费版', priceMonthlyUsd: 0, tokenCount: 0, quotaPerDay: 100 },
  { id: 'pro', name: '专业版', priceMonthlyUsd: 29, tokenCount: 1, quotaPerDay: 1000 },
  { id: 'business', name: '商业版', priceMonthlyUsd: 199, tokenCount: 5, quotaPerDay: 10000 },
];

interface TokenUsage {
  token: string;
  name: string;
  plan: string;
  dailyQuota: number;
  usedToday: number;
  remainingToday: number;
  totalUsage: number;
  periodEndsAt: number | null;
  lastUsedAt: number;
  trend: Array<{ date: string; count: number }>;
}

export default function DashboardPage() {
  const [plans, setPlans] = useState<Plan[]>(PLANS_FALLBACK);
  const [selected, setSelected] = useState<string>('pro');
  const [email, setEmail] = useState('');
  const [method, setMethod] = useState<'stripe' | 'usdt'>('stripe');
  const [submitting, setSubmitting] = useState(false);
  const [subResult, setSubResult] = useState<{ tokens: Array<{ key: string; name: string }>; checkoutUrl?: string; mock?: boolean; orderId?: string } | null>(null);
  const [subError, setSubError] = useState('');
  const [copied, setCopied] = useState('');
  // USDT 非托管支付
  const [usdtOrder, setUsdtOrder] = useState<{ orderId: string; address: string; amountUsdt: number; contract?: string; network?: string; note?: string } | null>(null);
  const [usdtState, setUsdtState] = useState<'pending' | 'paid' | 'checking'>('pending');
  const [usdtMsg, setUsdtMsg] = useState('');

  // 我的令牌
  const [queryToken, setQueryToken] = useState('');
  const [usage, setUsage] = useState<TokenUsage | null>(null);
  const [usageLoading, setUsageLoading] = useState(false);
  const [usageError, setUsageError] = useState('');

  // ── 客户账号（登录/注册/我的订阅）──
  const [auth, setAuth] = useState<{ email: string } | null>(null);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authEmail, setAuthEmail] = useState('');
  const [authPw, setAuthPw] = useState('');
  const [authMsg, setAuthMsg] = useState('');
  const [myData, setMyData] = useState<{ orders: any[]; keys: any[] } | null>(null);
  const [myLoading, setMyLoading] = useState(false);

  const loadMe = useCallback(async () => {
    const r = await fetch('/api/auth/me');
    if (r.ok) {
      const j = await r.json();
      setAuth({ email: j.email });
      setEmail(j.email);
      refreshMy(j.email);
    }
  }, []);

  const refreshMy = async (em?: string) => {
    setMyLoading(true);
    try {
      const r = await fetch('/api/billing/my');
      if (r.ok) {
        const j = await r.json();
        setMyData({ orders: j.orders || [], keys: j.keys || [] });
        if (em) setEmail(em);
      }
    } finally {
      setMyLoading(false);
    }
  };

  const doAuth = async () => {
    setAuthMsg('');
    if (!authEmail || !authPw) { setAuthMsg('请填写邮箱和密码'); return; }
    const path = authMode === 'login' ? '/api/auth/login' : '/api/auth/register';
    try {
      const r = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: authEmail, password: authPw }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || (authMode === 'login' ? '登录失败' : '注册失败'));
      setAuth({ email: j.email });
      setEmail(j.email);
      setAuthPw('');
      setAuthMsg('');
      refreshMy(j.email);
      if (typeof window !== 'undefined') window.dispatchEvent(new Event('cs-auth-changed'));
      if (authMode === 'register') setAuthMode('login');
    } catch (e) {
      setAuthMsg(e instanceof Error ? e.message : '操作失败');
    }
  };

  const doLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setAuth(null);
    setMyData(null);
    setEmail('');
    if (typeof window !== 'undefined') window.dispatchEvent(new Event('cs-auth-changed'));
  };

  useEffect(() => { loadMe(); }, [loadMe]);

  useEffect(() => {
    fetch('/api/billing/plans')
      .then((r) => r.json())
      .then((j) => j.plans && setPlans(j.plans))
      .catch(() => {});
  }, []);

  const subscribe = async () => {
    setSubmitting(true);
    setSubError('');
    setSubResult(null);
    setUsdtOrder(null);
    try {
      // 订阅归属：必须登录（付费权益要落进账号）；邮箱以账号为准
      if (!auth) {
        setSubError('请先登录后再订阅，权益将绑定到你的账号');
        setSubmitting(false);
        return;
      }
      const r = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: selected, email: auth.email, paymentMethod: method }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || '创建订阅失败');
      // USDT 非托管：展示收款地址 + 金额，等待链上到账
      if (j.method === 'usdt' && j.payTo) {
        setUsdtOrder({ orderId: j.orderId, address: j.payTo.address, amountUsdt: j.payTo.amountUsdt, contract: j.payTo.contract, network: j.payTo.network, note: j.payTo.note });
        return;
      }
      if (j.checkoutUrl && !j.mock) {
        window.location.href = j.checkoutUrl; // 真实 Stripe Checkout 跳转
        return;
      }
      // mock 模式：直接走模拟支付回调完成激活
      const done = await fetch(`/api/billing/mock-checkout?order=${encodeURIComponent(j.orderId)}`).then((x) => x.json());
      if (!done.ok) throw new Error(done.error || '模拟支付失败');
      setSubResult(done);
    } catch (e) {
      setSubError(e instanceof Error ? e.message : '订阅失败');
    } finally {
      setSubmitting(false);
    }
  };

  /** USDT 到账轮询（手动 + 自动 12s） */
  const checkUsdt = async () => {
    if (!usdtOrder) return;
    setUsdtState('checking');
    setUsdtMsg('');
    try {
      const r = await fetch(`/api/billing/usdt/status?order=${encodeURIComponent(usdtOrder.orderId)}`);
      const j = await r.json();
      if (j.status === 'paid') {
        setUsdtState('paid');
        setSubResult({ tokens: j.tokens || [], orderId: j.orderId });
        return;
      }
      setUsdtState('pending');
      setUsdtMsg(j.error || '等待到账…');
    } catch {
      setUsdtState('pending');
      setUsdtMsg('查询失败，请稍后重试');
    }
  };

  useEffect(() => {
    if (!usdtOrder) return;
    const timer = setInterval(() => {
      if (usdtState !== 'paid') checkUsdt();
    }, 12000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usdtOrder, usdtState]);

  const queryUsage = async () => {
    setUsageLoading(true);
    setUsageError('');
    setUsage(null);
    try {
      const r = await fetch(`/api/billing/usage?token=${encodeURIComponent(queryToken)}`);
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || '查询失败');
      setUsage(j);
    } catch (e) {
      setUsageError(e instanceof Error ? e.message : '查询失败');
    } finally {
      setUsageLoading(false);
    }
  };

  const copy = (v: string) => {
    navigator.clipboard?.writeText(v).catch(() => {});
    setCopied(v.slice(0, 12));
    setTimeout(() => setCopied(''), 1600);
  };

  const maxTrend = Math.max(1, ...(usage?.trend.map((t) => t.count) || [1]));

  return (
    <main className="mx-auto min-h-screen w-full max-w-5xl px-5 pb-24 pt-12">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <div className="mb-2 flex items-center gap-2 text-neon-cyan">
          <BarChart3 size={18} />
          <span className="text-xs tracking-widest">CHAIN SENTINEL API</span>
        </div>
        <h1 className="text-2xl font-bold text-slate-100">订阅中心 · API 计量扣费</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-400">
          每 API 请求计 1 次，按日配额自动扣减；超额请求返回 402 并提示升级。支付由 Stripe 安全处理，支持月付、随时取消。
        </p>
      </motion.div>

      {/* 登录横幅（未登录第一屏可见） */}
      {!auth && (
        <div className="mt-8 flex flex-col items-start justify-between gap-3 rounded-2xl border border-[#7170ff]/50 bg-gradient-to-r from-[#7170ff]/15 to-[#9d8cff]/10 p-5 sm:flex-row sm:items-center">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-100">
              <ShieldCheck size={16} className="text-[#9d8cff]" /> 登录 / 注册你的账号
            </div>
            <p className="mt-1 text-xs text-slate-400">登录后订阅，付款权益（API 令牌、用量、到期时间）全部绑定到你的账号；还可添加自己的监控钱包。</p>
          </div>
          <a
            href="#subscribe"
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-gradient-to-r from-[#7170ff] to-[#9d8cff] px-6 text-sm font-semibold text-white transition hover:brightness-110"
          >
            去登录 →
          </a>
        </div>
      )}

      {/* 套餐卡片 */}
      <section className="mt-10">
        <h2 className="mb-4 text-sm font-semibold text-slate-300">选择套餐</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {plans.map((p) => {
            const active = selected === p.id;
            return (
              <button
                key={p.id}
                onClick={() => p.id !== 'free' && setSelected(p.id)}
                className={`rounded-2xl border p-5 text-left transition ${
                  active ? 'border-[#7170ff]/70 bg-[#7170ff]/10' : 'border-cyber-700 bg-cyber-900/60 hover:border-cyber-600'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-200">{p.name}</span>
                  {active && <CircleCheck size={16} className="text-[#7170ff]" />}
                </div>
                <div className="mt-3 flex items-baseline gap-2">
                  {p.promoting && p.originalPriceUsd !== undefined && (
                    <span className="text-sm text-slate-500 line-through">${p.originalPriceUsd}</span>
                  )}
                  <span className="text-2xl font-bold text-slate-100">
                    {p.priceMonthlyUsd === 0 ? '免费' : `$${p.priceMonthlyUsd}`}
                  </span>
                  <span className="text-xs text-slate-500">{p.priceMonthlyUsd === 0 ? '' : ' / 月'}</span>
                  {p.promoting && (
                    <span className="rounded-full bg-[#7170ff]/20 px-2 py-0.5 text-[10px] font-semibold text-[#9d8cff]">限时促销</span>
                  )}
                </div>
                <ul className="mt-4 space-y-2 text-xs text-slate-400">
                  <li className="flex items-center gap-2">
                    <Zap size={12} className="text-neon-cyan" />
                    {p.quotaPerDay.toLocaleString()} 次/日
                  </li>
                  <li className="flex items-center gap-2">
                    <KeyRound size={12} className="text-neon-cyan" />
                    {p.tokenCount === 0 ? 'IP 限流（无需令牌）' : `${p.tokenCount} 个 API 令牌`}
                  </li>
                </ul>
              </button>
            );
          })}
        </div>

        {/* 订阅操作 */}
        <div id="subscribe" className="mt-6 rounded-2xl border border-cyber-700 bg-cyber-900/60 p-5">
          <div className="mb-4">
            <label className="mb-2 block text-xs text-slate-400">支付方式</label>
            <div className="flex gap-2">
              <button
                onClick={() => setMethod('stripe')}
                className={`flex-1 rounded-xl border px-4 py-2.5 text-sm transition sm:flex-none ${method === 'stripe' ? 'border-[#7170ff]/70 bg-[#7170ff]/10 text-slate-100' : 'border-cyber-700 text-slate-400 hover:border-cyber-600'}`}
              >
                💳 银行卡 / Apple Pay / FPS（Stripe）
              </button>
              <button
                onClick={() => setMethod('usdt')}
                className={`flex-1 rounded-xl border px-4 py-2.5 text-sm transition sm:flex-none ${method === 'usdt' ? 'border-[#7170ff]/70 bg-[#7170ff]/10 text-slate-100' : 'border-cyber-700 text-slate-400 hover:border-cyber-600'}`}
              >
                🟢 USDT（TRC-20 非托管）
              </button>
            </div>
            {method === 'usdt' && (
              <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
                直接向运营方 TRON 钱包打款 USDT（TRC-20），链上到账后自动激活。非托管：资金直达运营方钱包，平台不托管、零手续费。
              </p>
            )}
          </div>
          {!auth ? (
            <div className="rounded-2xl border border-[#7170ff]/40 bg-[#7170ff]/5 p-5">
              <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-100">
                <ShieldCheck size={16} className="text-[#9d8cff]" /> 登录后订阅，权益绑定到你的账号
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <div className="flex-1">
                  <label className="mb-1.5 block text-xs text-slate-400">邮箱</label>
                  <input
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                    placeholder="you@company.com"
                    className="w-full rounded-xl border border-cyber-700 bg-cyber-950/60 px-4 py-2.5 text-sm text-slate-200 outline-none transition placeholder:text-slate-600 focus:border-[#7170ff]/60"
                  />
                </div>
                <div className="flex-1">
                  <label className="mb-1.5 block text-xs text-slate-400">密码</label>
                  <input
                    type="password"
                    value={authPw}
                    onChange={(e) => setAuthPw(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && doAuth()}
                    placeholder={authMode === 'login' ? '输入密码' : '至少 8 位'}
                    className="w-full rounded-xl border border-cyber-700 bg-cyber-950/60 px-4 py-2.5 text-sm text-slate-200 outline-none transition placeholder:text-slate-600 focus:border-[#7170ff]/60"
                  />
                </div>
                <button
                  onClick={doAuth}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#7170ff] to-[#9d8cff] px-6 text-sm font-semibold text-white transition hover:brightness-110"
                >
                  {authMode === 'login' ? '登 录' : '注 册'}
                </button>
              </div>
              <div className="mt-3 flex items-center gap-4 text-xs">
                <button
                  onClick={() => { setAuthMode(authMode === 'login' ? 'register' : 'login'); setAuthMsg(''); }}
                  className="text-[#9d8cff] transition hover:brightness-125"
                >
                  {authMode === 'login' ? '没有账号？立即注册' : '已有账号？去登录'}
                </button>
                {authMsg && <span className={authMsg.includes('成功') ? 'text-emerald-400' : 'text-red-400'}>{authMsg}</span>}
              </div>
              <p className="mt-3 text-[11px] text-slate-500">
                注册即登录：付款后登录同一账号即可查看「我的订阅」与 API 令牌。钱包登录即将支持。
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="flex-1">
                <div className="mb-1.5 flex items-center gap-2 text-xs text-slate-400">
                  订阅归属账号 <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-emerald-300"><CircleCheck size={11} /> {auth.email}</span>
                </div>
                <div className="rounded-xl border border-cyber-700 bg-cyber-950/60 px-4 py-2.5 text-sm text-slate-300">
                  {selected === 'free' ? '免费版无需订阅，直接使用即可' : `即将订阅：${plans.find((p) => p.id === selected)?.name || selected}（权益计入 ${auth.email}）`}
                </div>
              </div>
              <button
                onClick={subscribe}
                disabled={submitting || selected === 'free'}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#7170ff] to-[#9d8cff] px-6 text-sm font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {submitting ? <Loader2 size={16} className="animate-spin" /> : <CreditCard size={16} />}
                {submitting ? '创建中…' : '立即订阅'}
              </button>
              <button onClick={doLogout} className="text-xs text-slate-500 transition hover:text-slate-300">退出登录</button>
            </div>
          )}
        </div>
        {subError && <p className="mt-3 text-sm text-red-400">{subError}</p>}

        {/* USDT 非托管支付：收款信息 + 到账轮询 */}
        {usdtOrder && usdtState !== 'paid' && (
          <div className="mt-6 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-5">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-emerald-300">
              <Check size={16} /> 请向以下地址转入 USDT（{usdtOrder.orderId}）
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <div className="mb-1 text-xs text-slate-400">收款地址（TRON / TRC-20）</div>
                <div className="flex items-center gap-2 rounded-xl border border-cyber-700 bg-cyber-950/60 px-3 py-2.5">
                  <code className="flex-1 truncate font-mono text-xs text-emerald-300">{usdtOrder.address}</code>
                  <button onClick={() => copy(usdtOrder.address)} className="rounded-md p-1.5 text-slate-400 transition hover:bg-cyber-700 hover:text-emerald-300">
                    {copied === usdtOrder.address.slice(0, 12) ? <Check size={14} /> : <Copy size={14} />}
                  </button>
                </div>
                <p className="mt-1.5 text-[11px] text-slate-500">{usdtOrder.contract}</p>
              </div>
              <div>
                <div className="mb-1 text-xs text-slate-400">应到金额</div>
                <div className="rounded-xl border border-cyber-700 bg-cyber-950/60 px-3 py-2.5 text-lg font-bold text-slate-100">
                  {usdtOrder.amountUsdt} <span className="text-xs font-normal text-slate-400">USDT（TRC-20）</span>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <button onClick={checkUsdt} disabled={usdtState === 'checking'} className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-emerald-500/40 px-4 text-xs font-semibold text-emerald-300 transition hover:bg-emerald-500/10 disabled:opacity-50">
                    {usdtState === 'checking' ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
                    {usdtState === 'checking' ? '查询中…' : '我已打款，查询到账'}
                  </button>
                  <span className="text-[11px] text-slate-500">每 12 秒自动检测</span>
                </div>
                {usdtMsg && <p className="mt-2 text-[11px] text-slate-400">{usdtMsg}</p>}
              </div>
            </div>
            <p className="mt-3 text-[11px] leading-relaxed text-slate-500">{usdtOrder.note}</p>
          </div>
        )}

        {/* 订阅成功 → 令牌一次性展示 */}
        {subResult && (
          <div className="mt-6 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-5">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-emerald-300">
              <Check size={16} /> 订阅激活成功（{subResult.orderId}）
            </div>
            <p className="mb-3 text-xs text-slate-400">
              以下为你的 API 令牌，<span className="text-amber-300">请立即复制保存</span>——出于安全考虑，令牌明文仅在此展示一次。
            </p>
            <div className="space-y-2">
              {subResult.tokens.map((t) => (
                <div key={t.key} className="flex items-center gap-2 rounded-xl border border-cyber-700 bg-cyber-950/60 px-4 py-3">
                  <code className="flex-1 truncate font-mono text-xs text-neon-cyan">{t.key}</code>
                  <button onClick={() => copy(t.key)} className="rounded-md p-1.5 text-slate-400 transition hover:bg-cyber-700 hover:text-neon-cyan">
                    {copied === t.key.slice(0, 12) ? <Check size={14} /> : <Copy size={14} />}
                  </button>
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs text-slate-500">
              调用方式：<code className="rounded bg-cyber-800 px-1.5 py-0.5 font-mono text-[11px] text-slate-300">Authorization: Bearer {subResult.tokens[0]?.key?.slice(0, 16)}…</code>
            </p>
          </div>
        )}
      </section>

      {/* 我的令牌用量 */}
      <section className="mt-12">
        <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-300">
          <KeyRound size={15} className="text-neon-cyan" /> 我的令牌用量
        </h2>
        <div className="flex flex-col gap-3 rounded-2xl border border-cyber-700 bg-cyber-900/60 p-5 sm:flex-row">
          <input
            value={queryToken}
            onChange={(e) => setQueryToken(e.target.value)}
            placeholder="粘贴令牌 cs_live_… 查询剩余额度"
            className="flex-1 rounded-xl border border-cyber-700 bg-cyber-950/60 px-4 py-2.5 font-mono text-xs text-slate-200 outline-none transition placeholder:font-sans placeholder:text-slate-600 focus:border-[#7170ff]/60"
          />
          <button
            onClick={queryUsage}
            disabled={usageLoading || !queryToken}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-cyber-600 px-5 text-xs font-semibold text-slate-200 transition hover:border-[#7170ff]/60 hover:text-white disabled:opacity-40"
          >
            {usageLoading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
            查询
          </button>
        </div>
        {usageError && <p className="mt-3 text-sm text-red-400">{usageError}</p>}

        {usage && (
          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-cyber-700 bg-cyber-900/60 p-5">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>{usage.name} · {usage.plan === 'custom' ? '自定义' : usage.plan}</span>
                <span className="font-mono">{usage.token}</span>
              </div>
              <div className="mt-4 flex items-end justify-between">
                <div>
                  <span className="text-2xl font-bold text-slate-100">{usage.usedToday.toLocaleString()}</span>
                  <span className="text-sm text-slate-500"> / {usage.dailyQuota.toLocaleString()} 次（今日）</span>
                </div>
                <div className="text-right text-xs text-slate-500">
                  <div>累计 {usage.totalUsage.toLocaleString()} 次</div>
                  <div className="mt-0.5 text-emerald-400">剩余 {usage.remainingToday.toLocaleString()} 次</div>
                </div>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-cyber-800">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(100, (usage.usedToday / Math.max(1, usage.dailyQuota)) * 100)}%` }}
                  transition={{ duration: 0.6 }}
                  className={`h-full rounded-full ${usage.remainingToday === 0 ? 'bg-red-500' : 'bg-gradient-to-r from-[#7170ff] to-[#9d8cff]'}`}
                />
              </div>
              {usage.periodEndsAt && (
                <p className="mt-3 text-xs text-slate-500">
                  本期至 {new Date(usage.periodEndsAt).toLocaleDateString('zh-CN', { timeZone: 'Asia/Shanghai' })}
                </p>
              )}
            </div>

            <div className="rounded-2xl border border-cyber-700 bg-cyber-900/60 p-5">
              <div className="mb-4 text-xs text-slate-400">近 7 日用量</div>
              <div className="flex h-28 items-end gap-2">
                {usage.trend.map((t) => (
                  <div key={t.date} className="flex flex-1 flex-col items-center gap-1">
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${Math.max(6, (t.count / maxTrend) * 100)}%` }}
                      transition={{ duration: 0.5 }}
                      className="w-full rounded-t-md bg-gradient-to-t from-[#7170ff]/40 to-[#7170ff]"
                    />
                    <span className="text-[9px] text-slate-600">{t.date.slice(5)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </section>

      {/* 计量说明 */}
      <section className="mt-12 rounded-2xl border border-cyber-800 bg-cyber-950/40 p-5">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-300">
          <ShieldCheck size={15} className="text-neon-cyan" /> 计量与扣费说明
        </h3>
        <ul className="space-y-2 text-xs leading-relaxed text-slate-500">
          <li>· 计量口径：每次携带有效令牌的 API 请求计 1 次；配额按自然日（Asia/Shanghai）00:00 重置。</li>
          <li>· 超额行为：配额用尽后返回 HTTP 402，不产生任何扣费；升级套餐或次日自动恢复。</li>
          <li>· 扣费方式：订阅按月计费（Stripe），首期支付成功即激活令牌；取消订阅后令牌停用、历史用量保留可查。</li>
          <li>· 令牌安全：令牌明文仅在支付成功时展示一次；服务端以 AES-256-GCM 加密保管，后台仅见掩码。</li>
          <li>· 免费层：无需令牌，按 IP 每分钟 10 次限流，适合体验与集成测试。</li>
        </ul>
      </section>
    </main>
  );
}
