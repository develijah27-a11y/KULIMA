export default function Loading() {
  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div className="space-y-2">
        <div className="dash-skeleton h-7 w-48 rounded-lg" />
        <div className="dash-skeleton h-4 w-64 rounded" />
      </div>
      <div className="dash-skeleton h-20 rounded-xl" />
      <div className="grid md:grid-cols-2 gap-4">
        {[1, 2, 3, 4].map(i => <div key={i} className="dash-skeleton h-40 rounded-xl" />)}
      </div>
    </div>
  );
}
