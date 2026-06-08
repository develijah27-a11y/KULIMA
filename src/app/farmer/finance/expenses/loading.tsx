export default function ExpensesLoading() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="h-8 w-48 dash-skeleton rounded-lg" />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px' }}>
        {[1, 2, 3].map(i => <div key={i} className="dash-skeleton h-24 rounded-xl" />)}
      </div>
      <div className="dash-skeleton h-14 rounded-xl" />
      {[1, 2, 3, 4, 5].map(i => <div key={i} className="dash-skeleton h-16 rounded-xl" />)}
    </div>
  );
}
