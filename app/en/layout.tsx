import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'ChainSentinel — Crypto AML & On-chain Risk Screening API (TRON/BTC/ETH)',
  description:
    'Check crypto addresses against OFAC SDN sanctions, blacklists and laundering/scam funds before you receive payments. Multi-chain (TRON/BTC/ETH) risk screening API with 3-second verdicts, address monitoring and webhook alerts for merchants and institutions.',
  alternates: {
    canonical: '/en',
    languages: { 'zh-CN': '/', en: '/en' },
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://chainsentinel.hk/en',
    siteName: 'ChainSentinel',
    title: 'ChainSentinel — Detect dirty-money addresses in 3 seconds',
    description:
      'Free crypto address risk check: OFAC SDN, blacklists, money-laundering & scam fund detection. TRON/BTC/ETH, 3-second verdict.',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'ChainSentinel — Crypto AML & On-chain Risk Screening' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ChainSentinel — Detect dirty-money addresses in 3 seconds',
    description: 'Check crypto addresses against OFAC SDN & threat intel before you receive funds. TRON/BTC/ETH.',
    images: ['/og-image.png'],
  },
};

export default function EnLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
