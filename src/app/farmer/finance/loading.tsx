export default function FinanceLoading() {
  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="h-8 w-40 dash-skeleton rounded-lg" />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '16px' }}>
        {[1, 2, 3].map(i => <div key={i} className="dash-skeleton h-36 rounded-2xl" />)}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
        {[1, 2, 3, 4].map(i => <div key={i} className="dash-skeleton h-28 rounded-xl" />)}
      </div>
      <div className="dash-skeleton h-48 rounded-2xl" />
    </div>
  );
}
