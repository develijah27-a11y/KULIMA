export default function Loading() {
  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[1,2,3,4].map(i => <div key={i} className="dash-skeleton h-20 rounded-xl" />)}
      </div>
      <div className="flex gap-2 overflow-hidden">
        {[1,2,3,4,5,6].map(i => <div key={i} className="dash-skeleton h-8 w-20 rounded-full flex-shrink-0" />)}
      </div>
      <div className="space-y-2">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="dash-skeleton h-16 rounded-xl" />
        ))}
      </div>
    </div>
  );
}
