interface Props {
  icon: string;
  title: string;
  description: string;
  accent?: string;
}

export function ComingSoon({ icon, title, description, accent = '#1B4332' }: Props) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', textAlign: 'center', padding: '40px 24px' }}>
      <div style={{ fontSize: 56, marginBottom: 20 }}>{icon}</div>
      <h1 style={{ fontSize: 22, fontWeight: 800, color: '#1A1A1A', letterSpacing: '-0.03em', marginBottom: 8 }}>
        {title}
      </h1>
      <p style={{ fontSize: 14, color: '#6B7280', maxWidth: 380, lineHeight: 1.6, marginBottom: 24 }}>
        {description}
      </p>
      <span style={{
        display: 'inline-block', padding: '6px 16px', borderRadius: 999,
        background: `${accent}15`, color: accent,
        fontSize: 12, fontWeight: 700, letterSpacing: '0.05em',
      }}>
        COMING SOON
      </span>
    </div>
  );
}
