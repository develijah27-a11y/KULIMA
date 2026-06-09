export default function Loading() {
  return (
    <div className="space-y-4 max-w-lg mx-auto">
      <div className="dash-skeleton h-36 rounded-2xl" />
      <div className="grid grid-cols-2 gap-3">
        <div className="dash-skeleton h-12 rounded-xl" />
        <div className="dash-skeleton h-12 rounded-xl" />
      </div>
      <div className="dash-skeleton h-4 w-32 rounded" />
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <div className="dash-skeleton h-10 w-10 rounded-full flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="dash-skeleton h-3 w-40" />
            <div className="dash-skeleton h-2 w-24" />
          </div>
          <div className="dash-skeleton h-4 w-16" />
        </div>
      ))}
    </div>
  );
}
