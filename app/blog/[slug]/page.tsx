import Link from 'next/link';
import { notFound } from 'next/navigation';
import { BLOG_POSTS, getPost } from '../content';

const TELEGRAM = 'https://t.me/+85293877936';

export function generateStaticParams() {
  return BLOG_POSTS.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const post = getPost(params.slug);
  if (!post) return {};
  return {
    title: `${post.title} | 链哨 ChainSentinel`,
    description: post.excerpt,
    keywords: post.keywords.join(', '),
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: {
      type: 'article',
      title: post.title,
      description: post.excerpt,
      url: `https://chainsentinel.hk/blog/${post.slug}`,
      siteName: '链哨 ChainSentinel',
      publishedTime: post.date,
    },
  };
}

export default function BlogPostPage({ params }: { params: { slug: string } }) {
  const post = getPost(params.slug);
  if (!post) notFound();

  return (
    <main className="grid-bg">
      <article className="mx-auto max-w-3xl px-6 py-16">
        <div className="flex items-center gap-3 text-xs text-slate-500">
          <Link href="/blog" className="text-neon-cyan hover:underline">← 博客</Link>
          <span>·</span>
          <span>{post.date}</span>
          <span>·</span>
          <span>{post.readingTime}</span>
        </div>
        <h1 className="mt-4 text-3xl font-extrabold leading-tight sm:text-4xl">{post.title}</h1>
        <div className="mt-6 space-y-4">
          {post.body.map((para, i) => {
            if (para.startsWith('## ')) {
              return (
                <h2 key={i} className="pt-2 text-xl font-bold text-slate-100">{para.slice(3)}</h2>
              );
            }
            return (
              <p key={i} className="text-[15px] leading-relaxed text-slate-300">{para}</p>
            );
          })}
        </div>
        <div className="mt-10 rounded-xl border border-cyber-700 bg-cyber-900/60 p-5">
          <p className="text-sm font-semibold text-slate-200">免费查地址——免注册，3 秒出结论</p>
          <p className="mt-1 text-xs leading-relaxed text-slate-400">
            在 chainsentinel.hk 粘贴任意 TRON / BTC / ETH 地址，红绿灯结论由 OFAC SDN + 公开事件记录支撑，附链上证据可复核。
          </p>
          <div className="mt-3 flex flex-wrap gap-3">
            <Link href="/" className="rounded-lg bg-neon-cyan/90 px-4 py-2 text-xs font-bold text-cyber-950 transition hover:bg-neon-cyan">
              免费地址检查器
            </Link>
            <a
              href={TELEGRAM}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg border border-neon-cyan/40 px-4 py-2 text-xs font-semibold text-neon-cyan transition hover:bg-neon-cyan/10"
            >
              ✈ Telegram 联系团队
            </a>
          </div>
        </div>
      </article>
    </main>
  );
}