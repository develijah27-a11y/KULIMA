'use client';

export default function Loading() {
  return <SkeletonLoader />;
}

function SkeletonLoader() {
  return (
    <div className="min-h-screen bg-soil pb-24">
      <main className="max-w-lg mx-auto px-4 pt-4 space-y-4">
        <div className="h-16 rounded-2xl skeleton" />
        <div className="h-44 rounded-2xl skeleton" />
        <div className="grid grid-cols-2 gap-3">
          <div className="h-24 rounded-2xl skeleton" />
          <div className="h-24 rounded-2xl skeleton" />
        </div>
        <div className="h-36 rounded-2xl skeleton" />
        <div className="h-52 rounded-2xl skeleton" />
        <div className="h-44 rounded-2xl skeleton" />
      </main>
    </div>
  );
}
