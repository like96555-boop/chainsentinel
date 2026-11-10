'use client';

import { usePathname } from 'next/navigation';
import SmartLink from '@/components/SmartLink';

/**
 * 全站页脚。两个作用：
 * 1) 让 /agent 与 /en/agent 从站内每个页面都可达（此前是只在 sitemap 里的孤儿页）；
 * 2) 让访问任意页面的爬虫 / Agent 都能看到机器可读入口（llms.txt、OpenAPI、agent card）。
 * 后台页面不展示，避免管理界面混入公开导航。
 */
export default function SiteFooter() {
  const pathname = usePathname();
  if (pathname.startsWith('/admin')) return null;

  const isEn = pathname === '/en' || pathname.startsWith('/en/');
  const agentHome = isEn ? '/en/agent' : '/agent';
  const productLinks = isEn
    ? [
        { href: '/en#features', label: 'All features' },
        { href: '/en#check', label: 'Address checker' },
        { href: '/en/blog', label: 'Guides' },
        { href: '/en/agent', label: 'Agent API' },
        { href: '/alerts', label: 'Risk alerts' },
        { href: '/smart-money', label: 'Smart money' },
        { href: '/tax', label: 'Tax centre' },
        { href: '/dashboard', label: 'Plans & metering' },
        { href: '/en#consult', label: 'Compliance advisory' },
      ]
    : [
        { href: '/#features', label: '功能总览' },
        { href: '/#check', label: '地址筛查' },
        { href: '/blog', label: '博客' },
        { href: '/agent', label: 'Agent API' },
        { href: '/alerts', label: '风险警示榜' },
        { href: '/smart-money', label: '聪明钱追踪' },
        { href: '/tax', label: '税务中心' },
        { href: '/dashboard', label: '订阅中心' },
        { href: '/#consult', label: '合规咨询' },
      ];
  const machineLinks = [
    { href: '/llms.txt', label: 'llms.txt' },
    { href: '/llms-full.txt', label: 'llms-full.txt' },
    { href: '/api/v1/manifest', label: 'manifest' },
    { href: '/api/openapi.json', label: 'OpenAPI 3.1' },
    { href: '/.well-known/agent-card.json', label: 'agent card' },
    { href: '/api/mcp', label: 'MCP tools' },
  ];

  return (
    <footer className="mt-20 border-t border-cyber-800 bg-cyber-950/70">
      <div className="mx-auto grid max-w-5xl gap-8 px-6 py-10 sm:grid-cols-3">
        <div>
          <p className="text-sm font-bold text-white">
            {isEn ? 'Chain' : '链哨 Chain'}
            <span className="text-neon-cyan">Sentinel</span>
          </p>
          <p className="mt-3 text-xs leading-relaxed text-slate-400">
            {isEn
              ? 'A free, zero-signup first-pass veto gate before an agent interacts with a crypto address. OFAC SDN list screening with explicit coverage. Not a full AML/KYT investigation — a non-match is not a clearance.'
              : '交互前的免费否决门：零注册检查地址是否命中 OFAC SDN 名单，并明确返回查了什么、没查什么。不是完整的 AML/KYT 调查，未命中不等于清白。'}
          </p>
        </div>

        <div>
          <p className="text-xs font-semibold tracking-wider text-slate-300">
            {isEn ? 'PRODUCT' : '产品'}
          </p>
          <ul className="mt-3 space-y-2">
            {productLinks.map((l) => (
              <li key={l.href}>
                <SmartLink href={l.href} className="text-xs text-slate-400 transition hover:text-neon-cyan">
                  {l.label}
                </SmartLink>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="text-xs font-semibold tracking-wider text-slate-300">
            {isEn ? 'FOR AI AGENTS & CRAWLERS' : '给 AGENT / 爬虫的入口'}
          </p>
          <ul className="mt-3 space-y-2">
            {machineLinks.map((l) => (
              <li key={l.href}>
                <a
                  href={l.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-xs text-slate-400 transition hover:text-neon-cyan"
                >
                  {l.label}
                </a>
              </li>
            ))}
            <li>
              <SmartLink href={agentHome} className="text-xs text-neon-cyan transition hover:underline">
                {isEn ? 'Agent integration guide →' : 'Agent 接入说明 →'}
              </SmartLink>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-cyber-800/70 px-6 py-4">
        <p className="mx-auto max-w-5xl text-[11px] leading-relaxed text-slate-500">
          © {new Date().getFullYear()} ChainSentinel Limited · {isEn ? 'Hong Kong, China' : '中国香港'} ·{' '}
          {isEn
            ? 'Read-only risk signals, not legal advice or compliance clearance. green / a non-match does not prove clean funds.'
            : '仅提供只读风险信号，不构成法律意见或合规放行；green / 未命中不证明资金干净。'}
        </p>
      </div>
    </footer>
  );
}
