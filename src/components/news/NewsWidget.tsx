import Link from 'next/link';
import { Newspaper, ExternalLink, ArrowRight } from 'lucide-react';
import { getAgriculturalNews } from '@/lib/news';

const C = {
  text: 'var(--d-text)', muted: 'var(--d-muted)', border: 'var(--d-border)',
  cardBg: 'var(--d-card)', shadow: 'var(--d-shadow-card)',
};

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const hours = Math.floor(diffMs / 3_600_000);
  if (hours < 1) return 'Just now';
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

// Dashboard preview of /news — shows the 4 most recent agricultural
// headlines. Server component: fetches through the same cached lib the
// full page and API route use, so this never triggers its own separate
// network call on every dashboard load.
export async function NewsWidget() {
  const items = (await getAgriculturalNews()).slice(0, 4);

  return (
    <div style={{ background: C.cardBg, borderRadius: 16, boxShadow: C.shadow, overflow: 'hidden' }}>
      <div style={{ padding: '14px 20px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Newspaper size={16} style={{ color: 'var(--color-primary)' }} />
          <p style={{ fontSize: 14, fontWeight: 800, color: C.text, margin: 0, letterSpacing: '-0.02em' }}>
            Agricultural Updates
          </p>
        </div>
        <Link href="/news" style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--color-primary)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 3 }}>
          See all <ArrowRight size={12} />
        </Link>
      </div>

      {items.length === 0 ? (
        <p style={{ padding: '20px', fontSize: 12.5, color: C.muted, margin: 0 }}>
          No updates available right now — check back later.
        </p>
      ) : (
        <div>
          {items.map((item, i) => (
            <a
              key={item.id || item.link}
              href={item.link}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'block', padding: '12px 20px',
                borderBottom: i === items.length - 1 ? 'none' : `1px solid ${C.border}`,
                textDecoration: 'none',
              }}
            >
              <p style={{ fontSize: 13, fontWeight: 700, color: C.text, margin: '0 0 4px', lineHeight: 1.4 }}>
                {item.title}
              </p>
              <p style={{ fontSize: 11, color: C.muted, margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                {item.source} · {timeAgo(item.publishedAt)}
                <ExternalLink size={10} style={{ flexShrink: 0 }} />
              </p>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
