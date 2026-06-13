export default function Loading() {
  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div className="space-y-2">
        <div className="dash-skeleton h-7 w-32 rounded-lg" />
        <div className="dash-skeleton h-4 w-48 rounded" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => <div key={i} className="dash-skeleton h-24 rounded-xl" />)}
      </div>
      <div className="dash-skeleton h-64 rounded-xl" />
    </div>
  );
}
