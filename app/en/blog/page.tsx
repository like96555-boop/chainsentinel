import Link from 'next/link';
import { BLOG_POSTS } from './content';

export const metadata = {
  title: 'Blog — Crypto AML & Address Screening Guides | ChainSentinel',
  description:
    'Practical guides on crypto AML, OFAC SDN sanctions screening, USDT blacklist checks and multi-chain (TRON/BTC/ETH) address risk screening for merchants and institutions.',
  alternates: { canonical: '/en/blog' },
};

export default function BlogIndexPage() {
  return (
    <main className="grid-bg">
      <section className="mx-auto max-w-3xl px-6 py-16">
        <p className="text-xs font-semibold uppercase tracking-widest text-neon-cyan">ChainSentinel Blog</p>
        <h1 className="mt-3 text-3xl font-extrabold sm:text-4xl">
          Crypto AML &amp; address screening, <span className="text-neon-cyan">practically</span>
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-400">
          Real-world guides on screening USDT payments, OFAC sanctions compliance, and on-chain risk analysis.
          Written from what we actually run — 906 OFAC SDN addresses plus 2 public records, TRON/BTC/ETH engines,
          live in production. No entity attribution or multi-hop tracing; a non-match is not a clearance.
        </p>
        <p className="mt-3 text-sm leading-relaxed text-slate-400">
          Building an autonomous agent? See the{' '}
          <Link href="/en/agent" className="font-semibold text-neon-cyan hover:underline">
            free no-signup OFAC SDN screening API →
          </Link>{' '}
          或查阅 <Link href="/llms.txt" className="font-mono text-neon-cyan hover:underline">llms.txt</Link>.
        </p>
        <div className="mt-10 space-y-6">
          {BLOG_POSTS.map((p) => (
            <Link
              key={p.slug}
              href={`/en/blog/${p.slug}`}
              className="group block rounded-2xl border border-cyber-700 bg-cyber-900/60 p-6 transition hover:border-neon-cyan/50"
            >
              <div className="flex items-center gap-3 text-xs text-slate-500">
                <span>{p.date}</span>
                <span>·</span>
                <span>{p.readingTime}</span>
              </div>
              <h2 className="mt-2 text-xl font-bold text-slate-100 transition group-hover:text-neon-cyan">
                {p.title}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">{p.excerpt}</p>
              <p className="mt-3 text-xs font-semibold text-neon-cyan transition group-hover:translate-x-1">Read more →</p>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
