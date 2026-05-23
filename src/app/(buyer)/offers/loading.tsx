'use client';

export default function Loading() {
  return (
    <div className="min-h-screen bg-soil flex items-center justify-center">
      <div className="text-center">
        <div className="w-10 h-10 border-4 border-surface2 border-t-sprout rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm text-cream/40">Loading offers…</p>
      </div>
    </div>
  );
}
