import type { MetadataRoute } from 'next';

export const dynamic = 'force-dynamic';

export default function sitemap(): MetadataRoute.Sitemap {
  const base = 'https://chainsentinel.hk';
  const now = new Date();
  return [
    { url: base, lastModified: now, changeFrequency: 'daily', priority: 1 },
    { url: `${base}/en`, lastModified: now, changeFrequency: 'daily', priority: 1 },
    { url: `${base}/en/blog`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${base}/en/blog/how-to-check-if-usdt-address-is-blacklisted`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${base}/en/blog/ofac-sdn-crypto-address-screening-api`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${base}/en/blog/multi-chain-crypto-address-risk-screening`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${base}/blog`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${base}/blog/usdt-address-blacklist-check`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${base}/blog/ofac-sanctions-screening-free-api`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${base}/blog/multi-chain-address-risk-screening-principle`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${base}/alerts`, lastModified: now, changeFrequency: 'hourly', priority: 0.9 },
    { url: `${base}/smart-money`, lastModified: now, changeFrequency: 'daily', priority: 0.8 },
    { url: `${base}/tax`, lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${base}/dashboard`, lastModified: now, changeFrequency: 'weekly', priority: 0.6 },
    { url: `${base}/pro/smart-money`, lastModified: now, changeFrequency: 'daily', priority: 0.6 },
  ];
}