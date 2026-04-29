'use client';

/**
 * Issue #750 — Data Visualization Dashboard
 * Multiple chart types, real-time updates, interactive tooltips/legends,
 * zoom/pan (Brush), export charts as images, responsive design.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ResponsiveContainer,
  LineChart, Line,
  BarChart, Bar,
  PieChart, Pie, Cell,
  AreaChart, Area,
  ScatterChart, Scatter,
  XAxis, YAxis, ZAxis,
  CartesianGrid, Tooltip, Legend,
  Brush, TooltipProps,
} from 'recharts';
import { Download, RefreshCw, Pause, Play } from 'lucide-react';

// ─── Colour palette ───────────────────────────────────────────────────────────

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

// ─── Mock data generators ─────────────────────────────────────────────────────

function genTrend(points = 12) {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return months.slice(0, points).map((month, i) => ({
    month,
    contributions: Math.round(800 + Math.random() * 600 + i * 40),
    payouts: Math.round(600 + Math.random() * 400 + i * 30),
    members: Math.round(5 + Math.random() * 3 + i * 0.5),
  }));
}

function genPayoutDistribution() {
  return [
    { name: 'On-time', value: 68 },
    { name: 'Late', value: 18 },
    { name: 'Missed', value: 8 },
    { name: 'Pending', value: 6 },
  ];
}

function genScatter(count = 30) {
  return Array.from({ length: count }, () => ({
    contributions: Math.round(100 + Math.random() * 900),
    reliability: Math.round(50 + Math.random() * 50),
    groups: Math.round(1 + Math.random() * 5),
  }));
}

function genGroupPerformance() {
  return ['Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon'].map((name) => ({
    name,
    completion: Math.round(60 + Math.random() * 40),
    members: Math.round(4 + Math.random() * 8),
  }));
}

// ─── Shared tooltip ───────────────────────────────────────────────────────────

const SharedTooltip: React.FC<TooltipProps<number, string>> = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 p-3 shadow-lg text-sm">
      {label && <p className="font-semibold text-gray-900 dark:text-slate-100 mb-1">{label}</p>}
      {payload.map((entry) => (
        <p key={entry.name} style={{ color: entry.color ?? '#6366f1' }}>
          {entry.name}: <span className="font-bold">{entry.value}</span>
        </p>
      ))}
    </div>
  );
};

// ─── Export helper ────────────────────────────────────────────────────────────

async function exportChartAsImage(containerRef: React.RefObject<HTMLDivElement>, filename: string) {
  const el = containerRef.current;
  if (!el) return;
  const svg = el.querySelector('svg');
  if (!svg) return;

  const serializer = new XMLSerializer();
  const svgStr = serializer.serializeToString(svg);
  const blob = new Blob([svgStr], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);

  // Try canvas export for PNG; fall back to SVG download
  try {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = svg.clientWidth || 600;
      canvas.height = svg.clientHeight || 300;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      canvas.toBlob((pngBlob) => {
        if (!pngBlob) return;
        const pngUrl = URL.createObjectURL(pngBlob);
        const a = document.createElement('a');
        a.href = pngUrl;
        a.download = `${filename}.png`;
        a.click();
        URL.revokeObjectURL(pngUrl);
      });
      URL.revokeObjectURL(url);
    };
    img.src = url;
  } catch {
    // Fallback: download SVG
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  }
}

// ─── Chart card wrapper ───────────────────────────────────────────────────────

const ChartCard: React.FC<{
  title: string;
  subtitle?: string;
  filename: string;
  children: React.ReactNode;
}> = ({ title, subtitle, filename, children }) => {
  const ref = useRef<HTMLDivElement>(null);
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-5 shadow-sm">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-slate-100">{title}</h3>
          {subtitle && <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">{subtitle}</p>}
        </div>
        <button
          onClick={() => exportChartAsImage(ref, filename)}
          title="Export as image"
          className="p-1.5 rounded-lg border border-gray-200 dark:border-slate-600 text-gray-400 hover:text-gray-700 dark:hover:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
          aria-label="Export chart as image"
        >
          <Download className="w-3.5 h-3.5" />
        </button>
      </div>
      <div ref={ref}>{children}</div>
    </div>
  );
};

// ─── 1. Contribution Trend (Line/Area with Brush for zoom/pan) ────────────────

const ContributionTrendChart: React.FC<{ data: ReturnType<typeof genTrend> }> = ({ data }) => (
  <ChartCard
    title="Contribution Trend"
    subtitle="Monthly contributions vs payouts — drag brush to zoom"
    filename="contribution-trend"
  >
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={data} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
        <defs>
          <linearGradient id="gradC" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="gradP" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
        <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
        <Tooltip content={<SharedTooltip />} />
        <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
        <Brush dataKey="month" height={20} stroke="#e2e8f0" travellerWidth={6} />
        <Area type="monotone" dataKey="contributions" name="Contributions" stroke="#6366f1" fill="url(#gradC)" strokeWidth={2} />
        <Area type="monotone" dataKey="payouts" name="Payouts" stroke="#10b981" fill="url(#gradP)" strokeWidth={2} />
      </AreaChart>
    </ResponsiveContainer>
  </ChartCard>
);

// ─── 2. Payout Distribution (Pie) ────────────────────────────────────────────

const PayoutDistributionChart: React.FC<{ data: ReturnType<typeof genPayoutDistribution> }> = ({ data }) => (
  <ChartCard title="Payout Distribution" subtitle="Breakdown by status" filename="payout-distribution">
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="45%"
          outerRadius={90}
          innerRadius={50}
          dataKey="value"
          nameKey="name"
          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
          labelLine={false}
        >
          {data.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip formatter={(value: number) => [`${value}%`, 'Share']} />
        <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
      </PieChart>
    </ResponsiveContainer>
  </ChartCard>
);

// ─── 3. Member Activity Scatter ───────────────────────────────────────────────

const MemberActivityChart: React.FC<{ data: ReturnType<typeof genScatter> }> = ({ data }) => (
  <ChartCard
    title="Member Activity"
    subtitle="Contributions vs reliability score (bubble = groups)"
    filename="member-activity-scatter"
  >
    <ResponsiveContainer width="100%" height={280}>
      <ScatterChart margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis
          type="number"
          dataKey="contributions"
          name="Contributions"
          tick={{ fontSize: 11, fill: '#64748b' }}
          axisLine={false}
          tickLine={false}
          label={{ value: 'Contributions (XLM)', position: 'insideBottom', offset: -2, fontSize: 11, fill: '#94a3b8' }}
        />
        <YAxis
          type="number"
          dataKey="reliability"
          name="Reliability"
          tick={{ fontSize: 11, fill: '#64748b' }}
          axisLine={false}
          tickLine={false}
          label={{ value: 'Reliability %', angle: -90, position: 'insideLeft', fontSize: 11, fill: '#94a3b8' }}
        />
        <ZAxis type="number" dataKey="groups" range={[40, 200]} name="Groups" />
        <Tooltip
          cursor={{ strokeDasharray: '3 3' }}
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const d = payload[0].payload;
            return (
              <div className="rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 p-3 shadow-lg text-sm">
                <p className="font-semibold text-gray-900 dark:text-slate-100 mb-1">Member</p>
                <p className="text-gray-600 dark:text-slate-300">Contributions: <b>{d.contributions} XLM</b></p>
                <p className="text-gray-600 dark:text-slate-300">Reliability: <b>{d.reliability}%</b></p>
                <p className="text-gray-600 dark:text-slate-300">Groups: <b>{d.groups}</b></p>
              </div>
            );
          }}
        />
        <Scatter name="Members" data={data} fill="#6366f1" fillOpacity={0.7} />
      </ScatterChart>
    </ResponsiveContainer>
  </ChartCard>
);

// ─── 4. Group Performance (Bar) ───────────────────────────────────────────────

const GroupPerformanceChart: React.FC<{ data: ReturnType<typeof genGroupPerformance> }> = ({ data }) => (
  <ChartCard title="Group Performance" subtitle="Completion rate by group" filename="group-performance">
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
        <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} unit="%" />
        <Tooltip content={<SharedTooltip />} />
        <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="completion" name="Completion %" fill="#6366f1" radius={[4, 4, 0, 0]} />
        <Bar dataKey="members" name="Members" fill="#10b981" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  </ChartCard>
);

// ─── Main DashboardCharts component ──────────────────────────────────────────

interface DashboardChartsProps {
  /** Polling interval in ms for real-time updates. 0 = disabled. */
  realtimeInterval?: number;
}

export const DashboardCharts: React.FC<DashboardChartsProps> = ({
  realtimeInterval = 5000,
}) => {
  const [trendData, setTrendData] = useState(() => genTrend());
  const [payoutData] = useState(() => genPayoutDistribution());
  const [scatterData, setScatterData] = useState(() => genScatter());
  const [groupData, setGroupData] = useState(() => genGroupPerformance());
  const [timeRange, setTimeRange] = useState<'3m' | '6m' | '12m'>('12m');
  const [isLive, setIsLive] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  // Real-time updates: refresh trend + scatter data on interval
  useEffect(() => {
    if (!isLive || realtimeInterval <= 0) return;
    const id = setInterval(() => {
      const points = timeRange === '3m' ? 3 : timeRange === '6m' ? 6 : 12;
      setTrendData(genTrend(points));
      setScatterData(genScatter());
      setGroupData(genGroupPerformance());
      setLastUpdated(new Date());
    }, realtimeInterval);
    return () => clearInterval(id);
  }, [isLive, realtimeInterval, timeRange]);

  // Apply time range filter
  useEffect(() => {
    const points = timeRange === '3m' ? 3 : timeRange === '6m' ? 6 : 12;
    setTrendData(genTrend(points));
  }, [timeRange]);

  const handleRefresh = useCallback(() => {
    setTrendData(genTrend(timeRange === '3m' ? 3 : timeRange === '6m' ? 6 : 12));
    setScatterData(genScatter());
    setGroupData(genGroupPerformance());
    setLastUpdated(new Date());
  }, [timeRange]);

  return (
    <div className="space-y-6">
      {/* Header / controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 px-5 py-3 shadow-sm">
        <div>
          <h2 className="text-base font-bold text-gray-900 dark:text-slate-100">Data Visualization</h2>
          <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Time range */}
          <div className="flex items-center gap-1 bg-gray-100 dark:bg-slate-700 rounded-lg p-1">
            {(['3m', '6m', '12m'] as const).map((r) => (
              <button
                key={r}
                onClick={() => setTimeRange(r)}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                  timeRange === r
                    ? 'bg-white dark:bg-slate-600 text-indigo-600 dark:text-indigo-400 shadow-sm'
                    : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300'
                }`}
              >
                {r}
              </button>
            ))}
          </div>

          {/* Live toggle */}
          <button
            onClick={() => setIsLive((v) => !v)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
              isLive
                ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-400'
                : 'border-gray-200 dark:border-slate-600 text-gray-500 dark:text-slate-400'
            }`}
            aria-pressed={isLive}
          >
            {isLive ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
            {isLive ? 'Live' : 'Paused'}
          </button>

          {/* Manual refresh */}
          <button
            onClick={handleRefresh}
            title="Refresh data"
            className="p-1.5 rounded-lg border border-gray-200 dark:border-slate-600 text-gray-400 hover:text-gray-700 dark:hover:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Charts grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ContributionTrendChart data={trendData} />
        <PayoutDistributionChart data={payoutData} />
        <MemberActivityChart data={scatterData} />
        <GroupPerformanceChart data={groupData} />
      </div>
    </div>
  );
};

export default DashboardCharts;
