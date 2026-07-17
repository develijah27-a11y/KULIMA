export default function Loading() {
  return (
    <div className="space-y-5 max-w-5xl mx-auto">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <div className="dash-skeleton h-6 w-40 rounded-lg" />
          <div className="dash-skeleton h-4 w-40 rounded-lg" />
        </div>
        <div className="dash-skeleton h-9 w-32 rounded-xl" />
      </div>

      {/* Stats (4) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => <div key={i} className="dash-skeleton h-28 rounded-xl" />)}
      </div>

      {/* Quick Actions */}
      <div className="dash-skeleton h-48 rounded-xl" />

      {/* Case Queue + Disease Alerts (2-col) */}
      <div className="grid lg:grid-cols-2 gap-5">
        <div className="dash-skeleton h-[450px] rounded-xl" />
        <div className="dash-skeleton h-80 rounded-xl" />
      </div>

      {/* Recent Scans + Outbreak Map (2-col) */}
      <div className="grid lg:grid-cols-2 gap-5">
        <div className="dash-skeleton h-[360px] rounded-xl" />
        <div className="dash-skeleton h-60 rounded-xl" />
      </div>

    </div>
  );
}
