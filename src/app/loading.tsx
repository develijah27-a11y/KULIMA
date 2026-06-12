export default function GlobalLoading() {
  return (
    <div style={{ background: '#1A0800', minHeight: '100vh', display: 'flex' }}>
      {/* Sidebar skeleton */}
      <div style={{ width: 220, minHeight: '100vh', background: '#200E00', borderRight: '1px solid rgba(249,115,22,0.08)', padding: '20px 16px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {/* Logo */}
        <div className="orange-skeleton" style={{ height: 40, width: '70%', marginBottom: 16 }} />
        {/* Nav items */}
        {[1,2,3,4,5,6].map(i => (
          <div key={i} className="orange-skeleton" style={{ height: 36, width: i % 3 === 0 ? '60%' : '85%' }} />
        ))}
        <div style={{ marginTop: 16, borderTop: '1px solid rgba(249,115,22,0.08)', paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[1,2].map(i => (
            <div key={i} className="orange-skeleton" style={{ height: 36, width: '75%' }} />
          ))}
        </div>
        {/* Profile at bottom */}
        <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', gap: 10, paddingTop: 16 }}>
          <div className="orange-skeleton" style={{ width: 36, height: 36, borderRadius: 99, flexShrink: 0 }} />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div className="orange-skeleton" style={{ height: 12, width: '80%' }} />
            <div className="orange-skeleton" style={{ height: 10, width: '55%' }} />
          </div>
        </div>
      </div>

      {/* Main content skeleton */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Top bar */}
        <div style={{ height: 64, background: '#200E00', borderBottom: '1px solid rgba(249,115,22,0.08)', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div className="orange-skeleton" style={{ height: 20, width: 220 }} />
          <div style={{ display: 'flex', gap: 10 }}>
            <div className="orange-skeleton" style={{ height: 36, width: 36, borderRadius: 99 }} />
            <div className="orange-skeleton" style={{ height: 36, width: 36, borderRadius: 99 }} />
          </div>
        </div>

        {/* Page content */}
        <div style={{ flex: 1, padding: '24px', display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 900, width: '100%', margin: '0 auto' }}>
          {/* Wide banner card */}
          <div className="orange-skeleton" style={{ height: 140 }} />

          {/* 4-column stat cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
            {[1,2,3,4].map(i => (
              <div key={i} className="orange-skeleton" style={{ height: 108 }} />
            ))}
          </div>

          {/* Slim banner */}
          <div className="orange-skeleton" style={{ height: 72 }} />

          {/* 2-column cards */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div className="orange-skeleton" style={{ height: 260 }} />
            <div className="orange-skeleton" style={{ height: 260 }} />
          </div>

          {/* Another 2-column row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div className="orange-skeleton" style={{ height: 220 }} />
            <div className="orange-skeleton" style={{ height: 220 }} />
          </div>
        </div>
      </div>
    </div>
  );
}
