import { Newspaper, ExternalLink } from 'lucide-react';
import { getAgriculturalNews } from '@/lib/news';

const C = {
  text: 'var(--d-text)', muted: 'var(--d-muted)', border: 'var(--d-border)',
  cardBg: 'var(--d-card)', shadow: 'var(--d-shadow-card)',
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-UG', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

// Full agricultural-news feed, shared across every role's /[role]/news page
// (same pattern as AccountPage) so each gets that role's own sidebar/layout
// for free without duplicating this UI per role.
export async function NewsFeedPage() {
  const items = await getAgriculturalNews();

  return (
    <div style={{ maxWidth: 760, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
        <Newspaper size={20} style={{ color: 'var(--color-primary)' }} />
        <h1 style={{ fontSize: 20, fontWeight: 800, color: C.text, margin: 0, letterSpacing: '-0.02em' }}>
          Agricultural Updates
        </h1>
      </div>
      <p style={{ fontSize: 13, color: C.muted, margin: '4px 0 20px' }}>
        Farming, market, and agribusiness headlines from Uganda and across Africa.
      </p>

      {items.length === 0 ? (
        <div style={{ background: C.cardBg, borderRadius: 16, boxShadow: C.shadow, padding: 24, textAlign: 'center' }}>
          <p style={{ fontSize: 13, color: C.muted, margin: 0 }}>
            No updates available right now. This refreshes automatically — please check back shortly.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {items.map(item => (
            <a
              key={item.id || item.link}
              href={item.link}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'block', background: C.cardBg, borderRadius: 14, boxShadow: C.shadow,
                padding: '16px 18px', textDecoration: 'none',
              }}
            >
              <p style={{ fontSize: 14.5, fontWeight: 700, color: C.text, margin: '0 0 6px', lineHeight: 1.4 }}>
                {item.title}
              </p>
              {item.summary && (
                <p style={{ fontSize: 12.5, color: C.muted, margin: '0 0 8px', lineHeight: 1.5 }}>
                  {item.summary}
                </p>
              )}
              <p style={{ fontSize: 11, color: 'var(--color-primary)', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: 5 }}>
                {item.source} · {formatDate(item.publishedAt)}
                <ExternalLink size={11} />
              </p>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
