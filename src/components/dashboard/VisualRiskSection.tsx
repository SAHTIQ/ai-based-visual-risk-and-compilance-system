import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Eye,
  Layers,
  Info,
  RefreshCw,
  Search,
} from 'lucide-react';
import { api } from '../../services/api';
import type { RiskOverview, RiskTrendPoint, RiskDetection } from '../../types';

export const VisualRiskSection: React.FC = () => {
  const [overview, setOverview] = useState<RiskOverview | null>(null);
  const [trendPoints, setTrendPoints] = useState<RiskTrendPoint[]>([]);
  const [detections, setDetections] = useState<RiskDetection[]>([]);
  const [days, setDays] = useState<number>(366);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'violations' | 'active'>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [showFormulaTooltip, setShowFormulaTooltip] = useState<boolean>(false);

  const fetchData = async () => {
    try {
      const [ov, tr, dt] = await Promise.all([
        api.getRiskOverview(),
        api.getRiskTrends(days),
        api.getRiskDetections({ limit: 25 }),
      ]);
      setOverview(ov);
      setTrendPoints(tr);
      setDetections(dt);
    } catch (err) {
      console.error('Failed to load risk intelligence:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    setIsLoading(true);
    fetchData();
  }, [days]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchData();
  };

  const filteredDetections = detections.filter((d) => {
    if (selectedFilter === 'violations' && !d.is_violation) return false;
    if (selectedFilter === 'active' && d.status !== 'active') return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      return (
        d.detected_object.toLowerCase().includes(q) ||
        d.rule_code.toLowerCase().includes(q) ||
        d.rule_description.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-900/50';
      case 'mitigated':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900/50';
      case 'investigating':
        return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900/50';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
    }
  };

  const getRiskBadge = (level: string) => {
    switch (level?.toLowerCase()) {
      case 'high':
        return 'bg-red-100 text-red-800 border-red-300 dark:bg-red-900/50 dark:text-red-300';
      case 'medium':
      case 'elevated':
        return 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/50 dark:text-amber-300';
      default:
        return 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-900/50 dark:text-emerald-300';
    }
  };

  return (
    <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm space-y-6">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400">
              <Eye className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Visual Risk & Compliance Intelligence
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Automated computer vision audit feed, hazard detection, and safety compliance monitoring
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Time range selector */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-xl p-1 text-xs">
            <button
              onClick={() => setDays(30)}
              className={`px-3 py-1.5 rounded-lg font-medium transition ${
                days === 30
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              30 Days
            </button>
            <button
              onClick={() => setDays(90)}
              className={`px-3 py-1.5 rounded-lg font-medium transition ${
                days === 90
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              90 Days
            </button>
            <button
              onClick={() => setDays(366)}
              className={`px-3 py-1.5 rounded-lg font-medium transition ${
                days === 366
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Full Year (2025–2026)
            </button>
          </div>

          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
            title="Refresh Inspection Data"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Risk Status */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 p-4">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
            <span>Current Risk Status</span>
            <ShieldAlert className="w-4 h-4 text-slate-400" />
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span
              className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border ${getRiskBadge(
                overview?.risk_level_code || 'low'
              )}`}
            >
              {overview?.current_risk_status || 'Evaluating...'}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2">
            Last evaluated: {overview?.last_inspection_date || 'No logs recorded'}
          </p>
        </div>

        {/* 2. Active Hazards */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 p-4">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
            <span>Active Hazards</span>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
            {overview?.active_hazards_count ?? 0}
          </h3>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            Requires immediate inspection or mitigation
          </p>
        </div>

        {/* 3. Total Detections & Violations */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 p-4">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
            <span>Visual Inspections</span>
            <Layers className="w-4 h-4 text-blue-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
              {overview?.total_detections ?? 0}
            </h3>
            <span className="text-xs text-red-600 font-medium">
              ({overview?.recent_violations ?? 0} violations)
            </span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            Detections logged in current evaluation window
          </p>
        </div>

        {/* 4. Compliance Rate */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 p-4 relative">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
            <div className="flex items-center gap-1">
              <span>Compliance Rate</span>
              <button
                type="button"
                onClick={() => setShowFormulaTooltip(!showFormulaTooltip)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                title="View compliance calculation formula"
              >
                <Info className="w-3.5 h-3.5" />
              </button>
            </div>
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
          </div>
          <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
            {overview?.total_detections === 0 ? (
              <span className="text-sm font-semibold text-slate-400">N/A — No Inspections</span>
            ) : (
              `${overview?.compliance_rate_pct ?? 0}%`
            )}
          </h3>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            Status: <span className="font-semibold text-slate-700 dark:text-slate-200">{overview?.compliance_status || 'N/A'}</span>
          </p>

          {/* Formula Tooltip / Explanation popover */}
          {showFormulaTooltip && (
            <div className="absolute left-0 right-0 top-full mt-2 p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg z-20 text-xs text-slate-700 dark:text-slate-300">
              <p className="font-bold text-slate-900 dark:text-white mb-1">Standardized Compliance Formula</p>
              <code className="block bg-slate-100 dark:bg-slate-800 p-1.5 rounded text-[11px] font-mono text-blue-600 dark:text-blue-400 mb-1.5">
                Rate (%) = ((Total Detections - Violations) / Total Detections) × 100
              </code>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                When 0 detections are recorded, the system accurately displays &quot;N/A — No Inspections&quot; rather than an artificial 0% or 100%.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Visual Risk Trend Chart (SVG) */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Historical Risk Score & Violation Trajectory ({days === 366 ? 'Full Year 2025–2026' : `Last ${days} Days`})
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Composite safety score grounded in detection volume, hazard severity, and mitigation speed
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs text-slate-500">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span> Risk Score
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span> Violations
            </span>
          </div>
        </div>

        {isLoading ? (
          <div className="h-44 flex items-center justify-center text-xs text-slate-400">
            Loading inspection trends...
          </div>
        ) : trendPoints.length > 0 ? (
          <div className="h-44 w-full flex items-end gap-1 pt-4 pb-2 px-1 overflow-x-auto">
            {trendPoints.slice(-30).map((pt, i) => {
              const maxScore = Math.max(...trendPoints.map((p) => p.risk_score), 100);
              const heightPct = Math.min(100, Math.max(8, (pt.risk_score / maxScore) * 100));
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative min-w-[20px]">
                  <div
                    style={{ height: `${heightPct}%` }}
                    className={`w-full rounded-t transition-all ${
                      pt.violations_count > 0 ? 'bg-red-400 hover:bg-red-500' : 'bg-blue-400 hover:bg-blue-500'
                    }`}
                  ></div>
                  <span className="text-[9px] text-slate-400 truncate max-w-full">
                    {pt.label || pt.date.slice(5)}
                  </span>

                  {/* Tooltip */}
                  <div className="hidden group-hover:block absolute bottom-full mb-2 bg-slate-900 text-white text-[10px] p-2 rounded-lg shadow-lg whitespace-nowrap z-20 pointer-events-none">
                    <p className="font-semibold">{pt.date}</p>
                    <p>Risk Score: {pt.risk_score}</p>
                    <p>Violations: {pt.violations_count}</p>
                    <p>Detections: {pt.detections_count}</p>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="h-32 flex items-center justify-center text-xs text-slate-400">
            No historical trend records found for this period.
          </div>
        )}
      </div>

      {/* Detections Feed Table */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Visual Inspection Audit Log
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Live automated detections with rule codes, confidence levels, and mitigation statuses
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search object or rule..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-xl p-0.5 text-xs">
              <button
                onClick={() => setSelectedFilter('all')}
                className={`px-2.5 py-1 rounded-lg transition ${
                  selectedFilter === 'all'
                    ? 'bg-white dark:bg-slate-900 font-semibold text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setSelectedFilter('violations')}
                className={`px-2.5 py-1 rounded-lg transition ${
                  selectedFilter === 'violations'
                    ? 'bg-white dark:bg-slate-900 font-semibold text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Violations
              </button>
              <button
                onClick={() => setSelectedFilter('active')}
                className={`px-2.5 py-1 rounded-lg transition ${
                  selectedFilter === 'active'
                    ? 'bg-white dark:bg-slate-900 font-semibold text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Active
              </button>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-2.5 px-3.5">Detected Hazard / Object</th>
                  <th className="py-2.5 px-3.5">Rule Violation Code</th>
                  <th className="py-2.5 px-3.5">Risk Level</th>
                  <th className="py-2.5 px-3.5">Model Confidence</th>
                  <th className="py-2.5 px-3.5">Status</th>
                  <th className="py-2.5 px-3.5">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                {filteredDetections.length > 0 ? (
                  filteredDetections.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition">
                      <td className="py-2.5 px-3.5 font-medium text-slate-900 dark:text-white">
                        <div className="flex items-center gap-2">
                          {row.is_violation ? (
                            <span className="w-2 h-2 rounded-full bg-red-500 shrink-0"></span>
                          ) : (
                            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
                          )}
                          <span>{row.detected_object}</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3.5 font-mono text-[11px] text-blue-600 dark:text-blue-400">
                        {row.rule_code}
                      </td>
                      <td className="py-2.5 px-3.5">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${getRiskBadge(
                            row.risk_level
                          )}`}
                        >
                          {row.risk_level}
                        </span>
                      </td>
                      <td className="py-2.5 px-3.5 font-mono">
                        {row.confidence_pct ? `${row.confidence_pct.toFixed(1)}%` : `${(row.confidence * 100).toFixed(1)}%`}
                      </td>
                      <td className="py-2.5 px-3.5">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-medium border capitalize ${getStatusBadge(
                            row.status
                          )}`}
                        >
                          {row.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3.5 text-slate-400 text-[11px]">
                        {row.detected_at?.replace('T', ' ').slice(0, 16) || 'Recent'}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-xs text-slate-400">
                      No inspection detections match the selected filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
};
