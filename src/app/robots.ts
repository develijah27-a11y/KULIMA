import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // Dashboards and account pages are behind auth and personal to each
      // user — nothing there is meant to show up in search results, and
      // letting crawlers hit them just wastes crawl budget that could go to
      // the actual public marketing pages.
      disallow: [
        '/admin', '/farmer', '/buyer', '/supplier', '/transporter',
        '/pathologist', '/offtaker', '/groups', '/dashboard', '/onboarding',
        '/pos', '/api', '/auth/reset-password', '/auth/confirm',
      ],
    },
    sitemap: 'https://www.cropifyapp.com/sitemap.xml',
  };
}
