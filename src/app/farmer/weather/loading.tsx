export default function FarmerWeatherLoading() {
  return (
    <div className="max-w-4xl mx-auto space-y-5 animate-pulse">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <div className="dash-skeleton h-6 w-48 rounded-md mb-2" />
          <div className="dash-skeleton h-4 w-60 rounded-md" />
        </div>
        <div className="dash-skeleton h-10 w-44 rounded-xl" />
      </div>

      {/* Current Conditions Card (5-column metrics) */}
      <div
        style={{
          background: 'var(--d-card)',
          borderRadius: 16,
          boxShadow: 'var(--d-shadow-card)',
          border: '1px solid var(--d-border)',
        }}
        className="overflow-hidden"
      >
        <div className="grid grid-cols-2 md:grid-cols-5 divide-y md:divide-y-0 md:divide-x divide-[var(--d-border)]">
          {/* Main temp */}
          <div className="p-5 col-span-2 md:col-span-1 space-y-3">
            <div className="dash-skeleton h-3 w-28 rounded" />
            <div className="flex items-end gap-2.5">
              <div className="dash-skeleton h-12 w-20 rounded-lg" />
              <div className="dash-skeleton w-9 h-9 rounded-full" />
            </div>
            <div className="dash-skeleton h-4 w-28 rounded" />
            <div className="dash-skeleton h-3 w-20 rounded" />
          </div>

          {/* Humidity */}
          <div className="p-5 space-y-2.5">
            <div className="dash-skeleton h-3 w-16 rounded" />
            <div className="dash-skeleton w-8 h-8 rounded-full" />
            <div className="dash-skeleton h-6 w-14 rounded" />
            <div className="dash-skeleton h-3 w-24 rounded" />
          </div>

          {/* Wind */}
          <div className="p-5 space-y-2.5">
            <div className="dash-skeleton h-3 w-14 rounded" />
            <div className="dash-skeleton w-8 h-8 rounded-full" />
            <div className="dash-skeleton h-6 w-16 rounded" />
            <div className="dash-skeleton h-3 w-24 rounded" />
          </div>

          {/* Precipitation */}
          <div className="p-5 space-y-2.5">
            <div className="dash-skeleton h-3 w-20 rounded" />
            <div className="dash-skeleton w-8 h-8 rounded-full" />
            <div className="dash-skeleton h-6 w-14 rounded" />
            <div className="dash-skeleton h-3 w-24 rounded" />
          </div>

          {/* Topsoil */}
          <div className="p-5 space-y-2.5">
            <div className="dash-skeleton h-3 w-24 rounded" />
            <div className="dash-skeleton w-8 h-8 rounded-full" />
            <div className="dash-skeleton h-6 w-14 rounded" />
            <div className="dash-skeleton h-3 w-24 rounded" />
          </div>
        </div>
      </div>

      {/* 7-Day Daily Forecast Card */}
      <div
        style={{
          background: 'var(--d-card)',
          borderRadius: 16,
          boxShadow: 'var(--d-shadow-card)',
          border: '1px solid var(--d-border)',
        }}
        className="overflow-hidden"
      >
        <div className="px-5 py-4 border-b border-[var(--d-border)]">
          <div className="dash-skeleton h-4 w-40 rounded" />
        </div>
        <div className="divide-y divide-[var(--d-border)]">
          {[1, 2, 3, 4, 5, 6, 7].map((i) => (
            <div key={i} className="px-5 py-3.5 flex items-center justify-between gap-4">
              <div className="dash-skeleton h-4 w-24 rounded shrink-0" />
              <div className="flex items-center gap-2">
                <div className="dash-skeleton w-6 h-6 rounded-full" />
                <div className="dash-skeleton h-3.5 w-32 rounded hidden sm:block" />
              </div>
              <div className="dash-skeleton h-3 w-16 rounded hidden sm:block" />
              <div className="dash-skeleton h-4 w-16 rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
