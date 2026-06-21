export default function Loading() {
  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div className="dash-skeleton" style={{ height: 60, borderRadius: 14 }} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
        {[1,2,3].map(i => <div key={i} className="dash-skeleton" style={{ height: 72, borderRadius: 12 }} />)}
      </div>
      <div className="dash-skeleton" style={{ height: 44, borderRadius: 10 }} />
      <div className="dash-skeleton" style={{ height: 240, borderRadius: 14 }} />
    </div>
  );
}
