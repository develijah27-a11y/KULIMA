export default function Loading() {
  return (
    <div className="space-y-4 max-w-3xl mx-auto">
      <div className="flex gap-2">
        {[1,2,3].map(i => <div key={i} className="dash-skeleton h-8 w-24 rounded-full flex-shrink-0" />)}
      </div>
      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="dash-skeleton h-20 rounded-xl" />
        ))}
      </div>
    </div>
  );
}
