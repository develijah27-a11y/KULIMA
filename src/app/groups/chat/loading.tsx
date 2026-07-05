export default function Loading() {
  return (
    <div
      className="animate-pulse"
      style={{
        display: 'flex', flexDirection: 'column',
        height: 'calc(100vh - 140px)', minHeight: 400,
        borderRadius: 16, overflow: 'hidden',
        background: 'var(--d-card)', boxShadow: 'var(--d-shadow-card)',
      }}
    >
      {/* Header */}
      <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--d-border)', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
        <div className="dash-skeleton" style={{ width: 36, height: 36, borderRadius: 10 }} />
        <div style={{ flex: 1 }}>
          <div className="dash-skeleton" style={{ width: 100, height: 14, borderRadius: 6, marginBottom: 6 }} />
          <div className="dash-skeleton" style={{ width: 150, height: 11, borderRadius: 6 }} />
        </div>
        <div className="dash-skeleton" style={{ width: 42, height: 18, borderRadius: 99 }} />
      </div>

      {/* Message bubbles */}
      <div style={{ flex: 1, padding: 16, display: 'flex', flexDirection: 'column', gap: 14, background: 'var(--color-bg)' }}>
        {[
          { w: '52%', own: false, h: 44 },
          { w: '40%', own: true,  h: 44 },
          { w: '68%', own: false, h: 60 },
          { w: '38%', own: true,  h: 44 },
          { w: '56%', own: false, h: 44 },
          { w: '44%', own: true,  h: 60 },
        ].map((s, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: s.own ? 'row-reverse' : 'row', gap: 8, alignItems: 'flex-end' }}>
            {!s.own && <div className="dash-skeleton" style={{ width: 30, height: 30, borderRadius: '50%', flexShrink: 0 }} />}
            <div className="dash-skeleton" style={{ width: s.w, height: s.h, borderRadius: s.own ? '14px 14px 4px 14px' : '14px 14px 14px 4px' }} />
          </div>
        ))}
      </div>

      {/* Input bar */}
      <div style={{ padding: '10px 14px', borderTop: '1px solid var(--d-border)', display: 'flex', gap: 10, alignItems: 'center', flexShrink: 0 }}>
        <div className="dash-skeleton" style={{ flex: 1, height: 44, borderRadius: 14 }} />
        <div className="dash-skeleton" style={{ width: 44, height: 44, borderRadius: 14, flexShrink: 0 }} />
      </div>
    </div>
  );
}
