export default function GroupWalletLoading() {
  return (
    <div className="max-w-xl mx-auto space-y-5 animate-pulse">
      {/* Header */}
      <div>
        <div className="dash-skeleton h-6 w-36 rounded-md mb-2" />
        <div className="dash-skeleton h-4 w-64 rounded-md" />
      </div>

      {/* Debit Wallet Card Skeleton */}
      <div
        style={{
          background: 'linear-gradient(135deg, rgba(22,101,52,0.4) 0%, rgba(5,46,22,0.6) 100%)',
          borderRadius: 20,
          border: '1px solid var(--d-border)',
          padding: '24px 20px',
        }}
        className="space-y-4"
      >
        <div className="flex justify-between items-center">
          <div className="dash-skeleton h-4 w-28 rounded bg-white/20" />
          <div className="dash-skeleton h-6 w-16 rounded-full bg-white/20" />
        </div>
        <div className="space-y-2">
          <div className="dash-skeleton h-3 w-20 rounded bg-white/15" />
          <div className="dash-skeleton h-8 w-48 rounded-lg bg-white/25" />
          <div className="dash-skeleton h-3.5 w-36 rounded bg-white/15" />
        </div>
        <div className="pt-2 flex gap-3">
          <div className="dash-skeleton h-9 flex-1 rounded-xl bg-white/20" />
          <div className="dash-skeleton h-9 flex-1 rounded-xl bg-white/20" />
          <div className="dash-skeleton h-9 flex-1 rounded-xl bg-white/20" />
        </div>
      </div>

      {/* Period totals */}
      <div className="grid grid-cols-2 gap-3">
        <div style={{ background: 'var(--d-card)', borderRadius: 14, boxShadow: 'var(--d-shadow-card)', padding: '14px 16px', border: '1px solid var(--d-border)' }}>
          <div className="dash-skeleton h-2.5 w-20 rounded mb-2" />
          <div className="dash-skeleton h-5 w-28 rounded" />
        </div>
        <div style={{ background: 'var(--d-card)', borderRadius: 14, boxShadow: 'var(--d-shadow-card)', padding: '14px 16px', border: '1px solid var(--d-border)' }}>
          <div className="dash-skeleton h-2.5 w-24 rounded mb-2" />
          <div className="dash-skeleton h-5 w-28 rounded" />
        </div>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-2 gap-2.5">
        {[1, 2].map((i) => (
          <div
            key={i}
            style={{ background: 'var(--d-card)', borderRadius: 14, boxShadow: 'var(--d-shadow-card)', padding: '14px 16px', border: '1px solid var(--d-border)' }}
            className="flex items-center gap-2.5"
          >
            <div className="dash-skeleton w-8 h-8 rounded-lg shrink-0" />
            <div className="space-y-1.5">
              <div className="dash-skeleton h-3.5 w-24 rounded" />
              <div className="dash-skeleton h-2.5 w-16 rounded" />
            </div>
          </div>
        ))}
      </div>

      {/* Transactions History */}
      <div style={{ background: 'var(--d-card)', borderRadius: 16, boxShadow: 'var(--d-shadow-card)', border: '1px solid var(--d-border)' }}>
        <div className="px-5 py-4 border-b border-[var(--d-border)]">
          <div className="dash-skeleton h-4 w-44 rounded" />
        </div>
        <div className="divide-y divide-[var(--d-border)]">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-3.5 px-5 py-3.5">
              <div className="dash-skeleton w-9 h-9 rounded-full shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="dash-skeleton h-3.5 w-32 rounded" />
                <div className="dash-skeleton h-2.5 w-24 rounded" />
              </div>
              <div className="text-right space-y-1">
                <div className="dash-skeleton h-4 w-24 rounded ml-auto" />
                <div className="dash-skeleton h-2.5 w-12 rounded-full ml-auto" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
