export default function AdminDashboardLoading() {
  return (
    <div className="space-y-5 max-w-6xl mx-auto">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <div className="dash-skeleton h-6 w-64 rounded-lg" />
          <div className="dash-skeleton h-4 w-48 rounded-lg" />
        </div>
        <div className="dash-skeleton h-4 w-44 rounded-lg" />
      </div>

      {/* Alert banner (conditional) */}

      {/* KPIs (6) */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="dash-skeleton h-24 rounded-xl" />)}
      </div>

      {/* Admin tools */}
      <div>
        <div className="dash-skeleton h-3 w-24 rounded mb-3" />
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(i => <div key={i} className="dash-skeleton h-[72px] rounded-xl" />)}
        </div>
      </div>

      {/* Growth + Role Breakdown (2-col) */}
      <div className="grid lg:grid-cols-2 gap-5">
        <div className="dash-skeleton h-48 rounded-xl" />
        <div className="dash-skeleton h-48 rounded-xl" />
      </div>

      {/* Recent registrations + Pending actions (3:1 split) */}
      <div className="grid lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 dash-skeleton h-80 rounded-xl" />
        <div className="dash-skeleton h-80 rounded-xl" />
      </div>

      {/* Marketplace + Districts (3:2 split) */}
      <div className="grid lg:grid-cols-5 gap-5">
        <div className="lg:col-span-3 dash-skeleton h-72 rounded-xl" />
        <div className="lg:col-span-2 dash-skeleton h-72 rounded-xl" />
      </div>

      {/* Market prices + System health */}
      <div className="grid lg:grid-cols-2 gap-5">
        <div className="dash-skeleton h-56 rounded-xl" />
        <div className="dash-skeleton h-56 rounded-xl" />
      </div>

    </div>
  );
}
