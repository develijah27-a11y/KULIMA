export default function FarmerDashboardLoading() {
  return (
    <div className="space-y-5 max-w-5xl mx-auto">
      <div className="dash-skeleton h-36 rounded-xl" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1,2,3,4].map(i => <div key={i} className="dash-skeleton h-28 rounded-xl" />)}
      </div>
      <div className="dash-skeleton h-20 rounded-xl" />
      <div className="grid lg:grid-cols-2 gap-5">
        <div className="dash-skeleton h-72 rounded-xl" />
        <div className="dash-skeleton h-72 rounded-xl" />
      </div>
      <div className="grid lg:grid-cols-2 gap-5">
        <div className="dash-skeleton h-64 rounded-xl" />
        <div className="dash-skeleton h-64 rounded-xl" />
      </div>
      <div className="dash-skeleton h-40 rounded-xl" />
      <div className="dash-skeleton h-36 rounded-xl" />
    </div>
  );
}
