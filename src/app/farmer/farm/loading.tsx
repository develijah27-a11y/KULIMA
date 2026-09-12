export default function FarmerFarmLoading() {
  return (
    <div className="max-w-4xl mx-auto space-y-5 animate-pulse">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="dash-skeleton h-6 w-32 rounded-md mb-2" />
          <div className="dash-skeleton h-4 w-44 rounded-md" />
        </div>
        <div className="flex gap-2">
          <div className="dash-skeleton h-9 w-24 rounded-xl" />
          <div className="dash-skeleton h-9 w-28 rounded-xl" />
        </div>
      </div>

      {/* 3 Stats (Farms, Hectares, Mapped) */}
      <div className="grid grid-cols-3 gap-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            style={{ background: 'var(--d-card)', borderRadius: 12, boxShadow: 'var(--d-shadow-card)', padding: '14px 16px', border: '1px solid var(--d-border)' }}
          >
            <div className="dash-skeleton h-7 w-12 rounded mb-1" />
            <div className="dash-skeleton h-3 w-14 rounded" />
          </div>
        ))}
      </div>

      {/* Farm Map card */}
      <div
        style={{ background: 'var(--d-card)', borderRadius: 16, boxShadow: 'var(--d-shadow-card)', border: '1px solid var(--d-border)' }}
        className="overflow-hidden"
      >
        <div className="px-5 py-3.5 border-b border-[var(--d-border)] flex justify-between items-center">
          <div className="dash-skeleton h-4 w-24 rounded" />
          <div className="dash-skeleton h-3 w-36 rounded" />
        </div>
        <div className="dash-skeleton h-72 w-full" />
      </div>

      {/* Farm list card */}
      <div
        style={{ background: 'var(--d-card)', borderRadius: 16, boxShadow: 'var(--d-shadow-card)', border: '1px solid var(--d-border)' }}
        className="divide-y divide-[var(--d-border)] overflow-hidden"
      >
        {[1, 2].map((i) => (
          <div key={i} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2.5">
                <div className="dash-skeleton h-4 w-40 rounded" />
                <div className="dash-skeleton h-5 w-16 rounded-full" />
              </div>
              <div className="dash-skeleton h-3 w-56 rounded" />
              <div className="flex gap-1.5 pt-1">
                <div className="dash-skeleton h-5 w-14 rounded-md" />
                <div className="dash-skeleton h-5 w-14 rounded-md" />
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <div className="dash-skeleton h-8 w-20 rounded-lg" />
              <div className="dash-skeleton h-8 w-24 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
