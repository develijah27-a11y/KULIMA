export default function FarmerOrdersLoading() {
  return (
    <div className="max-w-2xl mx-auto space-y-5 animate-pulse">
      {/* Header */}
      <div className="flex justify-between items-end">
        <div>
          <div className="dash-skeleton h-6 w-32 rounded-md mb-2" />
          <div className="dash-skeleton h-4 w-44 rounded-md" />
        </div>
        <div className="dash-skeleton h-4 w-24 rounded" />
      </div>

      {/* 3 KPIs */}
      <div className="grid grid-cols-3 gap-2.5">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            style={{ background: 'var(--d-card)', borderRadius: 14, padding: '14px 16px', border: '1px solid var(--d-border)' }}
          >
            <div className="dash-skeleton h-6 w-14 rounded mb-1" />
            <div className="dash-skeleton h-3 w-20 rounded" />
          </div>
        ))}
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="dash-skeleton h-8 w-18 rounded-full shrink-0" />
        ))}
      </div>

      {/* Order Cards */}
      <div className="space-y-3.5">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            style={{
              background: 'var(--d-card)',
              borderRadius: 16,
              boxShadow: 'var(--d-shadow-card)',
              border: '1px solid var(--d-border)',
              padding: '18px 20px',
            }}
            className="space-y-3.5"
          >
            {/* Top row */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="dash-skeleton w-10 h-10 rounded-xl shrink-0" />
                <div className="space-y-1.5">
                  <div className="dash-skeleton h-4 w-28 rounded" />
                  <div className="dash-skeleton h-3 w-40 rounded" />
                </div>
              </div>
              <div className="dash-skeleton h-6 w-24 rounded-full" />
            </div>

            {/* Middle row */}
            <div className="pt-2 border-t border-[var(--d-border)] flex justify-between items-center">
              <div className="dash-skeleton h-3.5 w-32 rounded" />
              <div className="dash-skeleton h-5 w-28 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
