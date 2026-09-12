export default function FarmerMarketplaceLoading() {
  return (
    <div className="max-w-4xl mx-auto space-y-5 animate-pulse">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="dash-skeleton h-6 w-36 rounded-md mb-2" />
          <div className="dash-skeleton h-4 w-52 rounded-md" />
        </div>
        <div className="dash-skeleton h-9 w-32 rounded-xl" />
      </div>

      {/* Filter pills */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="dash-skeleton h-8 w-20 rounded-full shrink-0" />
        ))}
      </div>

      {/* 2-Column Grid of Produce Listing Cards */}
      <div className="grid sm:grid-cols-2 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            style={{
              background: 'var(--d-card)',
              borderRadius: 16,
              boxShadow: 'var(--d-shadow-card)',
              border: '1px solid var(--d-border)',
            }}
            className="overflow-hidden flex flex-col"
          >
            {/* Photo banner */}
            <div className="dash-skeleton h-[120px] w-full relative">
              <div className="absolute top-2.5 left-2.5 dash-skeleton h-5 w-16 rounded-full bg-white/40" />
            </div>

            {/* Body */}
            <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
              <div className="space-y-1.5">
                <div className="dash-skeleton h-4 w-32 rounded" />
                <div className="dash-skeleton h-3 w-48 rounded" />
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-[var(--d-border)]">
                <div className="dash-skeleton h-3 w-28 rounded" />
                <div className="dash-skeleton h-4 w-20 rounded" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
