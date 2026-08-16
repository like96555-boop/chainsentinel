import type { Metadata } from 'next';
import './globals.css';
import ChatWidget from '@/components/ChatWidget';
import NavBar from '@/components/NavBar';
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
    title: '链哨 ChainSentinel — 3 秒识别黑钱地址',
    description: 'TRON/BTC/ETH 多链地址风险筛查 API：黑名单命中、OFAC SDN 制裁地址、混币/诈骗归集资金识别。商户收款前拦截脏 U，守住账户安全。',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'ChainSentinel — Crypto AML & On-chain Risk Screening' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ChainSentinel — Crypto AML & On-chain Risk Screening',
    description: 'Check crypto addresses against OFAC SDN & threat intel before you receive funds. TRON/BTC/ETH, 3-second verdict.',
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
        'Multi-chain (TRON/BTC/ETH) crypto address risk screening: blacklist hits, OFAC SDN sanctions, money-laundering & scam fund detection. Free public address check + API for merchants.',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
      inLanguage: ['zh-CN', 'en'],
    },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
        />
      </head>
      <body className="min-h-screen antialiased">
        <AnnouncementBar />
        <NavBar />
        {children}
        <ChatWidget />
      </body>
    </html>
  );
}
