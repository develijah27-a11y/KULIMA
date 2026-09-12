export default function FarmerPricesLoading() {
  return (
    <div className="max-w-4xl mx-auto space-y-5 animate-pulse">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="dash-skeleton h-6 w-44 rounded-md mb-2" />
          <div className="dash-skeleton h-4 w-60 rounded-md" />
        </div>
        {/* Region tabs */}
        <div className="flex gap-2">
          <div className="dash-skeleton h-9 w-32 rounded-xl" />
          <div className="dash-skeleton h-9 w-28 rounded-xl" />
          <div className="dash-skeleton h-9 w-28 rounded-xl" />
        </div>
      </div>

      {/* Filter bar card */}
      <div style={{ background: 'var(--d-card)', borderRadius: 16, boxShadow: 'var(--d-shadow-card)', padding: '16px 20px', border: '1px solid var(--d-border)' }}>
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[140px] space-y-1.5">
            <div className="dash-skeleton h-3 w-16 rounded" />
            <div className="dash-skeleton h-9 w-full rounded-lg" />
          </div>
          <div className="flex-1 min-w-[140px] space-y-1.5">
            <div className="dash-skeleton h-3 w-14 rounded" />
            <div className="dash-skeleton h-9 w-full rounded-lg" />
          </div>
          <div className="dash-skeleton h-9 w-20 rounded-lg" />
        </div>
      </div>

      {/* Local market prices card */}
      <div style={{ background: 'var(--d-card)', borderRadius: 16, boxShadow: 'var(--d-shadow-card)', border: '1px solid var(--d-border)' }} className="overflow-hidden">
        <div className="px-5 py-3.5 border-b border-[var(--d-border)] flex justify-between items-center">
          <div className="dash-skeleton h-4 w-40 rounded" />
          <div className="dash-skeleton h-3 w-32 rounded" />
        </div>
        <div className="divide-y divide-[var(--d-border)]">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="px-5 py-3.5 flex items-center gap-3">
              <div className="dash-skeleton w-10 h-10 rounded-xl shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="dash-skeleton h-4 w-32 rounded" />
                <div className="dash-skeleton h-3 w-48 rounded" />
              </div>
              <div className="text-right space-y-1">
                <div className="dash-skeleton h-5 w-24 rounded ml-auto" />
                <div className="dash-skeleton h-2.5 w-16 rounded ml-auto" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Cash Crop section */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="dash-skeleton h-4 w-44 rounded" />
          <div className="dash-skeleton h-5 w-28 rounded-md" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} style={{ background: 'var(--d-card)', borderRadius: 14, padding: '16px', border: '1px solid var(--d-border)' }} className="space-y-3">
              <div className="flex justify-between">
                <div className="dash-skeleton h-4 w-28 rounded" />
                <div className="dash-skeleton h-4 w-12 rounded-full" />
              </div>
              <div className="dash-skeleton h-6 w-32 rounded" />
              <div className="dash-skeleton h-3 w-24 rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
