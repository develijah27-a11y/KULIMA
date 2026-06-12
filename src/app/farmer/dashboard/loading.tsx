import { DashboardSkeleton } from '@/components/ui/OptimizedSkeleton';

/**
 * Optimized loading state for farmer dashboard
 * Uses GPU-accelerated skeleton components
 */
export default function FarmerDashboardLoading() {
  return (
    <div className="space-y-5 max-w-5xl mx-auto">
      <DashboardSkeleton />
    </div>
  );
}
