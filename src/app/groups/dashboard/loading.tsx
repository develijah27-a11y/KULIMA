export default function GroupsDashboardLoading() {
  return (
    <div className="space-y-5 max-w-5xl mx-auto">

      {/* 0 · Welcome Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <div className="dash-skeleton h-7 w-48 rounded-lg" />
          <div className="dash-skeleton h-4 w-40 rounded" />
        </div>
        <div className="dash-skeleton h-9 w-32 rounded-xl" />
      </div>

      {/* 1 · 4 Metric Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="dash-card-modern"
            style={{
              background: 'var(--d-card)',
              borderRadius: 12,
              boxShadow: 'var(--d-shadow-card)',
              borderTop: '3px solid var(--d-border)',
              padding: '18px 20px',
            }}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="dash-skeleton h-3.5 w-24 rounded" />
              <div className="dash-skeleton w-6 h-6 rounded-full shrink-0" />
            </div>
            <div className="dash-skeleton h-7 w-20 rounded mb-2" />
            <div className="dash-skeleton h-3 w-28 rounded" />
          </div>
        ))}
      </div>

      {/* 2 · Quick Actions (5 action buttons matching QuickActions) */}
      <div
        className="dash-card-modern"
        style={{
          background: 'var(--d-card)',
          borderRadius: 14,
          boxShadow: 'var(--d-shadow-card)',
          border: '1px solid var(--d-border)',
        }}
      >
        <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--d-border)' }}>
          <div className="dash-skeleton h-4 w-28 rounded" />
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 p-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="flex flex-col items-center gap-2 py-4 rounded-xl"
              style={{ background: 'var(--color-surface-2)' }}
            >
              <div className="dash-skeleton w-10 h-10 rounded-full" />
              <div className="dash-skeleton h-2.5 w-16 rounded" />
            </div>
          ))}
        </div>
      </div>

      {/* 3 · Season Action Banner */}
      <div className="rounded-xl p-5" style={{ background: 'var(--color-surface-2)', border: '1px solid var(--d-border)' }}>
        <div className="flex items-start gap-3">
          <div className="dash-skeleton w-10 h-10 rounded-xl shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="dash-skeleton h-3 w-36 rounded" />
            <div className="dash-skeleton h-4 w-3/4 rounded" />
          </div>
          <div className="dash-skeleton h-7 w-16 rounded-lg shrink-0" />
        </div>
      </div>

      {/* 4 · Group Members & Collective Listings (2-col) */}
      <div className="grid lg:grid-cols-2 gap-5">
        {/* Members List Card */}
        <div
          className="dash-card-modern"
          style={{
            background: 'var(--d-card)',
            borderRadius: 14,
            boxShadow: 'var(--d-shadow-card)',
            border: '1px solid var(--d-border)',
          }}
        >
          <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--d-border)' }}>
            <div className="space-y-1">
              <div className="dash-skeleton h-4 w-28 rounded" />
              <div className="dash-skeleton h-3 w-36 rounded" />
            </div>
            <div className="dash-skeleton h-3 w-16 rounded" />
          </div>
          <div className="divide-y" style={{ borderColor: 'var(--d-border)' }}>
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="px-5 py-3.5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 flex-1">
                  <div className="dash-skeleton w-9 h-9 rounded-full shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="dash-skeleton h-3.5 w-32 rounded" />
                    <div className="dash-skeleton h-2.5 w-44 rounded" />
                  </div>
                </div>
                <div className="dash-skeleton h-3 w-12 rounded shrink-0" />
              </div>
            ))}
          </div>
        </div>

        {/* Collective Listings Card */}
        <div
          className="dash-card-modern"
          style={{
            background: 'var(--d-card)',
            borderRadius: 14,
            boxShadow: 'var(--d-shadow-card)',
            border: '1px solid var(--d-border)',
          }}
        >
          <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--d-border)' }}>
            <div className="space-y-1">
              <div className="dash-skeleton h-4 w-32 rounded" />
              <div className="dash-skeleton h-3 w-40 rounded" />
            </div>
            <div className="dash-skeleton h-3 w-16 rounded" />
          </div>
          <div className="divide-y" style={{ borderColor: 'var(--d-border)' }}>
            {[1, 2, 3].map((i) => (
              <div key={i} className="px-5 py-3.5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 flex-1">
                  <div className="dash-skeleton w-9 h-9 rounded-xl shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="dash-skeleton h-3.5 w-24 rounded" />
                    <div className="dash-skeleton h-2.5 w-36 rounded" />
                  </div>
                </div>
                <div className="text-right shrink-0 space-y-1.5">
                  <div className="dash-skeleton h-4 w-24 rounded ml-auto" />
                  <div className="dash-skeleton h-4 w-12 rounded-full ml-auto" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 5 · Financial Summary & Setup Guide (2-col) */}
      <div className="grid lg:grid-cols-2 gap-5">
        {/* Financial Summary Card */}
        <div
          className="dash-card-modern"
          style={{
            background: 'var(--d-card)',
            borderRadius: 14,
            boxShadow: 'var(--d-shadow-card)',
            border: '1px solid var(--d-border)',
          }}
        >
          <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--d-border)' }}>
            <div className="dash-skeleton h-4 w-32 rounded" />
            <div className="dash-skeleton h-3 w-20 rounded" />
          </div>
          <div className="divide-y" style={{ borderColor: 'var(--d-border)' }}>
            {[1, 2, 3].map((i) => (
              <div key={i} className="px-5 py-3.5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="dash-skeleton w-8 h-8 rounded-xl shrink-0" />
                  <div className="dash-skeleton h-3.5 w-40 rounded" />
                </div>
                <div className="dash-skeleton h-4 w-24 rounded shrink-0" />
              </div>
            ))}
          </div>
          <div className="px-5 py-4">
            <div className="dash-skeleton h-10 w-full rounded-xl" />
          </div>
        </div>

        {/* Setup Guide Card */}
        <div
          className="dash-card-modern"
          style={{
            background: 'var(--d-card)',
            borderRadius: 14,
            boxShadow: 'var(--d-shadow-card)',
            border: '1px solid var(--d-border)',
          }}
        >
          <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--d-border)' }}>
            <div className="dash-skeleton h-4 w-36 rounded" />
          </div>
          <div className="divide-y" style={{ borderColor: 'var(--d-border)' }}>
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="px-5 py-3.5 flex items-center gap-3">
                <div className="dash-skeleton w-9 h-9 rounded-xl shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="dash-skeleton h-3.5 w-36 rounded" />
                  <div className="dash-skeleton h-2.5 w-48 rounded" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 6 · Drivers Near You Map Card */}
      <div
        className="dash-card-modern"
        style={{
          background: 'var(--d-card)',
          borderRadius: 14,
          boxShadow: 'var(--d-shadow-card)',
          border: '1px solid var(--d-border)',
        }}
      >
        <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--d-border)' }}>
          <div className="dash-skeleton h-4 w-32 rounded" />
          <div className="dash-skeleton h-3 w-24 rounded" />
        </div>
        <div style={{ height: 280, padding: 12 }}>
          <div className="dash-skeleton w-full h-full rounded-xl" />
        </div>
      </div>

    </div>
  );
}
