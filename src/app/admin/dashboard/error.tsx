'use client';

export default function AdminDashboardErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="min-h-screen bg-soil flex items-center justify-center">
      <div className="text-center px-6 py-10">
        <p className="text-4xl mb-4">⚠️</p>
        <h2 className="text-lg font-bold text-cream mb-2">Admin Panel Error</h2>
        <p className="text-sm text-cream/40 mb-4 max-w-xs">{error.message}</p>
        <button onClick={() => reset()} className="px-5 py-2.5 bg-sprout text-soil rounded-xl text-sm font-semibold">Try Again</button>
      </div>
    </div>
  );
}
