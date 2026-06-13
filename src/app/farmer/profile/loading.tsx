export default function Loading() {
  return (
    <div className="space-y-4 p-1 animate-pulse">
      <div className="flex items-center justify-between mb-2">
        <div className="space-y-2">
          <div className="dash-skeleton h-7 w-48 rounded-lg" />
          <div className="dash-skeleton h-4 w-32 rounded" />
        </div>
        <div className="dash-skeleton h-9 w-28 rounded-xl" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1,2,3,4].map(i => <div key={i} className="dash-skeleton h-24 rounded-xl" />)}
      </div>
      <div className="dash-skeleton h-64 rounded-xl" />
      <div className="grid lg:grid-cols-2 gap-4">
        <div className="dash-skeleton h-48 rounded-xl" />
        <div className="dash-skeleton h-48 rounded-xl" />
      </div>
    </div>
  );
}
