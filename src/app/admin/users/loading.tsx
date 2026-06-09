export default function Loading() {
  return (
    <div className="space-y-4 max-w-5xl mx-auto">
      <div className="flex gap-3">
        <div className="dash-skeleton h-10 flex-1 rounded-xl" />
        <div className="dash-skeleton h-10 w-32 rounded-xl" />
      </div>
      <div className="space-y-2">
        <div className="dash-skeleton h-10 rounded-lg" />
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="dash-skeleton h-14 rounded-lg" />
        ))}
      </div>
    </div>
  );
}
