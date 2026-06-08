export default function WorkersLoading() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="dash-skeleton h-5 w-40 rounded" />
      <div className="dash-skeleton h-8 w-56 rounded-lg" />
      <div style={{ display: 'flex', gap: 12 }}>
        {[1,2,3].map(i => <div key={i} className="dash-skeleton h-20 w-32 rounded-xl" />)}
      </div>
      {[1,2,3,4].map(i => <div key={i} className="dash-skeleton h-28 rounded-2xl" />)}
    </div>
  );
}
