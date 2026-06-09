export default function Loading() {
  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      <div className="flex gap-3 items-center">
        <div className="dash-skeleton h-9 w-40 rounded-xl" />
        <div style={{ flex: 1 }} />
        <div className="dash-skeleton h-9 w-32 rounded-xl" />
      </div>
      <div className="flex gap-2 overflow-hidden">
        {[1,2,3,4].map(i => <div key={i} className="dash-skeleton h-8 w-20 rounded-full flex-shrink-0" />)}
      </div>
      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="dash-skeleton h-24 rounded-xl" />
        ))}
      </div>
    </div>
  );
}
