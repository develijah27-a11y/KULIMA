export default function BuyerDashboardLoading() {
  return (
    <div className="min-h-screen" style={{ background: 'var(--color-soil)' }}>
      <div className="skeleton h-16" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }} />
      <div className="max-w-4xl mx-auto px-6 py-6 space-y-5">
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <div key={i} className="skeleton h-28 rounded-2xl" />)}
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="skeleton h-24 rounded-2xl" />
          <div className="skeleton h-24 rounded-2xl" />
        </div>
        <div className="skeleton h-48 rounded-2xl" />
      </div>
    </div>
  );
}
