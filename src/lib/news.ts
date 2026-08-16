import { unstable_cache } from 'next/cache';

export interface NewsItem {
  title: string;
  link: string;
  source: string;
  publishedAt: string; // ISO
  summary: string;
}

// AllAfrica's dedicated Food & Agriculture feed — a real, continuously
// updated RSS 2.0 source (confirmed live, ttl=15min) that already surfaces
// Uganda-specific stories through aggregation from local outlets, not just
// pan-African content, so it doesn't need a second Uganda-only feed merged
// in for local relevance.
const FEED_URL = 'https://allafrica.com/tools/headlines/rdf/agriculture/headlines.rdf';

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

function extractTag(block: string, tag: string): string {
  const m = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'));
  if (!m) return '';
  const raw = m[1].trim();
  const cdata = raw.match(/^<!\[CDATA\[([\s\S]*?)\]\]>$/);
  return decodeEntities((cdata ? cdata[1] : raw).trim());
}

// AllAfrica prefixes each description with its original outlet in brackets,
// e.g. "[Nile Post] Residents of..." — surface that as the real source
// instead of just "AllAfrica" for every item, and strip it from the body.
function splitSourceAndSummary(description: string): { source: string; summary: string } {
  const m = description.match(/^\[([^\]]+)\]\s*([\s\S]*)$/);
  if (m) return { source: m[1].trim(), summary: m[2].trim() };
  return { source: 'AllAfrica', summary: description };
}

function parseFeed(xml: string): NewsItem[] {
  const items: NewsItem[] = [];
  const blocks = xml.match(/<item>[\s\S]*?<\/item>/g) ?? [];
  for (const block of blocks) {
    const title = extractTag(block, 'title');
    const link = extractTag(block, 'link');
    const pubDateRaw = extractTag(block, 'pubDate');
    const description = extractTag(block, 'description');
    if (!title || !link) continue;

    const publishedAt = pubDateRaw ? new Date(pubDateRaw) : null;
    const { source, summary } = splitSourceAndSummary(description);

    items.push({
      title,
      link,
      source,
      publishedAt: publishedAt && !isNaN(publishedAt.getTime()) ? publishedAt.toISOString() : new Date().toISOString(),
      summary: summary.length > 220 ? summary.slice(0, 217) + '…' : summary,
    });
  }
  return items;
}

async function fetchAgriNews(): Promise<NewsItem[]> {
  try {
    const res = await fetch(FEED_URL, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; CropifyBot/1.0)' },
      next: { revalidate: 1800 },
    });
    if (!res.ok) return [];
    const xml = await res.text();
    return parseFeed(xml).slice(0, 20);
  } catch {
    return [];
  }
}

// Cached for 30 minutes, same window as weather/prices — this is an
// external feed with its own ttl of 15min, no value in hitting it more
// often, and it keeps every dashboard load from re-fetching it live.
const fetchAgriNewsCached = unstable_cache(fetchAgriNews, ['agri-news'], {
  revalidate: 1800,
  tags: ['news'],
});

export async function getAgriculturalNews(): Promise<NewsItem[]> {
  return fetchAgriNewsCached();
}
