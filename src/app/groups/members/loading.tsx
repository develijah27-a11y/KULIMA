export default function GroupMembersLoading() {
  return (
    <div className="max-w-3xl mx-auto space-y-5 animate-pulse">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="dash-skeleton h-6 w-32 rounded-md mb-2" />
          <div className="dash-skeleton h-4 w-44 rounded-md" />
        </div>
        <div className="dash-skeleton h-9 w-32 rounded-xl" />
      </div>

      {/* Leadership section */}
      <div className="space-y-2">
        <div className="dash-skeleton h-3 w-24 rounded" />
        <div
          style={{ background: 'var(--d-card)', borderRadius: 16, boxShadow: 'var(--d-shadow-card)', border: '1px solid var(--d-border)' }}
          className="divide-y divide-[var(--d-border)] overflow-hidden"
        >
          {[1, 2].map((i) => (
            <div key={i} className="flex items-center gap-3.5 px-5 py-3.5">
              <div className="dash-skeleton w-10 h-10 rounded-full shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="dash-skeleton h-4 w-36 rounded" />
                <div className="dash-skeleton h-3 w-48 rounded" />
              </div>
              <div className="dash-skeleton h-5 w-16 rounded-full" />
              <div className="dash-skeleton w-6 h-6 rounded-md shrink-0" />
            </div>
          ))}
        </div>
      </div>

      {/* General members section */}
      <div className="space-y-2">
        <div className="dash-skeleton h-3 w-28 rounded" />
        <div
          style={{ background: 'var(--d-card)', borderRadius: 16, boxShadow: 'var(--d-shadow-card)', border: '1px solid var(--d-border)' }}
          className="divide-y divide-[var(--d-border)] overflow-hidden"
        >
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-3.5 px-5 py-3">
              <div className="dash-skeleton w-9 h-9 rounded-full shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="dash-skeleton h-3.5 w-32 rounded" />
                  <div className="dash-skeleton h-4 w-16 rounded-full" />
                </div>
                <div className="dash-skeleton h-3 w-40 rounded" />
              </div>
              <div className="dash-skeleton h-4 w-24 rounded" />
              <div className="dash-skeleton w-6 h-6 rounded-md shrink-0" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
