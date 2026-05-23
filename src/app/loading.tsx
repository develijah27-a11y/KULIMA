'use client';

export default function GlobalLoading() {
  return (
    <div style={{ background: '#0D160A', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 40, height: 40, border: '4px solid #1C2D17', borderTopColor: '#7DB55A', borderRadius: '50%', animation: 'spin .8s linear infinite', margin: '0 auto 12px' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <p style={{ fontFamily: 'DM Sans', color: '#F7F2E8', fontSize: 14, opacity: .6 }}>Loading Kulima…</p>
      </div>
    </div>
  );
}
