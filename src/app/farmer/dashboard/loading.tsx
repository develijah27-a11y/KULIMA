export default function FarmerDashboardLoading() {
  return (
    <div className="min-h-screen pb-28" style={{ background: 'var(--color-soil)' }}>
      <div className="max-w-lg mx-auto px-4">
        {/* Header */}
        <div className="flex items-center justify-between py-5">
          <div className="space-y-2">
            <div className="skeleton h-3 w-20 rounded-md" />
            <div className="skeleton h-6 w-36 rounded-lg" />
          </div>
          <div className="skeleton w-10 h-10 rounded-2xl" />
        </div>

        <div className="space-y-4">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="skeleton h-24 rounded-2xl" />
            ))}
          </div>

          {/* Quick actions */}
          <div className="skeleton h-28 rounded-2xl" />

          {/* Prices */}
          <div className="skeleton h-48 rounded-2xl" />

          {/* Alerts */}
          <div className="skeleton h-40 rounded-2xl" />
        </div>
      </div>
    </div>
  );
}
