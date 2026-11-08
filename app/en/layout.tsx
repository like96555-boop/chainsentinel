import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'ChainSentinel — Crypto AML & On-chain Risk Screening API (TRON/BTC/ETH)',
  description:
    'Free OFAC SDN sanctions address screening for TRON / BTC / ETH, plus a zero-signup API built for AI agents. We check 906 OFAC SDN addresses and 2 public records and report exactly what we did not check. No entity attribution, no multi-hop tracing — a non-match is not proof of clean funds, and green is not a clearance.',
  alternates: {
    canonical: '/en',
    languages: { 'zh-CN': '/', en: '/en' },
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://chainsentinel.hk/en',
    siteName: 'ChainSentinel',
    title: 'ChainSentinel — Free OFAC SDN address screening for AI agents',
    description:
      'Zero-signup first-pass veto gate for TRON/BTC/ETH. 906 OFAC SDN addresses + 2 public records, with explicit coverage of what was not checked.',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'ChainSentinel — Crypto AML & On-chain Risk Screening' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ChainSentinel — Free OFAC SDN address screening for AI agents',
    description: 'Zero-signup OFAC SDN address check for TRON/BTC/ETH with explicit coverage. A non-match is not a clearance.',
    images: ['/og-image.png'],
  },
};

export default function EnLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
