import Link from 'next/link';
import { BLOG_POSTS } from './content';

export const metadata = {
  title: '博客 — 加密合规与地址风控实战指南 | 链哨 ChainSentinel',
  description:
    'USDT 黑名单查询、OFAC 制裁地址筛查、TRON/BTC/ETH 多链地址风险查询的实战指南，写给商户、OTC 和稳定币结算团队。',
  alternates: { canonical: '/blog' },
};

export default function BlogIndexPage() {
  return (
    <main className="grid-bg">
      <section className="mx-auto max-w-3xl px-6 py-16">
        <p className="text-xs font-semibold uppercase tracking-widest text-neon-cyan">链哨博客</p>
        <h1 className="mt-3 text-3xl font-extrabold sm:text-4xl">
          加密合规与地址风控，<span className="text-neon-cyan">实战向</span>
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-400">
          USDT 收款前怎么查黑名单、OFAC 制裁筛查怎么接 API、3 秒红绿灯结论是怎么来的——
          全部来自我们真实在跑的系统：900+ OFAC SDN 地址、TRON/BTC/ETH 三链引擎，生产环境运行中。
        </p>
        <div className="mt-10 space-y-6">
          {BLOG_POSTS.map((p) => (
            <Link
              key={p.slug}
              href={`/blog/${p.slug}`}
              className="group block rounded-2xl border border-cyber-700 bg-cyber-900/60 p-6 transition hover:border-neon-cyan/50"
            >
              <div className="flex items-center gap-3 text-xs text-slate-500">
                <span>{p.date}</span>
                <span>·</span>
                <span>{p.readingTime}</span>
              </div>
              <h2 className="mt-2 text-xl font-bold text-slate-100 transition group-hover:text-neon-cyan">{p.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">{p.excerpt}</p>
              <p className="mt-3 text-xs font-semibold text-neon-cyan transition group-hover:translate-x-1">阅读全文 →</p>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}