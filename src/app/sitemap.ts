import type { MetadataRoute } from 'next';

const SITE_URL = 'https://cropify-ug.vercel.app';

// Only the genuinely public pages — everything else sits behind auth and
// is personal to whichever account is logged in, so it has no business in
// a sitemap search engines use to decide what to show anonymous visitors.
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: `${SITE_URL}/`,        lastModified: now, changeFrequency: 'weekly',  priority: 1.0 },
    { url: `${SITE_URL}/premium`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${SITE_URL}/contact`, lastModified: now, changeFrequency: 'yearly',  priority: 0.4 },
    { url: `${SITE_URL}/privacy`, lastModified: now, changeFrequency: 'yearly',  priority: 0.3 },
    { url: `${SITE_URL}/terms`,   lastModified: now, changeFrequency: 'yearly',  priority: 0.3 },
    { url: `${SITE_URL}/auth/signin`, lastModified: now, changeFrequency: 'yearly', priority: 0.5 },
    { url: `${SITE_URL}/auth/signup`, lastModified: now, changeFrequency: 'yearly', priority: 0.7 },
  ];
}
