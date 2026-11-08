import type { Metadata } from 'next';
import './globals.css';
import ChatWidget from '@/components/ChatWidget';
import NavBar from '@/components/NavBar';
import SiteFooter from '@/components/SiteFooter';
import { AnnouncementBar } from '@/components/BannerCarousel';

export const metadata: Metadata = {
  metadataBase: new URL('https://chainsentinel.hk'),
  title: {
    default: '链哨 ChainSentinel — 链上风控 / 加密地址风险筛查 API（TRON/BTC/ETH）',
    template: '%s | 链哨 ChainSentinel',
  },
  description:
    '面向商户与机构的链上风控 SaaS：TRON/BTC/ETH 多链地址风险识别、USDT 黑名单检测、OFAC SDN 制裁地址筛查、地址监控与税务合规报表。ChainSentinel Limited (Hong Kong)。Crypto AML & on-chain risk screening API for merchants and institutions.',
  keywords: [
    'crypto AML', 'on-chain risk screening', 'address blacklist check', 'USDT blacklist', 'OFAC SDN check',
    'KYT', 'blockchain compliance', 'TRON address risk', 'BTC address risk', 'ETH address risk',
    '链上风控', '地址风险识别', 'USDT 黑名单检测', 'OFAC 制裁筛查', '加密收款风控', 'KYT 服务',
  ],
  icons: {
    icon: [{ url: '/icon.svg', type: 'image/svg+xml' }],
  },
  openGraph: {
    type: 'website',
    locale: 'zh_CN',
    alternateLocale: 'en_US',
    url: 'https://chainsentinel.hk',
    siteName: 'ChainSentinel',
    title: '链哨 ChainSentinel — OFAC SDN 地址筛查 / Agent 交互前否决门',
    description: 'TRON/BTC/ETH 地址筛查：906 条 OFAC SDN 制裁地址 + 2 条公开记录，返回明确的 coverage（查了什么、没查什么）。零注册，Agent 可直接调用。未命中不等于清白。',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'ChainSentinel — Crypto AML & On-chain Risk Screening' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ChainSentinel — Free OFAC SDN address screening for AI agents',
    description: 'Zero-signup first-pass veto gate for TRON/BTC/ETH addresses. Explicit coverage says what was checked and what was not. A non-match is not a clearance.',
    images: ['/og-image.png'],
  },
  alternates: {
    canonical: '/',
    languages: { 'zh-CN': '/', 'en': '/en' },
  },
  robots: { index: true, follow: true },
};

const JSON_LD = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebSite',
      name: 'ChainSentinel 链哨',
      alternateName: 'ChainSentinel',
      url: 'https://chainsentinel.hk',
      inLanguage: ['zh-CN', 'en'],
      description: 'On-chain AML & crypto address risk screening for merchants and institutions.',
    },
    {
      '@type': 'Organization',
      name: 'ChainSentinel Limited',
      url: 'https://chainsentinel.hk',
      email: 'support@chainsentinel.hk',
      address: { '@type': 'PostalAddress', addressCountry: 'HK' },
    },
    {
      '@type': 'SoftwareApplication',
      name: 'ChainSentinel 链哨',
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'Web',
      url: 'https://chainsentinel.hk',
      description:
        'Free first-pass address screening for TRON / BTC / ETH against the OFAC SDN list (906 addresses) plus 2 public records, with explicit coverage of what was not checked. No entity attribution, no multi-hop tracing, no KYT report. Zero-signup API for AI agents.',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
      inLanguage: ['zh-CN', 'en'],
    },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <head>
        {/* Agent 发现入口：访问任意页面都能从 <head> 找到机器可读文档 */}
        <link rel="alternate" type="text/plain" href="/llms.txt" title="llms.txt — LLM entry point" />
        <link rel="alternate" type="text/plain" href="/llms-full.txt" title="llms-full.txt — full agent docs" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
        />
      </head>
      <body className="min-h-screen antialiased">
        <AnnouncementBar />
        <NavBar />
        {children}
        <SiteFooter />
        <ChatWidget />
      </body>
    </html>
  );
}
