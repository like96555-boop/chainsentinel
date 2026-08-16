'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Radar,
  ShieldCheck,
  ShieldAlert,
  TrendingUp,
  FileBarChart,
  Lock,
  Check,
  Landmark,
} from 'lucide-react';
import AddressChecker from '@/components/AddressChecker';
import Counter from '@/components/Counter';
import MarketTicker from '@/components/MarketTicker';
import { BannerCarousel } from '@/components/BannerCarousel';

const fadeUp = {
  initial: { opacity: 0, y: 32 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-60px' },
  transition: { duration: 0.55 },
} as const;

const TELEGRAM = 'https://t.me/+85293877936';

const FEATURES = [
  {
    icon: Radar,
    title: 'Address Monitoring',
    desc: 'Monitor counterparty addresses and associated clusters 24/7. Instant push on risk-label changes with full fund-flow visibility.',
  },
  {
    icon: ShieldCheck,
    title: 'Payment Firewall',
    desc: 'Screen dirty USDT before it hits your checkout. The API returns a red/yellow/green verdict in 3 seconds to keep your accounts safe.',
  },
  {
    icon: FileBarChart,
    title: 'Tax Reports',
    desc: 'Generate on-chain income/expense ledgers and compliance reports by jurisdiction. One-click export with audit trails.',
  },
];

interface PricingItem {
  id: string;
  name: string;
  price: string;
  unit: string;
  highlight: boolean;
  cta: string;
  items: string[];
  original?: string;
  promoting?: boolean;
}

const PRICING_FALLBACK: PricingItem[] = [
  { id: 'free', name: 'Community', price: '$0', unit: '', highlight: false, cta: 'Get started', items: ['100 address checks/day', 'Basic blacklist matching', 'Web red-light reports'] },
  { id: 'pro', name: 'Pro', price: '$29', unit: '/mo', highlight: true, cta: 'Upgrade to Pro', items: ['1 API token · 1,000 checks/day', 'Webhook real-time alerts', 'Smart Money tracking 🔒', 'Tax Center Pro 🔒', '🟢 USDT crypto payment · instant activation'] },
  { id: 'business', name: 'Business', price: '$199', unit: '/mo', highlight: false, cta: 'Contact sales', items: ['5 API tokens · 10,000 checks/day', 'All Pro features', 'Priority support', 'Custom risk label database'] },
];

export default function EnLandingPage() {
  const [pricing, setPricing] = useState(PRICING_FALLBACK);
  const [liveStats, setLiveStats] = useState<{ watchedAddresses: number; blockedTransactions: number; riskLabels: number } | null>(null);

  // Live statistics (real data): watched addresses / blocked transactions / risk label database
  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        const r = await fetch('/api/stats');
        if (!r.ok) return;
        const j = await r.json();
        if (alive && j?.ok) setLiveStats(j);
      } catch {
        /* keep placeholder on failure, never show fake data */
      }
    }
    load();
    const t = setInterval(load, 60_000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);

  // Pricing from admin-managed /api/billing/plans
  useEffect(() => {
    fetch('/api/billing/plans')
      .then((r) => r.json())
      .then((j) => {
        if (!Array.isArray(j?.plans)) return;
        const map: Record<string, { name: string; price?: string; unit?: string; cta: string; highlight: boolean; items: string[]; original?: string; promoting?: boolean }> = {
          free: { name: 'Community', cta: 'Get started', highlight: false, items: ['100 address checks/day', 'Basic blacklist matching', 'Web red-light reports'] },
          pro: { name: 'Pro', cta: 'Upgrade to Pro', highlight: true, items: ['1 API token · 1,000 checks/day', 'Webhook real-time alerts', 'Smart Money tracking 🔒', 'Tax Center Pro 🔒', '🟢 USDT crypto payment · instant activation'] },
          business: { name: 'Business', cta: 'Contact sales', highlight: false, items: ['5 API tokens · 10,000 checks/day', 'All Pro features', 'Priority support', 'Custom risk label database'] },
        };
        const next = j.plans.map((p: any) => {
          const base = map[p.id] || { name: p.name, cta: 'Subscribe', highlight: false, items: [] };
          return {
            id: p.id,
            ...base,
            price: p.priceMonthlyUsd === 0 ? '$0' : `$${p.priceMonthlyUsd}`,
            unit: p.priceMonthlyUsd === 0 ? '' : '/mo',
            original: p.promoting ? `$${p.originalPriceUsd}` : undefined,
            promoting: p.promoting,
          };
        });
        setPricing(next);
      })
      .catch(() => {});
  }, []);

  return (
    <main className="grid-bg">
      {/* Hero */}
      <section className="relative mx-auto flex min-h-[88vh] max-w-5xl flex-col items-center justify-center px-6 pt-16 text-center">
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mb-4 rounded-full border border-neon-cyan/30 bg-neon-cyan/10 px-4 py-1 text-xs text-neon-cyan"
        >
          TRON · BTC · ETH — Multi-chain payment risk screening SaaS
        </motion.p>
        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="bg-gradient-to-r from-slate-100 via-neon-cyan to-neon-green bg-clip-text text-5xl font-extrabold leading-tight text-transparent sm:text-6xl"
        >
          Detect dirty-money addresses in 3 seconds
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="mt-5 max-w-xl text-base text-slate-400 sm:text-lg"
        >
          Screen counterparty addresses before you receive payments. Blacklisted funds, mixers and scam wallets —
          <span className="text-slate-200"> red light means stop</span>.
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mt-8 flex w-full justify-center"
        >
          <AddressChecker lang="en" />
        </motion.div>
        <p className="mt-3 text-xs text-slate-500">No sign-up · 10 checks/min per IP · Results are risk signals, not legal advice</p>
      </section>

      {/* Market ticker */}
      <MarketTicker />

      {/* Live statistics */}
      <motion.section {...fadeUp} className="mx-auto max-w-5xl px-6 py-14">
        <div className="grid gap-6 rounded-2xl border border-cyber-700 bg-cyber-900/60 p-8 text-center sm:grid-cols-3">
          {[
            { label: 'Watched Addresses', value: liveStats?.watchedAddresses ?? 0 },
            { label: 'Risk Transactions Blocked', value: liveStats?.blockedTransactions ?? 0 },
            { label: 'Risk Label Database', value: liveStats?.riskLabels ?? 0 },
          ].map((s) => (
            <div key={s.label}>
              <p className="text-3xl font-extrabold text-neon-cyan sm:text-4xl">
                {liveStats ? <Counter target={s.value} /> : <span className="text-slate-600">—</span>}
              </p>
              <p className="mt-2 text-sm text-slate-400">{s.label}</p>
            </div>
          ))}
        </div>
        <p className="mt-3 text-center text-xs text-slate-500">
          Live statistics · Data from ChainSentinel monitoring records &amp; risk label database (OFAC SDN + public incidents)
        </p>
      </motion.section>

      {/* Features */}
      <section className="mx-auto max-w-5xl px-6 py-14">
        <motion.h2 {...fadeUp} className="text-center text-3xl font-bold">
          Three lines of defense for every payment you receive
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

        {/* Public data entries */}
        <div className="mt-6 grid gap-6 sm:grid-cols-2">
          <motion.a
            {...fadeUp}
            href="/alerts"
            className="group flex items-center gap-4 rounded-2xl border border-cyber-700 bg-cyber-900/60 p-6 transition hover:border-neon-red/50"
          >
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-neon-red/10">
              <ShieldAlert size={24} className="text-neon-red" />
            </span>
            <div className="flex-1">
              <h3 className="text-lg font-bold">On-chain Risk Alerts</h3>
              <p className="mt-1 text-sm text-slate-400">Free public threat intel: phishing wallets · laundering channels · mixer entries · scam funds</p>
            </div>
            <span className="text-neon-cyan transition group-hover:translate-x-1">→</span>
          </motion.a>
          <motion.a
            {...fadeUp}
            href="/smart-money"
            className="group flex items-center gap-4 rounded-2xl border border-cyber-700 bg-cyber-900/60 p-6 transition hover:border-neon-yellow/50"
          >
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-neon-yellow/10">
              <TrendingUp size={24} className="text-neon-yellow" />
            </span>
            <div className="flex-1">
              <h3 className="text-lg font-bold">Smart Money Tracker</h3>
              <p className="mt-1 text-sm text-slate-400">Real on-chain footprints of institutions &amp; whales. First 3 addresses free.</p>
            </div>
            <span className="text-neon-cyan transition group-hover:translate-x-1">→</span>
          </motion.a>
        </div>
      </section>

      {/* Pricing */}
      <BannerCarousel position="home-pricing" />
      <section id="pricing" className="mx-auto max-w-5xl px-6 py-14">
        <motion.h2 {...fadeUp} className="text-center text-3xl font-bold">
          Transparent pricing
        </motion.h2>
        <p className="mt-3 text-center text-sm text-slate-400">
          Pay with <span className="font-semibold text-neon-green">🟢 USDT (TRC-20)</span> · instant activation · non-custodial direct to operator wallet, no bank card needed
        </p>
        <div className="mt-10 grid gap-6 sm:grid-cols-3">
          {pricing.map((p, i) => (
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
                {p.promoting && (
                  <span className="rounded-full bg-neon-cyan/15 px-2 py-0.5 text-[10px] font-semibold text-neon-cyan">Promo</span>
                )}
              </div>
              <p className="mt-4 text-3xl font-extrabold text-neon-cyan">
                {p.original && <span className="mr-2 text-lg font-normal text-slate-500 line-through">{p.original}</span>}
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
                href={p.id === 'business' ? TELEGRAM : '/dashboard'}
                target={p.id === 'business' ? '_blank' : undefined}
                rel={p.id === 'business' ? 'noopener noreferrer' : undefined}
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
        <p className="mt-4 text-center text-xs text-slate-500">🔒 features are exclusive to Pro and above</p>
      </section>

      {/* RWA / stablecoin compliance consulting + Telegram contact */}
      <motion.section id="consult" {...fadeUp} className="mx-auto max-w-5xl px-6 py-14">
        <div className="grid gap-8 rounded-2xl border border-cyber-700 bg-cyber-900/60 p-8 md:grid-cols-2">
          <div>
            <Landmark size={30} className="text-neon-yellow" />
            <h2 className="mt-4 text-2xl font-bold">RWA / Stablecoin Compliance Consulting</h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-400">
              Compliance architecture design, on-chain risk control and audit support for RWA tokenization, stablecoin
              payables and cross-border settlement — backed by a Hong Kong licensed advisor network. Response within 1 business day.
            </p>
            <ul className="mt-4 space-y-2 text-sm text-slate-300">
              <li>· Compliance path assessment: Hong Kong / Singapore / Dubai</li>
              <li>· Merchant USDT AML framework setup</li>
              <li>· On-chain fund tracing &amp; freeze-response support</li>
            </ul>
          </div>
          <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-cyber-700 bg-cyber-950/50 p-8 text-center">
            <p className="text-lg font-bold text-slate-200">Talk to us directly</p>
            <p className="text-sm text-slate-400">
              Sales, licensing, API access and consulting — reach the team on Telegram.
            </p>
            <a
              href={TELEGRAM}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl bg-neon-cyan/90 px-6 py-3 text-sm font-bold text-cyber-950 transition hover:bg-neon-cyan"
            >
              ✈ Contact us on Telegram
            </a>
            <p className="text-xs text-slate-500">Typically replies within hours · Mon–Sat</p>
          </div>
        </div>
      </motion.section>

      {/* Footer */}
      <footer className="border-t border-cyber-800 py-8 text-center text-xs text-slate-500">
        <p>© 2026 ChainSentinel Limited (Hong Kong). All rights reserved.</p>
        <p className="mt-1">
          Risk results are signals only and do not constitute legal or investment advice. Contact:{' '}
          <a href={TELEGRAM} target="_blank" rel="noopener noreferrer" className="text-neon-cyan hover:underline">
            Telegram
          </a>
        </p>
      </footer>
    </main>
  );
}
