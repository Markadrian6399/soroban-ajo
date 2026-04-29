'use client';

// Issue #750 — Data Visualization Dashboard page
import { DashboardCharts } from '@/components/dashboard/DashboardCharts';

export default function DashboardChartsPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <DashboardCharts realtimeInterval={5000} />
      </div>
    </div>
  );
}
