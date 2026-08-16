import type { MetadataRoute } from 'next';

export const dynamic = 'force-dynamic';

export default function sitemap(): MetadataRoute.Sitemap {
  const base = 'https://chainsentinel.hk';
  const now = new Date();
  return [
    { url: base, lastModified: now, changeFrequency: 'daily', priority: 1 },
    { url: `${base}/en`, lastModified: now, changeFrequency: 'daily', priority: 1 },
    { url: `${base}/alerts`, lastModified: now, changeFrequency: 'hourly', priority: 0.9 },
    { url: `${base}/smart-money`, lastModified: now, changeFrequency: 'daily', priority: 0.8 },
    { url: `${base}/tax`, lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${base}/dashboard`, lastModified: now, changeFrequency: 'weekly', priority: 0.6 },
    { url: `${base}/pro/smart-money`, lastModified: now, changeFrequency: 'daily', priority: 0.6 },
  ];
}
