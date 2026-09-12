import React from 'react';

export function DashboardWelcomeHeroSkeleton() {
  return (
    <div
      className="relative overflow-hidden rounded-2xl border"
      style={{
        background: 'var(--d-card)',
        borderColor: 'var(--color-border-mid)',
        boxShadow: '0 4px 20px -2px rgba(15, 23, 42, 0.06), 0 1px 3px rgba(0, 0, 0, 0.04)',
        padding: 'clamp(18px, 4vw, 26px)',
      }}
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="space-y-3 min-w-0 flex-1">
          {/* Top badge pills */}
          <div className="flex items-center gap-2.5">
            <div className="dash-skeleton h-6 w-32 rounded-full" />
            <div className="dash-skeleton h-6 w-28 rounded-full" />
          </div>

          {/* Heading and subtext */}
          <div className="space-y-1.5">
            <div className="dash-skeleton h-8 w-64 rounded-lg" />
            <div className="dash-skeleton h-4 w-44 rounded-md" />
          </div>

          {/* Date & Location chips */}
          <div className="flex items-center gap-3 pt-0.5">
            <div className="dash-skeleton h-7 w-36 rounded-lg" />
            <div className="dash-skeleton h-7 w-32 rounded-lg" />
          </div>
        </div>

        {/* Action button skeleton */}
        <div className="dash-skeleton h-10 w-36 rounded-xl shrink-0 self-start md:self-center" />
      </div>
    </div>
  );
}
