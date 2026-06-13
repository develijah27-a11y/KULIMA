export default function Loading() {
  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="dash-skeleton h-7 w-40 rounded-lg" />
          <div className="dash-skeleton h-4 w-24 rounded" />
        </div>
        <div className="dash-skeleton h-9 w-32 rounded-xl" />
      </div>
      <div className="grid grid-cols-4 gap-3">
        {[1, 2, 3, 4].map(i => <div key={i} className="dash-skeleton h-16 rounded-xl" />)}
      </div>
      <div className="dash-skeleton h-72 rounded-xl" />
    </div>
  );
}
