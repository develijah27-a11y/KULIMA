export default function Loading() {
  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div className="dash-skeleton" style={{ height: 60, borderRadius: 14 }} />
      <div className="dash-skeleton" style={{ height: 64, borderRadius: 12 }} />
      <div className="dash-skeleton" style={{ height: 52, borderRadius: 12 }} />
      <div className="grid sm:grid-cols-2 gap-4">
        {[1,2,3,4].map(i => <div key={i} className="dash-skeleton" style={{ height: 220, borderRadius: 16 }} />)}
      </div>
    </div>
  );
}
