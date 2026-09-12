import { DashboardWelcomeHeroSkeleton } from '@/components/layout/DashboardWelcomeHeroSkeleton';

export default function FarmerDashboardLoading() {
  return (
    <div className="space-y-5 max-w-5xl mx-auto">

      {/* 0 · Welcome Header Skeleton */}
      <DashboardWelcomeHeroSkeleton />

      {/* 1 · Weather Card (3-col layout matching actual WeatherCard) */}
      <div
        className="dash-card-modern"
        style={{
          background: 'var(--d-card)',
          borderRadius: 16,
          boxShadow: 'var(--d-shadow-card)',
          border: '1px solid var(--d-border)',
          overflow: 'hidden',
        }}
      >
        <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x" style={{ borderColor: 'var(--d-border)' }}>
          {/* Main temperature & condition */}
          <div className="p-4 sm:p-5 flex items-center gap-4">
            <div className="dash-skeleton w-14 h-14 rounded-2xl shrink-0" />
            <div className="space-y-2 flex-1">
              <div className="dash-skeleton h-8 w-20 rounded-md" />
              <div className="dash-skeleton h-3.5 w-28 rounded" />
              <div className="dash-skeleton h-3 w-36 rounded" />
            </div>
          </div>
          {/* Fieldwork advice */}
          <div className="p-4 sm:p-5 flex flex-col justify-center space-y-2">
            <div className="dash-skeleton h-3 w-28 rounded" />
            <div className="dash-skeleton h-6 w-36 rounded-lg" />
            <div className="dash-skeleton h-3 w-24 rounded" />
          </div>
          {/* Today Date & mini forecast */}
          <div className="p-4 sm:p-5 flex flex-col justify-center space-y-2">
            <div className="dash-skeleton h-3 w-16 rounded" />
            <div className="dash-skeleton h-4 w-32 rounded" />
            <div className="flex gap-2 pt-1">
              <div className="dash-skeleton h-10 w-14 rounded-lg" />
              <div className="dash-skeleton h-10 w-14 rounded-lg" />
            </div>
          </div>
        </div>
      </div>

      {/* 2 · Quick Actions (6 icon tiles matching QuickActions) */}
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
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 p-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
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

      {/* 3 · Key Farm Metrics (4 stat cards matching QuickStats) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="dash-card-modern"
            style={{
              background: 'var(--d-card)',
              borderRadius: 14,
              boxShadow: 'var(--d-shadow-card)',
              border: '1px solid var(--d-border)',
              padding: '16px 20px',
            }}
          >
            <div className="flex items-start justify-between mb-2">
              <div className="dash-skeleton h-3 w-20 rounded" />
              <div className="dash-skeleton w-8 h-8 rounded-xl shrink-0" />
            </div>
            <div className="dash-skeleton h-7 w-24 rounded-md mb-2" />
            <div className="dash-skeleton h-3 w-28 rounded" />
          </div>
        ))}
      </div>

      {/* 4 · AI Recommendation Banner */}
      <div
        className="rounded-xl p-4 flex items-center gap-4"
        style={{ background: 'var(--color-surface-2)', border: '1px solid var(--d-border)' }}
      >
        <div className="dash-skeleton w-10 h-10 rounded-xl shrink-0" />
        <div className="space-y-1.5 flex-1">
          <div className="dash-skeleton h-3.5 w-48 rounded" />
          <div className="dash-skeleton h-3 w-3/4 rounded" />
        </div>
      </div>

      {/* 5 · Recent Offers & Deliveries (left) vs Disease & Planting Alerts (right) */}
      <div className="grid lg:grid-cols-2 gap-5 items-start">
        {/* Left Column */}
        <div className="space-y-5">
          {/* Recent Offers Card */}
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
              <div className="dash-skeleton h-4 w-28 rounded" />
              <div className="dash-skeleton h-3 w-16 rounded" />
            </div>
            <div className="divide-y" style={{ borderColor: 'var(--d-border)' }}>
              {[1, 2, 3].map((i) => (
                <div key={i} className="px-5 py-3.5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 flex-1">
                    <div className="dash-skeleton w-8 h-8 rounded-xl shrink-0" />
                    <div className="space-y-1.5 flex-1">
                      <div className="dash-skeleton h-3.5 w-36 rounded" />
                      <div className="dash-skeleton h-2.5 w-24 rounded" />
                    </div>
                  </div>
                  <div className="dash-skeleton h-5 w-20 rounded-full shrink-0" />
                </div>
              ))}
            </div>
          </div>

          {/* My Deliveries Card */}
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
              <div className="dash-skeleton h-4 w-28 rounded" />
              <div className="dash-skeleton h-3 w-16 rounded" />
            </div>
            <div className="divide-y" style={{ borderColor: 'var(--d-border)' }}>
              {[1, 2].map((i) => (
                <div key={i} className="px-5 py-3.5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 flex-1">
                    <div className="dash-skeleton w-8 h-8 rounded-xl shrink-0" />
                    <div className="space-y-1.5 flex-1">
                      <div className="dash-skeleton h-3.5 w-40 rounded" />
                      <div className="dash-skeleton h-2.5 w-28 rounded" />
                    </div>
                  </div>
                  <div className="dash-skeleton h-5 w-20 rounded-full shrink-0" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-5">
          {/* Disease Alerts Card */}
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
            <div className="p-4 space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="p-3 rounded-xl space-y-2" style={{ background: 'var(--color-surface-2)' }}>
                  <div className="dash-skeleton h-4 w-40 rounded" />
                  <div className="dash-skeleton h-3 w-full rounded" />
                  <div className="dash-skeleton h-3 w-2/3 rounded" />
                </div>
              ))}
            </div>
          </div>

          {/* Planting Alerts Card */}
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
            <div className="p-4 space-y-2.5">
              {[1, 2].map((i) => (
                <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg" style={{ background: 'var(--color-surface-2)' }}>
                  <div className="dash-skeleton w-7 h-7 rounded-lg shrink-0" />
                  <div className="space-y-1 flex-1">
                    <div className="dash-skeleton h-3.5 w-32 rounded" />
                    <div className="dash-skeleton h-2.5 w-48 rounded" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 6 · Market Prices + 5-Day Weather Forecast */}
      <div className="grid lg:grid-cols-2 gap-5">
        {/* Market Prices Card */}
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
            <div className="dash-skeleton h-4 w-28 rounded" />
            <div className="dash-skeleton h-3 w-20 rounded" />
          </div>
          <div className="divide-y" style={{ borderColor: 'var(--d-border)' }}>
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="px-5 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="dash-skeleton w-7 h-7 rounded-lg shrink-0" />
                  <div className="dash-skeleton h-3.5 w-24 rounded" />
                </div>
                <div className="flex items-center gap-3">
                  <div className="dash-skeleton h-4 w-20 rounded" />
                  <div className="dash-skeleton h-5 w-14 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 5-Day Weather Forecast Card */}
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
            <div className="dash-skeleton h-4 w-44 rounded" />
          </div>
          <div className="grid grid-cols-5 gap-2 p-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex flex-col items-center gap-2 p-2 rounded-xl" style={{ background: 'var(--color-surface-2)' }}>
                <div className="dash-skeleton h-3 w-8 rounded" />
                <div className="dash-skeleton w-8 h-8 rounded-full" />
                <div className="dash-skeleton h-3.5 w-12 rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 7 · Nearby Drivers Map */}
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

      {/* 8 · Farm Score & Agri News */}
      <div className="grid lg:grid-cols-2 gap-5">
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
          <div className="p-5 space-y-3">
            <div className="dash-skeleton h-9 w-24 rounded-md" />
            <div className="dash-skeleton h-2 w-full rounded-full" />
            <div className="dash-skeleton h-3 w-36 rounded" />
          </div>
        </div>

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
          <div className="p-4 space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="space-y-1.5">
                <div className="dash-skeleton h-3.5 w-3/4 rounded" />
                <div className="dash-skeleton h-2.5 w-1/2 rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>

    </div>
  );
}
