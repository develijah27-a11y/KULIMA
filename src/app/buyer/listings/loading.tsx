export default function Loading() {
  return (
    <div className="space-y-4 max-w-5xl mx-auto">
      <div className="dash-skeleton h-10 w-64 rounded-xl" />
      <div className="flex gap-3">
        <div className="dash-skeleton h-10 flex-1 rounded-xl" />
        <div className="dash-skeleton h-10 w-28 rounded-xl" />
        <div className="dash-skeleton h-10 w-28 rounded-xl" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} className="space-y-3 p-4 rounded-2xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111118]">
            <div className="dash-skeleton h-32 rounded-xl" />
            <div className="dash-skeleton h-4 w-3/4" />
            <div className="dash-skeleton h-3 w-1/2" />
            <div className="dash-skeleton h-8 rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  );
}
