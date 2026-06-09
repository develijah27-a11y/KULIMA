export default function Loading() {
  return (
    <div className="space-y-5 max-w-4xl mx-auto">
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {[1,2,3].map(i => <div key={i} className="dash-skeleton h-24 rounded-xl" />)}
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="dash-skeleton h-40 rounded-xl" />
        ))}
      </div>
    </div>
  );
}
