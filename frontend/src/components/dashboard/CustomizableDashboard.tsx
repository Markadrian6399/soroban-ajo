'use client';

/**
 * Issue #751 — Customizable Dashboard
 * Drag-and-drop widgets, resizable panels, layout presets, persistence, reset to default.
 */

import React, { useState, useCallback, useEffect } from 'react';
import { Responsive, WidthProvider, Layout } from 'react-grid-layout';
import { motion, AnimatePresence } from 'framer-motion';
import {
  GripVertical, X, Plus, RotateCcw, LayoutGrid,
  BarChart2, Activity, Zap, TrendingUp, Users, Wallet,
} from 'lucide-react';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

const ResponsiveGridLayout = WidthProvider(Responsive);

// ─── Types ────────────────────────────────────────────────────────────────────

export type WidgetType = 'stats' | 'chart' | 'activity' | 'quick-actions' | 'members' | 'balance';

export interface DashboardWidget {
  id: string;
  type: WidgetType;
  title: string;
  position: { x: number; y: number; w: number; h: number };
}

export type LayoutPreset = 'default' | 'compact' | 'analytics' | 'minimal';

// ─── Preset definitions ───────────────────────────────────────────────────────

const PRESETS: Record<LayoutPreset, { label: string; widgets: DashboardWidget[] }> = {
  default: {
    label: 'Default',
    widgets: [
      { id: 'stats-1', type: 'stats', title: 'Total Contributions', position: { x: 0, y: 0, w: 4, h: 3 } },
      { id: 'balance-1', type: 'balance', title: 'Balance', position: { x: 4, y: 0, w: 4, h: 3 } },
      { id: 'members-1', type: 'members', title: 'Members', position: { x: 8, y: 0, w: 4, h: 3 } },
      { id: 'chart-1', type: 'chart', title: 'Contribution Trend', position: { x: 0, y: 3, w: 8, h: 4 } },
      { id: 'activity-1', type: 'activity', title: 'Recent Activity', position: { x: 8, y: 3, w: 4, h: 4 } },
      { id: 'quick-actions-1', type: 'quick-actions', title: 'Quick Actions', position: { x: 0, y: 7, w: 12, h: 3 } },
    ],
  },
  compact: {
    label: 'Compact',
    widgets: [
      { id: 'stats-1', type: 'stats', title: 'Total Contributions', position: { x: 0, y: 0, w: 3, h: 2 } },
      { id: 'balance-1', type: 'balance', title: 'Balance', position: { x: 3, y: 0, w: 3, h: 2 } },
      { id: 'members-1', type: 'members', title: 'Members', position: { x: 6, y: 0, w: 3, h: 2 } },
      { id: 'quick-actions-1', type: 'quick-actions', title: 'Quick Actions', position: { x: 9, y: 0, w: 3, h: 2 } },
      { id: 'activity-1', type: 'activity', title: 'Recent Activity', position: { x: 0, y: 2, w: 12, h: 3 } },
    ],
  },
  analytics: {
    label: 'Analytics',
    widgets: [
      { id: 'chart-1', type: 'chart', title: 'Contribution Trend', position: { x: 0, y: 0, w: 8, h: 5 } },
      { id: 'stats-1', type: 'stats', title: 'Total Contributions', position: { x: 8, y: 0, w: 4, h: 2 } },
      { id: 'balance-1', type: 'balance', title: 'Balance', position: { x: 8, y: 2, w: 4, h: 3 } },
      { id: 'activity-1', type: 'activity', title: 'Recent Activity', position: { x: 0, y: 5, w: 6, h: 4 } },
      { id: 'members-1', type: 'members', title: 'Members', position: { x: 6, y: 5, w: 6, h: 4 } },
    ],
  },
  minimal: {
    label: 'Minimal',
    widgets: [
      { id: 'stats-1', type: 'stats', title: 'Total Contributions', position: { x: 0, y: 0, w: 6, h: 3 } },
      { id: 'activity-1', type: 'activity', title: 'Recent Activity', position: { x: 6, y: 0, w: 6, h: 3 } },
    ],
  },
};

const WIDGET_LIBRARY: { type: WidgetType; title: string; icon: React.ReactNode; defaultSize: { w: number; h: number } }[] = [
  { type: 'stats', title: 'Stats', icon: <BarChart2 className="w-4 h-4" />, defaultSize: { w: 4, h: 3 } },
  { type: 'chart', title: 'Chart', icon: <TrendingUp className="w-4 h-4" />, defaultSize: { w: 8, h: 4 } },
  { type: 'activity', title: 'Activity', icon: <Activity className="w-4 h-4" />, defaultSize: { w: 4, h: 4 } },
  { type: 'quick-actions', title: 'Quick Actions', icon: <Zap className="w-4 h-4" />, defaultSize: { w: 6, h: 3 } },
  { type: 'members', title: 'Members', icon: <Users className="w-4 h-4" />, defaultSize: { w: 4, h: 3 } },
  { type: 'balance', title: 'Balance', icon: <Wallet className="w-4 h-4" />, defaultSize: { w: 4, h: 3 } },
];

const STORAGE_KEY = 'customizable-dashboard-layout';

// ─── Widget content renderers ─────────────────────────────────────────────────

const widgetContent: Record<WidgetType, React.FC> = {
  stats: () => (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <span className="text-sm text-gray-500 dark:text-gray-400">Total Contributions</span>
        <span className="text-2xl font-bold text-gray-900 dark:text-white">1,234</span>
      </div>
      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: '75%' }}
          transition={{ duration: 1 }}
          className="bg-indigo-500 h-2 rounded-full"
        />
      </div>
      <p className="text-xs text-gray-400">75% of monthly goal</p>
    </div>
  ),
  chart: () => (
    <div className="flex items-end gap-1 h-20">
      {[40, 65, 50, 80, 60, 90, 70].map((h, i) => (
        <motion.div
          key={i}
          initial={{ height: 0 }}
          animate={{ height: `${h}%` }}
          transition={{ duration: 0.5, delay: i * 0.07 }}
          className="flex-1 bg-indigo-400 dark:bg-indigo-500 rounded-t"
        />
      ))}
    </div>
  ),
  activity: () => (
    <div className="space-y-2">
      {['Alice contributed 50 XLM', 'Bob joined the group', 'Payout distributed'].map((item, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.1 }}
          className="flex items-center gap-2 text-sm"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
          <span className="text-gray-700 dark:text-gray-300 truncate">{item}</span>
        </motion.div>
      ))}
    </div>
  ),
  'quick-actions': () => (
    <div className="flex flex-wrap gap-2">
      {['Contribute', 'Invite', 'View Details', 'Settings'].map((label) => (
        <button
          key={label}
          className="px-3 py-1.5 text-xs font-medium bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
        >
          {label}
        </button>
      ))}
    </div>
  ),
  members: () => (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-500 dark:text-gray-400">Active Members</span>
        <span className="font-bold text-gray-900 dark:text-white">8 / 10</span>
      </div>
      <div className="flex -space-x-2">
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 border-2 border-white dark:border-gray-900 flex items-center justify-center text-xs text-white font-bold"
          >
            {String.fromCharCode(65 + i)}
          </div>
        ))}
      </div>
    </div>
  ),
  balance: () => (
    <div className="space-y-1">
      <p className="text-xs text-gray-500 dark:text-gray-400">Group Balance</p>
      <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">4,200 XLM</p>
      <p className="text-xs text-gray-400">≈ $1,260 USD</p>
    </div>
  ),
};

// ─── Widget card ──────────────────────────────────────────────────────────────

const WidgetCard: React.FC<{
  widget: DashboardWidget;
  onRemove: (id: string) => void;
  isEditing: boolean;
}> = ({ widget, onRemove, isEditing }) => {
  const Content = widgetContent[widget.type];
  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className={`flex items-center justify-between px-4 py-2.5 border-b border-gray-100 dark:border-gray-800 ${isEditing ? 'cursor-move' : ''}`}>
        <div className="flex items-center gap-2">
          {isEditing && <GripVertical className="w-4 h-4 text-gray-400" />}
          <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">{widget.title}</span>
        </div>
        {isEditing && (
          <button
            onClick={() => onRemove(widget.id)}
            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-red-500 transition-colors"
            aria-label={`Remove ${widget.title}`}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      <div className="flex-1 p-4 overflow-auto">
        <Content />
      </div>
    </div>
  );
};

// ─── Main component ───────────────────────────────────────────────────────────

interface CustomizableDashboardProps {
  storageKey?: string;
}

export const CustomizableDashboard: React.FC<CustomizableDashboardProps> = ({
  storageKey = STORAGE_KEY,
}) => {
  const [widgets, setWidgets] = useState<DashboardWidget[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [showLibrary, setShowLibrary] = useState(false);
  const [activePreset, setActivePreset] = useState<LayoutPreset>('default');
  const [mounted, setMounted] = useState(false);

  // Load persisted layout or default
  useEffect(() => {
    setMounted(true);
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved) as { preset: LayoutPreset; widgets: DashboardWidget[] };
        setWidgets(parsed.widgets);
        setActivePreset(parsed.preset);
      } else {
        setWidgets(PRESETS.default.widgets);
      }
    } catch {
      setWidgets(PRESETS.default.widgets);
    }
  }, [storageKey]);

  const persist = useCallback((preset: LayoutPreset, ws: DashboardWidget[]) => {
    localStorage.setItem(storageKey, JSON.stringify({ preset, widgets: ws }));
  }, [storageKey]);

  const handleLayoutChange = useCallback((layout: Layout[]) => {
    setWidgets((prev) => {
      const updated = prev.map((w) => {
        const l = layout.find((li) => li.i === w.id);
        return l ? { ...w, position: { x: l.x, y: l.y, w: l.w, h: l.h } } : w;
      });
      persist(activePreset, updated);
      return updated;
    });
  }, [activePreset, persist]);

  const handleRemoveWidget = useCallback((id: string) => {
    setWidgets((prev) => {
      const updated = prev.filter((w) => w.id !== id);
      persist(activePreset, updated);
      return updated;
    });
  }, [activePreset, persist]);

  const handleAddWidget = useCallback((type: WidgetType) => {
    const lib = WIDGET_LIBRARY.find((w) => w.type === type)!;
    const newWidget: DashboardWidget = {
      id: `${type}-${Date.now()}`,
      type,
      title: lib.title,
      position: { x: 0, y: Infinity, w: lib.defaultSize.w, h: lib.defaultSize.h },
    };
    setWidgets((prev) => {
      const updated = [...prev, newWidget];
      persist(activePreset, updated);
      return updated;
    });
    setShowLibrary(false);
  }, [activePreset, persist]);

  const handleApplyPreset = useCallback((preset: LayoutPreset) => {
    const ws = PRESETS[preset].widgets;
    setActivePreset(preset);
    setWidgets(ws);
    persist(preset, ws);
  }, [persist]);

  const handleReset = useCallback(() => {
    handleApplyPreset('default');
  }, [handleApplyPreset]);

  const gridLayout = widgets.map((w) => ({
    i: w.id,
    x: w.position.x,
    y: w.position.y,
    w: w.position.w,
    h: w.position.h,
    static: !isEditing,
  }));

  if (!mounted) return null;

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 px-4 py-3">
        <div className="flex items-center gap-2">
          <LayoutGrid className="w-4 h-4 text-indigo-500" />
          <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">Dashboard</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Preset selector */}
          <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
            {(Object.keys(PRESETS) as LayoutPreset[]).map((preset) => (
              <button
                key={preset}
                onClick={() => handleApplyPreset(preset)}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                  activePreset === preset
                    ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                {PRESETS[preset].label}
              </button>
            ))}
          </div>

          {/* Edit toggle */}
          <button
            onClick={() => { setIsEditing((v) => !v); setShowLibrary(false); }}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
              isEditing
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
            }`}
          >
            {isEditing ? 'Done' : 'Customize'}
          </button>

          {/* Add widget */}
          {isEditing && (
            <button
              onClick={() => setShowLibrary((v) => !v)}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Widget
            </button>
          )}

          {/* Reset */}
          <button
            onClick={handleReset}
            title="Reset to default"
            className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Widget library panel */}
      <AnimatePresence>
        {showLibrary && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
                Widget Library
              </p>
              <div className="flex flex-wrap gap-2">
                {WIDGET_LIBRARY.map((lib) => (
                  <button
                    key={lib.type}
                    onClick={() => handleAddWidget(lib.type)}
                    className="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:border-indigo-300 dark:hover:border-indigo-700 text-gray-700 dark:text-gray-300 transition-colors"
                  >
                    {lib.icon}
                    {lib.title}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Grid */}
      {widgets.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center bg-white dark:bg-gray-900 rounded-xl border border-dashed border-gray-300 dark:border-gray-700">
          <LayoutGrid className="w-10 h-10 text-gray-300 dark:text-gray-600 mb-3" />
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">No widgets yet</p>
          <button
            onClick={() => { setIsEditing(true); setShowLibrary(true); }}
            className="mt-3 px-4 py-2 text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
          >
            Add Widgets
          </button>
        </div>
      ) : (
        <ResponsiveGridLayout
          className="layout"
          layouts={{ lg: gridLayout }}
          onLayoutChange={handleLayoutChange}
          breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
          cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
          rowHeight={60}
          isDraggable={isEditing}
          isResizable={isEditing}
          compactType="vertical"
          useCSSTransforms
        >
          {widgets.map((widget) => (
            <div key={widget.id}>
              <WidgetCard
                widget={widget}
                onRemove={handleRemoveWidget}
                isEditing={isEditing}
              />
            </div>
          ))}
        </ResponsiveGridLayout>
      )}
    </div>
  );
};

export default CustomizableDashboard;
