'use client';

// Issue #751 — Customizable Dashboard page
import { CustomizableDashboard } from '@/components/dashboard/CustomizableDashboard';

export default function CustomizeDashboardPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Customizable Dashboard</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Drag, resize, and arrange widgets. Choose a layout preset or build your own.
          </p>
        </div>
        <CustomizableDashboard />
      </div>
    </div>
  );
}
