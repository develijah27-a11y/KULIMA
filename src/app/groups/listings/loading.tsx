export default function GroupListingsLoading() {
  return (
    <div className="max-w-3xl mx-auto space-y-5 animate-pulse">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="dash-skeleton h-6 w-40 rounded-md mb-2" />
          <div className="dash-skeleton h-4 w-32 rounded-md" />
        </div>
        <div className="dash-skeleton h-9 w-28 rounded-xl" />
      </div>

      {/* Active Section */}
      <div className="space-y-2">
        <div className="dash-skeleton h-3 w-16 rounded" />
        <div
          style={{ background: 'var(--d-card)', borderRadius: 16, boxShadow: 'var(--d-shadow-card)', border: '1px solid var(--d-border)' }}
          className="divide-y divide-[var(--d-border)] overflow-hidden"
        >
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-3.5 px-5 py-3.5">
              <div className="dash-skeleton w-11 h-11 rounded-xl shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="dash-skeleton h-4 w-28 rounded" />
                <div className="dash-skeleton h-3 w-48 rounded" />
              </div>
              <div className="text-right space-y-1">
                <div className="dash-skeleton h-4 w-24 rounded ml-auto" />
                <div className="dash-skeleton h-2.5 w-10 rounded ml-auto" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Closed Section */}
      <div className="space-y-2 opacity-70">
        <div className="dash-skeleton h-3 w-16 rounded" />
        <div
          style={{ background: 'var(--d-card)', borderRadius: 16, boxShadow: 'var(--d-shadow-card)', border: '1px solid var(--d-border)' }}
          className="divide-y divide-[var(--d-border)] overflow-hidden"
        >
          {[1, 2].map((i) => (
            <div key={i} className="flex items-center gap-3.5 px-5 py-3">
              <div className="flex-1 space-y-2">
                <div className="dash-skeleton h-3.5 w-36 rounded" />
                <div className="dash-skeleton h-3 w-28 rounded" />
              </div>
              <div className="dash-skeleton h-5 w-14 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
