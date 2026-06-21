export default function Loading() {
  return (
    <div className="max-w-2xl mx-auto">
      <div className="dash-skeleton" style={{ height: 28, width: 180, borderRadius: 8, marginBottom: 6 }} />
      <div className="dash-skeleton" style={{ height: 16, width: 240, borderRadius: 6, marginBottom: 20 }} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 20 }}>
        {[1,2,3].map(i => <div key={i} className="dash-skeleton" style={{ height: 72, borderRadius: 14 }} />)}
      </div>
      {[1,2,3].map(i => (
        <div key={i} className="dash-skeleton" style={{ height: 110, borderRadius: 16, marginBottom: 12 }} />
      ))}
    </div>
  );
}
