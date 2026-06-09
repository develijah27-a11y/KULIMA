export default function Loading() {
  return (
    <div className="space-y-4 max-w-3xl mx-auto">
      <div className="dash-skeleton h-8 w-40 rounded" />
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="dash-skeleton h-28 rounded-xl" />
        ))}
      </div>
    </div>
  );
}
