export default function FarmerDashboardLoading() {
  return (
    <div className="space-y-5 max-w-5xl mx-auto">

      {/* Weather card */}
      <div className="dash-skeleton h-36 rounded-xl" />

      {/* Quick stats (4) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => <div key={i} className="dash-skeleton h-28 rounded-xl" />)}
      </div>

      {/* AI recommendation */}
      <div className="dash-skeleton h-20 rounded-xl" />

      {/* Market prices + Weather forecast (2-col) */}
      <div className="grid lg:grid-cols-2 gap-5">
        <div className="dash-skeleton h-72 rounded-xl" />
        <div className="dash-skeleton h-72 rounded-xl" />
      </div>

      {/* Recent offers + Disease alerts (2-col) */}
      <div className="grid lg:grid-cols-2 gap-5">
        <div className="dash-skeleton h-64 rounded-xl" />
        <div className="dash-skeleton h-64 rounded-xl" />
      </div>

      {/* Planting alerts */}
      <div className="dash-skeleton h-48 rounded-xl" />

      {/* Finance overview */}
      <div className="dash-skeleton h-40 rounded-xl" />

      {/* Quick actions */}
      <div className="dash-skeleton h-28 rounded-xl" />

    </div>
  );
}
