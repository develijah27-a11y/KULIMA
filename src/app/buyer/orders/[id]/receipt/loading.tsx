export default function Loading() {
  return (
    <div style={{ maxWidth: 680, margin: '0 auto' }}>
      <div className="dash-skeleton" style={{ height: 36, width: 120, borderRadius: 8, marginBottom: 20 }} />
      <div className="dash-skeleton" style={{ height: 600, borderRadius: 20 }} />
    </div>
  );
}
