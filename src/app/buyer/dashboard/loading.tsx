export default function BuyerDashboardLoading() {
  return (
    <div className="space-y-5 max-w-5xl mx-auto animate-pulse">
      {/* Header skeleton */}
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <div className="dash-skeleton h-6 w-52 rounded-lg" />
          <div className="dash-skeleton h-4 w-32 rounded-lg" />
        </div>
        <div className="dash-skeleton h-9 w-36 rounded-xl" />
      </div>

      {/* 4 Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            style={{
              background: 'var(--d-card)',
              borderRadius: 14,
              boxShadow: 'var(--d-shadow-card)',
              border: '1px solid var(--d-border)',
              padding: '16px 18px',
            }}
            className="space-y-2.5"
          >
            <div className="flex justify-between items-center">
              <div className="dash-skeleton h-3.5 w-24 rounded" />
              <div className="dash-skeleton w-5 h-5 rounded-md" />
            </div>
            <div className="dash-skeleton h-7 w-28 rounded-lg" />
            <div className="dash-skeleton h-2.5 w-32 rounded" />
          </div>
        ))}
      </div>

      {/* Quick Actions (5 circular tiles) */}
      <div
        style={{
          background: 'var(--d-card)',
          borderRadius: 14,
          boxShadow: 'var(--d-shadow-card)',
          border: '1px solid var(--d-border)',
          padding: '18px 20px',
        }}
      >
        <div className="dash-skeleton h-4 w-28 rounded mb-4" />
        <div className="grid grid-cols-5 gap-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex flex-col items-center gap-2">
              <div className="dash-skeleton w-12 h-12 rounded-full" />
              <div className="dash-skeleton h-2.5 w-16 rounded" />
            </div>
          ))}
        </div>
      </div>

      {/* 2-Column: Active Offers vs Recent Deliveries */}
      <div className="grid lg:grid-cols-2 gap-5">
        {/* Left: Active Offers */}
        <div
          style={{
            background: 'var(--d-card)',
            borderRadius: 14,
            boxShadow: 'var(--d-shadow-card)',
            border: '1px solid var(--d-border)',
          }}
          className="overflow-hidden"
        >
          <div className="px-5 py-3.5 border-b border-[var(--d-border)] flex justify-between items-center">
            <div className="dash-skeleton h-4 w-28 rounded" />
            <div className="dash-skeleton h-3 w-16 rounded" />
          </div>
          <div className="divide-y divide-[var(--d-border)]">
            {[1, 2, 3].map((i) => (
              <div key={i} className="px-5 py-3.5 flex items-center gap-3">
                <div className="dash-skeleton w-10 h-10 rounded-xl shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="dash-skeleton h-4 w-32 rounded" />
                  <div className="dash-skeleton h-3 w-44 rounded" />
                </div>
                <div className="dash-skeleton h-6 w-20 rounded-full" />
              </div>
            ))}
          </div>
        </div>

        {/* Right: Recent Deliveries */}
        <div
          style={{
            background: 'var(--d-card)',
            borderRadius: 14,
            boxShadow: 'var(--d-shadow-card)',
            border: '1px solid var(--d-border)',
          }}
          className="overflow-hidden"
        >
          <div className="px-5 py-3.5 border-b border-[var(--d-border)] flex justify-between items-center">
            <div className="dash-skeleton h-4 w-36 rounded" />
            <div className="dash-skeleton h-3 w-16 rounded" />
          </div>
          <div className="divide-y divide-[var(--d-border)]">
            {[1, 2, 3].map((i) => (
              <div key={i} className="px-5 py-3.5 flex items-center gap-3">
                <div className="dash-skeleton w-10 h-10 rounded-xl shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="dash-skeleton h-4 w-32 rounded" />
                  <div className="dash-skeleton h-3 w-40 rounded" />
                </div>
                <div className="dash-skeleton h-6 w-20 rounded-full" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
