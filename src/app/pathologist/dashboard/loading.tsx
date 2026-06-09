export default function Loading() {
  return (
    <div className="space-y-5 max-w-4xl mx-auto">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1,2,3,4].map(i => <div key={i} className="dash-skeleton h-24 rounded-xl" />)}
      </div>
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="dash-skeleton h-20 rounded-xl" />
        ))}
      </div>
    </div>
  );
}
