import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Brain,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Database,
  Gauge,
  HelpCircle,
  History,
  Layers,
  Minus,
  Orbit,
  Plus,
  RefreshCw,
  RotateCcw,
  Save,
  ShieldAlert,
  ShieldCheck,
  Sliders,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Trash2,
  Zap,
} from 'lucide-react';
import { Card } from '../components/common/Card';
import { PageHeader } from '../components/layout/PageHeader';
import { api } from '../services/api';
import type {
  BaselineMetrics,
  SimulationHistoryItem,
  SimulationResponse,
  SimulationScenario,
  WhatIfParameters,
} from '../types';

const scenarioMeta = {
  best: { label: 'Best Case Scenario', color: '#16A34A', icon: TrendingUp, tone: 'border-emerald-500/30 bg-emerald-500/5' },
  expected: { label: 'Most Likely Scenario', color: '#2563EB', icon: Orbit, tone: 'border-blue-500/30 bg-blue-500/5' },
  risk: { label: 'Caution Scenario', color: '#DC2626', icon: TrendingDown, tone: 'border-red-500/30 bg-red-500/5' },
} as const;

const HORIZON_OPTIONS = [
  { days: 30, label: '30 Days', short: '30D' },
  { days: 90, label: '90 Days', short: '90D' },
  { days: 180, label: '6 Months', short: '6M' },
  { days: 365, label: '1 Year', short: '1Y' },
] as const;

function formatCurrency(val: number | null | undefined): string {
  if (val === null || val === undefined) return '—';
  return `₹${Math.round(val).toLocaleString('en-IN')}`;
}

function formatNumber(val: number | null | undefined, suffix = '', decimals = 1): string {
  if (val === null || val === undefined) return '—';
  return `${val.toFixed(decimals)}${suffix}`;
}

// Interactive Multi-Metric Trajectory Chart with Hover Tooltip
function MultiHorizonTrajectoryChart({
  scenarios,
  horizonDays,
}: {
  scenarios: SimulationResponse['scenarios'];
  horizonDays: number;
}) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const width = 1000;
  const height = 300;
  const pad = { left: 55, right: 25, top: 25, bottom: 40 };

  const activeScenarios = Object.values(scenarios);
  if (!activeScenarios.length || !activeScenarios[0]?.daily_values?.length) {
    return <div className="h-[280px] flex items-center justify-center text-sm text-text-secondary">No trajectory is available.</div>;
  }

  const stepCount = activeScenarios[0].daily_values.length;
  const allScores = activeScenarios.flatMap((s) => s.daily_values.map((d) => d.productivity_score));
  const min = Math.max(0, Math.min(...allScores) - 5);
  const max = Math.min(100, Math.max(...allScores) + 5);

  const x = (index: number) => pad.left + (index / Math.max(1, stepCount - 1)) * (width - pad.left - pad.right);
  const y = (val: number) => pad.top + ((max - val) / Math.max(max - min, 1)) * (height - pad.top - pad.bottom);
  const path = (scenario: SimulationScenario) =>
    scenario.daily_values.map((d, i) => `${i === 0 ? 'M' : 'L'} ${x(i)} ${y(d.productivity_score)}`).join(' ');

  const hoveredStep = hoverIndex !== null && activeScenarios[0].daily_values[hoverIndex] ? activeScenarios[0].daily_values[hoverIndex] : null;

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-[300px] select-none"
        role="img"
        aria-label={`${horizonDays}-day multi-scenario trajectory comparison`}
        onMouseLeave={() => setHoverIndex(null)}
      >
        {/* Y-Axis Grid & Labels */}
        {[0, 1, 2, 3, 4].map((tick) => {
          const value = min + ((max - min) * (4 - tick)) / 4;
          return (
            <g key={tick}>
              <line x1={pad.left} x2={width - pad.right} y1={y(value)} y2={y(value)} stroke="var(--chart-grid)" strokeDasharray="3 3" />
              <text x={pad.left - 10} y={y(value) + 4} textAnchor="end" fontSize="11" fill="var(--chart-axis)">
                {value.toFixed(0)}
              </text>
            </g>
          );
        })}

        {/* Lines */}
        {(Object.keys(scenarioMeta) as Array<keyof typeof scenarioMeta>).map((key) => {
          if (!scenarios[key]) return null;
          return (
            <path
              key={key}
              d={path(scenarios[key])}
              fill="none"
              stroke={scenarioMeta[key].color}
              strokeWidth="2.5"
              strokeLinecap="round"
              className="transition-all duration-300"
            />
          );
        })}

        {/* Hover Crosshair */}
        {hoverIndex !== null && (
          <line
            x1={x(hoverIndex)}
            x2={x(hoverIndex)}
            y1={pad.top}
            y2={height - pad.bottom}
            stroke="var(--color-primary)"
            strokeWidth="1.5"
            strokeDasharray="4 4"
          />
        )}

        {/* Hover Points & Interactive Hit Targets */}
        {Array.from({ length: stepCount }).map((_, idx) => (
          <g key={idx}>
            <rect
              x={x(idx) - (width - pad.left - pad.right) / stepCount / 2}
              y={pad.top}
              width={(width - pad.left - pad.right) / stepCount}
              height={height - pad.top - pad.bottom}
              fill="transparent"
              className="cursor-pointer"
              onMouseEnter={() => setHoverIndex(idx)}
            />
            {hoverIndex === idx &&
              (Object.keys(scenarioMeta) as Array<keyof typeof scenarioMeta>).map((key) => {
                const day = scenarios[key]?.daily_values[idx];
                if (!day) return null;
                return (
                  <circle
                    key={key}
                    cx={x(idx)}
                    cy={y(day.productivity_score)}
                    r="5"
                    fill={scenarioMeta[key].color}
                    stroke="var(--color-surface)"
                    strokeWidth="2"
                  />
                );
              })}
          </g>
        ))}

        {/* X-Axis Ticks */}
        {[0, Math.floor(stepCount * 0.33), Math.floor(stepCount * 0.66), stepCount - 1].map((idx) => {
          const day = activeScenarios[0]?.daily_values[idx];
          const label = day ? `Day ${Math.round(((idx + 1) / stepCount) * horizonDays)}` : `Step ${idx + 1}`;
          return (
            <text key={idx} x={x(idx)} y={height - 12} textAnchor="middle" fontSize="11" fill="var(--chart-axis)">
              {label}
            </text>
          );
        })}
      </svg>

      {/* Floating Interactive Hover Tooltip */}
      {hoveredStep && (
        <div className="mt-2 p-3 bg-muted/90 rounded-lg border border-border backdrop-blur flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-2 font-medium">
            <Clock className="w-3.5 h-3.5 text-primary" />
            <span>Timeline Inspection: {hoveredStep.date}</span>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-text-secondary">
            {hoveredStep.savings !== null && hoveredStep.savings !== undefined && (
              <span>Savings: <strong className="text-text-primary">{formatCurrency(hoveredStep.savings)}</strong></span>
            )}
            {hoveredStep.monthly_spending !== null && hoveredStep.monthly_spending !== undefined && (
              <span>Spending: <strong className="text-text-primary">{formatCurrency(hoveredStep.monthly_spending)}</strong></span>
            )}
            {hoveredStep.burnout_pct !== null && hoveredStep.burnout_pct !== undefined && (
              <span>Stress: <strong className="text-text-primary">{hoveredStep.burnout_pct}%</strong></span>
            )}
            {hoveredStep.wellbeing_score !== null && hoveredStep.wellbeing_score !== undefined && (
              <span>Well-being: <strong className="text-text-primary">{hoveredStep.wellbeing_score}/100</strong></span>
            )}
            {hoveredStep.emergency_runway_months !== null && hoveredStep.emergency_runway_months !== undefined && (
              <span>Safety Cushion: <strong className="text-text-primary">{hoveredStep.emergency_runway_months} mo</strong></span>
            )}
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap gap-5 text-xs text-text-secondary mt-3">
        {(Object.keys(scenarioMeta) as Array<keyof typeof scenarioMeta>).map((key) => (
          <span key={key} className="inline-flex items-center gap-2">
            <span className="w-6 h-1 rounded" style={{ background: scenarioMeta[key].color }} />
            {scenarioMeta[key].label}
          </span>
        ))}
      </div>
    </div>
  );
}

// Scenario Card (Best Case, Most Likely, Caution)
function ScenarioCard({ scenario, type }: { scenario: SimulationScenario; type: keyof typeof scenarioMeta }) {
  const meta = scenarioMeta[type];
  const Icon = meta.icon;
  return (
    <Card className={`border ${meta.tone} flex flex-col justify-between`}>
      <div>
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Icon className="w-4 h-4" style={{ color: meta.color }} />
              <h3 className="font-semibold text-text-primary text-base">{scenario.name}</h3>
            </div>
            <p className="text-xs text-text-secondary mt-1.5">{scenario.summary.outcome}</p>
          </div>
          <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-surface border border-border text-text-secondary whitespace-nowrap">
            {scenario.confidence === null ? 'Estimating' : `${Math.round(scenario.confidence * 100)}% confidence`}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-border/60 text-center">
          <div className="p-2 rounded bg-surface/50">
            <p className="text-[10px] text-text-secondary uppercase">Daily Score</p>
            <p className="text-sm font-bold text-text-primary mt-0.5">{formatNumber(scenario.summary.projected_average_productivity)}</p>
          </div>
          <div className="p-2 rounded bg-surface/50">
            <p className="text-[10px] text-text-secondary uppercase">Savings</p>
            <p className="text-sm font-bold text-text-primary mt-0.5">{formatCurrency(scenario.summary.projected_savings)}</p>
          </div>
          <div className="p-2 rounded bg-surface/50">
            <p className="text-[10px] text-text-secondary uppercase">Stress Level</p>
            <p className="text-sm font-bold text-text-primary mt-0.5">{formatNumber(scenario.summary.projected_burnout, '%')}</p>
          </div>
        </div>

        {scenario.supporting_factors.length > 0 && (
          <div className="mt-3 space-y-1">
            {scenario.supporting_factors.map((f, i) => (
              <p key={i} className="text-[11px] text-text-secondary flex items-center gap-1.5">
                <span className="w-1 h-1 rounded-full bg-primary" /> {f}
              </p>
            ))}
          </div>
        )}
      </div>

      <div className="mt-4 pt-3 border-t border-border/60">
        <p className="text-xs text-text-primary leading-relaxed">
          <span className="font-semibold text-primary">Actionable Advice: </span>
          {scenario.recommendation}
        </p>
      </div>
    </Card>
  );
}

export const Simulation: React.FC = () => {
  const navigate = useNavigate();
  const [result, setResult] = useState<SimulationResponse | null>(null);
  const [baseline, setBaseline] = useState<BaselineMetrics | null>(null);
  const [history, setHistory] = useState<SimulationHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [simulating, setSimulating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Custom What-If Form Controls
  const [studyLoad, setStudyLoad] = useState<number>(32);
  const [sleepHrs, setSleepHrs] = useState<number>(7.8);
  const [spending, setSpending] = useState<number>(8500);
  const [exerciseDays, setExerciseDays] = useState<number>(3);
  const [horizonDays, setHorizonDays] = useState<number>(30);

  // Expandable Section Toggles
  const [showWhyRec, setShowWhyRec] = useState<boolean>(false);
  const [showRuleTrace, setShowRuleTrace] = useState<boolean>(false);
  const [showEvidence, setShowEvidence] = useState<boolean>(false);
  const [showHistory, setShowHistory] = useState<boolean>(false);
  const [savedSuccessMsg, setSavedSuccessMsg] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [baseData, simData, histData] = await Promise.all([
        api.getSimulationBaseline(),
        api.getFutureSimulation(),
        api.getSimulationHistory().catch(() => []),
      ]);

      setBaseline(baseData);
      setResult(simData);
      setHistory(histData);

      // Initialize What-If fields from real baseline
      setStudyLoad(baseData.study_load_hrs_week);
      setSleepHrs(baseData.sleep_hrs_night);
      setSpending(baseData.monthly_spending);
      setExerciseDays(baseData.exercise_days_week);
      setHorizonDays(simData.simulation_period || 30);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to initialize simulation.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRunSimulation = async (saveRecord = false) => {
    setSimulating(true);
    setError(null);
    setSavedSuccessMsg(null);
    try {
      const params: WhatIfParameters = {
        study_load_hrs_week: studyLoad,
        sleep_hrs_night: sleepHrs,
        monthly_spending: spending,
        exercise_days_week: exerciseDays,
        horizon_days: horizonDays,
      };

      const res = await api.runCustomSimulation(params, saveRecord);
      setResult(res);
      if (res.baseline) {
        setBaseline(res.baseline);
      }

      if (saveRecord) {
        setSavedSuccessMsg('Simulation successfully saved to your personal history.');
        const updatedHist = await api.getSimulationHistory();
        setHistory(updatedHist);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to execute custom simulation.');
    } finally {
      setSimulating(false);
    }
  };

  const handleResetToBaseline = () => {
    if (!baseline) return;
    setStudyLoad(baseline.study_load_hrs_week);
    setSleepHrs(baseline.sleep_hrs_night);
    setSpending(baseline.monthly_spending);
    setExerciseDays(baseline.exercise_days_week);
    setHorizonDays(30);
  };

  const handleDeleteHistory = async (id: number) => {
    try {
      await api.deleteSimulationHistoryItem(id);
      setHistory((prev) => prev.filter((h) => h.id !== id));
    } catch (err) {
      setError('Unable to delete history entry.');
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <PageHeader
        title="Future Simulation & What-If Planner"
        description="See how small changes in your study habits, sleep, spending, and exercise shape your future wellbeing and savings in simple, easy-to-understand terms."
        actions={
          <button
            onClick={() =>
              navigate('/ai-assistant', {
                state: {
                  prompt: `Explain my latest future routine simulation (${horizonDays}-day horizon, Expected outcome: ${result?.scenarios.expected.summary.outcome || 'Routine maintained'}). What are the key tradeoff factors and recommendations?`,
                },
              })
            }
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20 transition-colors shadow-2xs"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Ask AI about this</span>
          </button>
        }
      />

      {/* Dataset & Baseline Status Bar */}
      {baseline && (
        <Card className="border-border/80 bg-surface/60 backdrop-blur">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                  baseline.data_status === 'valid'
                    ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                    : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                }`}
              >
                {baseline.data_status === 'valid' ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
                {baseline.data_status === 'valid' ? 'Data Status: Ready' : 'Need More Records'}
              </span>
              <span className="text-xs text-text-secondary">
                Records Analyzed: <strong className="text-text-primary">{baseline.records_used}</strong>
              </span>
              <span className="text-xs text-text-secondary">
                Historical Range: <strong className="text-text-primary">{baseline.data_range_start || 'N/A'} → {baseline.data_range_end || 'N/A'}</strong>
              </span>
              <span className="text-xs text-text-secondary">
                Baseline Record: <strong className="text-text-primary">{baseline.baseline_date || 'Latest'}</strong>
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowHistory(!showHistory)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-button text-xs font-medium border border-border hover:bg-muted text-text-secondary transition"
              >
                <History className="w-3.5 h-3.5" />
                History ({history.length})
              </button>
              <button
                type="button"
                onClick={loadData}
                disabled={loading}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-button text-xs font-medium border border-border hover:bg-muted text-text-secondary transition disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                Sync Baseline
              </button>
            </div>
          </div>
        </Card>
      )}

      {/* Persistent Simulation History Drawer / Collapsible Section */}
      {showHistory && (
        <Card className="border-primary/30 bg-muted/40">
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-primary" />
              <h3 className="font-semibold text-text-primary text-sm">Personal Simulation History</h3>
            </div>
            <button
              type="button"
              onClick={() => setShowHistory(false)}
              className="text-xs text-text-secondary hover:text-text-primary"
            >
              Close
            </button>
          </div>

          {history.length === 0 ? (
            <p className="py-6 text-center text-xs text-text-secondary">No saved simulations yet. Click "Save to History" when running a scenario.</p>
          ) : (
            <div className="mt-3 space-y-2 max-h-60 overflow-y-auto pr-1">
              {history.map((item) => (
                <div key={item.id} className="p-2.5 rounded bg-surface border border-border flex items-center justify-between gap-3 text-xs">
                  <div>
                    <div className="flex items-center gap-2">
                      <strong className="text-text-primary">{item.scenario_name}</strong>
                      <span className="px-1.5 py-0.2 rounded bg-muted text-[10px] text-text-secondary">{item.horizon_days} Days</span>
                      <span className="text-[10px] text-text-secondary">{item.created_at.replace('T', ' ').substring(0, 16)}</span>
                    </div>
                    <p className="text-[11px] text-text-secondary mt-1 truncate max-w-xl">{item.recommendation}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleDeleteHistory(item.id)}
                      className="p-1 text-text-secondary hover:text-red-500 rounded transition"
                      title="Delete saved run"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Loading & Error States */}
      {loading && (
        <Card><p className="py-14 text-center text-sm text-text-secondary">Extracting baseline metrics from your actual data…</p></Card>
      )}

      {!loading && error && (
        <Card>
          <div className="py-8 text-center">
            <AlertTriangle className="w-7 h-7 mx-auto text-red-500" />
            <p className="mt-2 font-medium text-text-primary text-sm">Simulation Error</p>
            <p className="text-xs text-text-secondary mt-1">{error}</p>
          </div>
        </Card>
      )}

      {/* Insufficient Evidence Warning Banner */}
      {!loading && result && result.evidence_status === 'insufficient_evidence' && (
        <Card className="border-amber-500/40 bg-amber-500/10">
          <div className="flex items-start gap-4 p-2">
            <ShieldAlert className="w-8 h-8 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <h2 className="text-base font-bold text-amber-500">INSUFFICIENT EVIDENCE</h2>
              <p className="text-xs text-text-primary mt-1 leading-relaxed">
                {result.note} The system does not have enough completed historical records to reliably simulate multi-factor future projections.
                Human review is recommended instead of producing a misleading result.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Main Simulation View */}
      {!loading && result && result.evidence_status === 'valid' && baseline && (
        <>
          {/* FEATURE 1 — WHERE YOU STAND TODAY (BASELINE CARD) */}
          <Card className="border-border">
            <div className="flex items-center justify-between pb-3 border-b border-border mb-4">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-primary" />
                <h2 className="font-semibold text-text-primary text-base">Where You Stand Today (Your Current Baseline)</h2>
              </div>
              <span className="text-xs text-text-secondary">Source: Your Real Records</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
              <div className="p-3 rounded-lg bg-muted/60 border border-border">
                <p className="text-[11px] text-text-secondary font-medium uppercase">Current Savings</p>
                <p className="text-base font-bold text-text-primary mt-1">{formatCurrency(baseline.savings)}</p>
                <span className="text-[10px] text-text-secondary">Available in bank</span>
              </div>

              <div className="p-3 rounded-lg bg-muted/60 border border-border">
                <p className="text-[11px] text-text-secondary font-medium uppercase">Monthly Spending</p>
                <p className="text-base font-bold text-text-primary mt-1">{formatCurrency(baseline.monthly_spending)}</p>
                <span className="text-[10px] text-text-secondary">Monthly expenses</span>
              </div>

              <div className="p-3 rounded-lg bg-muted/60 border border-border">
                <p className="text-[11px] text-text-secondary font-medium uppercase">Study Load</p>
                <p className="text-base font-bold text-text-primary mt-1">{formatNumber(baseline.study_load_hrs_week, ' hrs/wk')}</p>
                <span className="text-[10px] text-text-secondary">Focus time per week</span>
              </div>

              <div className="p-3 rounded-lg bg-muted/60 border border-border">
                <p className="text-[11px] text-text-secondary font-medium uppercase">Sleep</p>
                <p className="text-base font-bold text-text-primary mt-1">{formatNumber(baseline.sleep_hrs_night, ' hrs/nt')}</p>
                <span className="text-[10px] text-text-secondary">Hours per night</span>
              </div>

              <div className="p-3 rounded-lg bg-muted/60 border border-border">
                <p className="text-[11px] text-text-secondary font-medium uppercase">Stress & Fatigue</p>
                <p className={`text-base font-bold mt-1 ${baseline.burnout_pct > 50 ? 'text-red-500' : 'text-emerald-500'}`}>
                  {formatNumber(baseline.burnout_pct, '%')}
                </p>
                <span className="text-[10px] text-text-secondary">Risk level</span>
              </div>

              <div className="p-3 rounded-lg bg-muted/60 border border-border">
                <p className="text-[11px] text-text-secondary font-medium uppercase">Well-being</p>
                <p className="text-base font-bold text-primary mt-1">{formatNumber(baseline.wellbeing_score, '/100')}</p>
                <span className="text-[10px] text-text-secondary">Health & mood score</span>
              </div>

              <div className="p-3 rounded-lg bg-muted/60 border border-border">
                <p className="text-[11px] text-text-secondary font-medium uppercase">Safety Cushion</p>
                <p className={`text-base font-bold mt-1 ${baseline.emergency_runway_months < 3 ? 'text-amber-500' : 'text-text-primary'}`}>
                  {formatNumber(baseline.emergency_runway_months, ' mo')}
                </p>
                <span className="text-[10px] text-text-secondary">Months you can survive</span>
              </div>
            </div>
          </Card>

          {/* FEATURE 2 & FEATURE 4 — CUSTOM WHAT-IF SIMULATOR & HORIZON CONTROLS */}
          <Card className="border-primary/40">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
              <div>
                <div className="flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-primary" />
                  <h2 className="font-semibold text-text-primary text-base">Adjust Your Lifestyle Habits & Financial Plan</h2>
                </div>
                <p className="text-xs text-text-secondary mt-1">
                  Move the sliders below to see how your life and finances will look in 30 days, 90 days, 6 months, or 1 year.
                </p>
              </div>

              {/* Simulation Horizon Selector */}
              <div className="flex items-center gap-1.5 bg-muted p-1 rounded-lg border border-border">
                <span className="text-[11px] font-medium text-text-secondary px-2">Horizon:</span>
                {HORIZON_OPTIONS.map((opt) => (
                  <button
                    key={opt.days}
                    type="button"
                    onClick={() => setHorizonDays(opt.days)}
                    className={`px-2.5 py-1 rounded text-xs font-semibold transition ${
                      horizonDays === opt.days
                        ? 'bg-primary text-white shadow-sm'
                        : 'text-text-secondary hover:text-text-primary hover:bg-surface'
                    }`}
                  >
                    {opt.short}
                  </button>
                ))}
              </div>
            </div>

            {/* Interactive Inputs */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mt-5">
              {/* Study Load */}
              <div className="p-3.5 rounded-lg bg-muted/40 border border-border space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-text-primary">Study Load</span>
                  <span className="font-bold text-primary">{studyLoad} hrs/week</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setStudyLoad((prev) => Math.max(0, Math.round(prev - 2)))}
                    className="p-1 rounded bg-surface border border-border hover:bg-muted text-text-secondary"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <input
                    type="range"
                    min="0"
                    max="60"
                    step="1"
                    value={studyLoad}
                    onChange={(e) => setStudyLoad(Number(e.target.value))}
                    className="w-full accent-primary cursor-pointer"
                  />
                  <button
                    type="button"
                    onClick={() => setStudyLoad((prev) => Math.min(80, Math.round(prev + 2)))}
                    className="p-1 rounded bg-surface border border-border hover:bg-muted text-text-secondary"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
                <p className="text-[10px] text-text-secondary">Baseline: {baseline.study_load_hrs_week} hrs/wk</p>
              </div>

              {/* Sleep Duration */}
              <div className="p-3.5 rounded-lg bg-muted/40 border border-border space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-text-primary">Sleep Duration</span>
                  <span className="font-bold text-primary">{sleepHrs.toFixed(1)} hrs/night</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSleepHrs((prev) => Math.max(4.0, Number((prev - 0.5).toFixed(1))))}
                    className="p-1 rounded bg-surface border border-border hover:bg-muted text-text-secondary"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <input
                    type="range"
                    min="4.0"
                    max="11.0"
                    step="0.1"
                    value={sleepHrs}
                    onChange={(e) => setSleepHrs(Number(e.target.value))}
                    className="w-full accent-primary cursor-pointer"
                  />
                  <button
                    type="button"
                    onClick={() => setSleepHrs((prev) => Math.min(12.0, Number((prev + 0.5).toFixed(1))))}
                    className="p-1 rounded bg-surface border border-border hover:bg-muted text-text-secondary"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
                <p className="text-[10px] text-text-secondary">Baseline: {baseline.sleep_hrs_night} hrs/night</p>
              </div>

              {/* Monthly Spending */}
              <div className="p-3.5 rounded-lg bg-muted/40 border border-border space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-text-primary">Monthly Spending</span>
                  <span className="font-bold text-primary">{formatCurrency(spending)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSpending((prev) => Math.max(1000, Math.round(prev - 500)))}
                    className="p-1 rounded bg-surface border border-border hover:bg-muted text-text-secondary"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <input
                    type="range"
                    min="2000"
                    max="30000"
                    step="250"
                    value={spending}
                    onChange={(e) => setSpending(Number(e.target.value))}
                    className="w-full accent-primary cursor-pointer"
                  />
                  <button
                    type="button"
                    onClick={() => setSpending((prev) => Math.min(60000, Math.round(prev + 500)))}
                    className="p-1 rounded bg-surface border border-border hover:bg-muted text-text-secondary"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
                <p className="text-[10px] text-text-secondary">Baseline: {formatCurrency(baseline.monthly_spending)}</p>
              </div>

              {/* Exercise Frequency */}
              <div className="p-3.5 rounded-lg bg-muted/40 border border-border space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-text-primary">Exercise Routine</span>
                  <span className="font-bold text-primary">{exerciseDays} days/week</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setExerciseDays((prev) => Math.max(0, prev - 1))}
                    className="p-1 rounded bg-surface border border-border hover:bg-muted text-text-secondary"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <input
                    type="range"
                    min="0"
                    max="7"
                    step="1"
                    value={exerciseDays}
                    onChange={(e) => setExerciseDays(Number(e.target.value))}
                    className="w-full accent-primary cursor-pointer"
                  />
                  <button
                    type="button"
                    onClick={() => setExerciseDays((prev) => Math.min(7, prev + 1))}
                    className="p-1 rounded bg-surface border border-border hover:bg-muted text-text-secondary"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
                <p className="text-[10px] text-text-secondary">Baseline: {baseline.exercise_days_week} days/wk</p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-3 mt-5 pt-4 border-t border-border">
              <button
                type="button"
                onClick={handleResetToBaseline}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-button text-xs font-medium border border-border hover:bg-muted text-text-secondary transition"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset to Baseline
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleRunSimulation(true)}
                  disabled={simulating}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-button text-xs font-semibold border border-primary/40 bg-primary/10 text-primary hover:bg-primary/20 transition disabled:opacity-60"
                >
                  <Save className="w-3.5 h-3.5" />
                  Save & Simulate
                </button>
                <button
                  type="button"
                  onClick={() => handleRunSimulation(false)}
                  disabled={simulating}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-button bg-primary text-white text-xs font-bold hover:bg-primary-hover shadow-sm transition disabled:opacity-60"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${simulating ? 'animate-spin' : ''}`} />
                  {simulating ? 'Simulating…' : 'Run Simulation'}
                </button>
              </div>
            </div>

            {savedSuccessMsg && (
              <p className="mt-3 text-xs text-emerald-500 font-medium flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" /> {savedSuccessMsg}
              </p>
            )}
          </Card>

          {/* FEATURE 3 — BEFORE VS AFTER IMPACT COMPARISON */}
          {result.impact && result.impact.length > 0 && (
            <Card className="border-border">
              <div className="flex items-center justify-between pb-3 border-b border-border mb-3">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-primary" />
                  <h2 className="font-semibold text-text-primary text-base">Your Future Snapshot (Before vs After Changes)</h2>
                </div>
                <span className="text-xs text-text-secondary">Timeframe: {result.simulation_period} Days Ahead</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-border/80 text-text-secondary bg-muted/40 font-semibold">
                      <th className="py-2.5 px-3">Lifestyle Area</th>
                      <th className="py-2.5 px-3">Current Today</th>
                      <th className="py-2.5 px-3">Projected in {result.simulation_period} Days</th>
                      <th className="py-2.5 px-3">Estimated Difference</th>
                      <th className="py-2.5 px-3">Percentage Change</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {result.impact.map((imp) => {
                      const isZero = Math.abs(imp.change) < 0.001;
                      const sign = imp.change > 0 ? '+' : '';
                      const unitStr = imp.unit === '₹' ? '₹' : ` ${imp.unit}`;
                      const formattedBase = imp.unit === '₹' ? formatCurrency(imp.baseline) : `${imp.baseline}${unitStr}`;
                      const formattedSim = imp.unit === '₹' ? formatCurrency(imp.simulated) : `${imp.simulated}${unitStr}`;
                      const formattedChange = imp.unit === '₹' ? `${sign}₹${Math.round(imp.change).toLocaleString('en-IN')}` : `${sign}${imp.change}${unitStr}`;

                      return (
                        <tr key={imp.metric} className="hover:bg-muted/30 transition">
                          <td className="py-2 px-3 font-medium text-text-primary">{imp.label}</td>
                          <td className="py-2 px-3 text-text-secondary">{formattedBase}</td>
                          <td className="py-2 px-3 font-semibold text-text-primary">{formattedSim}</td>
                          <td className="py-2 px-3">
                            {isZero ? (
                              <span className="text-text-secondary">0.0</span>
                            ) : (
                              <span
                                className={`inline-flex items-center gap-1 font-medium ${
                                  imp.direction_is_favorable ? 'text-emerald-500' : 'text-red-500'
                                }`}
                              >
                                {imp.change > 0 ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                                {formattedChange}
                              </span>
                            )}
                          </td>
                          <td className="py-2 px-3 text-text-secondary">
                            {imp.pct_change !== null && imp.pct_change !== undefined ? (
                              <span className={imp.pct_change >= 0 ? 'text-text-primary' : 'text-text-secondary'}>
                                {imp.pct_change > 0 ? `+${imp.pct_change}%` : `${imp.pct_change}%`}
                              </span>
                            ) : (
                              '—'
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* EXISTING OUTCOME COMPARISON: OPTIMISTIC, EXPECTED, RISK */}
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-text-secondary mb-3">Compare 3 Possible Futures</h2>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {(Object.keys(scenarioMeta) as Array<keyof typeof scenarioMeta>).map((key) => {
                if (!result.scenarios[key]) return null;
                return <ScenarioCard key={key} type={key} scenario={result.scenarios[key]} />;
              })}
            </div>
          </div>

          {/* SIMULATION TIMELINE TRAJECTORY CHART */}
          <Card className="border-border">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 mb-3 border-b border-border">
              <div>
                <h2 className="font-semibold text-text-primary text-base">Your Projected Timeline (Next {result.simulation_period} Days)</h2>
                <p className="text-xs text-text-secondary mt-0.5">
                  Hover anywhere along the curve to see day-by-day estimates of your productivity, savings, and stress level.
                </p>
              </div>
              <ShieldCheck className="w-5 h-5 text-primary shrink-0" />
            </div>
            <MultiHorizonTrajectoryChart scenarios={result.scenarios} horizonDays={result.simulation_period} />
          </Card>

          {/* FEATURE 5 — SENSITIVITY ANALYSIS IN LAYMAN TERMS */}
          {result.sensitivity && result.sensitivity.length > 0 && (
            <Card className="border-border">
              <div className="flex items-center justify-between pb-3 border-b border-border mb-4">
                <div className="flex items-center gap-2">
                  <Gauge className="w-4 h-4 text-primary" />
                  <h2 className="font-semibold text-text-primary text-base">What Habits Affect Your Future The Most?</h2>
                </div>
                <span className="text-xs text-text-secondary">Tested with ±20% habit shift</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {result.sensitivity.map((item) => {
                  const levelColor =
                    item.impact_level === 'High'
                      ? 'bg-red-500'
                      : item.impact_level === 'Medium-High'
                      ? 'bg-amber-500'
                      : item.impact_level === 'Medium'
                      ? 'bg-blue-500'
                      : 'bg-emerald-500';

                  const badgeStyle =
                    item.impact_level === 'High'
                      ? 'text-red-500 bg-red-500/10 border-red-500/20'
                      : item.impact_level === 'Medium-High'
                      ? 'text-amber-500 bg-amber-500/10 border-amber-500/20'
                      : item.impact_level === 'Medium'
                      ? 'text-blue-500 bg-blue-500/10 border-blue-500/20'
                      : 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';

                  return (
                    <div key={item.feature_name} className="p-3.5 rounded-lg bg-muted/40 border border-border space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-text-primary">{item.label}</span>
                        <span className={`px-2 py-0.5 rounded text-[11px] font-bold border ${badgeStyle}`}>
                          {item.impact_level} Impact
                        </span>
                      </div>

                      {/* Bar Visualization */}
                      <div className="w-full bg-border/60 h-2 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${levelColor}`} style={{ width: `${Math.max(8, item.impact_score)}%` }} />
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-text-secondary">
                        <span>Directly Affects: <strong className="text-text-primary">{item.outcome_metric}</strong></span>
                        <span>Impact Score: {item.impact_score}/100</span>
                      </div>
                      <p className="text-[11px] text-text-secondary leading-normal">{item.description}</p>
                    </div>
                  );
                })}
              </div>

              <p className="text-[11px] text-text-secondary mt-4 pt-3 border-t border-border">
                <strong>How this works:</strong> We test what happens if you increase or decrease each habit by 20%. The habits that cause the biggest swings in your financial cushion and daily energy are ranked at the top so you know what to focus on first.
              </p>
            </Card>
          )}

          {/* FEATURE 7 — AI EXPLANATION & RECOMMENDATION */}
          <Card className="border-primary/40 bg-primary-light/20">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Brain className="w-5 h-5 text-primary" />
                  <h2 className="text-xs font-semibold uppercase tracking-wider text-primary">AI Forecast & Digital Twin Coach</h2>
                </div>
                <p className="text-base font-bold text-text-primary leading-snug">
                  {result.recommendation || result.scenarios.expected.recommendation}
                </p>
                <p className="text-xs text-text-secondary leading-relaxed pt-1">
                  {result.ai_explanation}
                </p>
              </div>
              <Sparkles className="w-8 h-8 text-primary shrink-0 hidden sm:block" />
            </div>

            {/* Expandable "Why This Recommendation?" and "Rule Trace" Triggers */}
            <div className="flex flex-wrap items-center gap-3 mt-4 pt-3 border-t border-primary/20">
              <button
                type="button"
                onClick={() => setShowWhyRec(!showWhyRec)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-button text-xs font-semibold bg-surface border border-border hover:bg-muted text-text-primary transition"
              >
                <HelpCircle className="w-3.5 h-3.5 text-primary" />
                {showWhyRec ? 'Hide Breakdown' : 'Why This Advice?'}
                {showWhyRec ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>

              <button
                type="button"
                onClick={() => setShowRuleTrace(!showRuleTrace)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-button text-xs font-semibold bg-surface border border-border hover:bg-muted text-text-primary transition"
              >
                <Zap className="w-3.5 h-3.5 text-amber-500" />
                {showRuleTrace ? 'Hide Checks' : 'Safety & Habit Checks'}
                {showRuleTrace ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>

              <button
                type="button"
                onClick={() => setShowEvidence(!showEvidence)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-button text-xs font-semibold bg-surface border border-border hover:bg-muted text-text-primary transition"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                {showEvidence ? 'Hide Details' : 'Data Accuracy & Records'}
                {showEvidence ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            </div>
          </Card>

          {/* COLLAPSIBLE: WHY THIS RECOMMENDATION? */}
          {showWhyRec && result.why_recommendation && (
            <Card className="border-border bg-surface">
              <div className="flex items-center justify-between pb-3 border-b border-border mb-3">
                <div className="flex items-center gap-2">
                  <HelpCircle className="w-4 h-4 text-primary" />
                  <h3 className="font-semibold text-text-primary text-sm">How Your Advice Was Calculated</h3>
                </div>
                <span className="text-xs font-semibold text-primary">{result.why_recommendation.confidence_pct}% AI Confidence</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="p-3 rounded bg-muted/40 border border-border space-y-1.5">
                  <p className="font-semibold text-text-primary">1. Main Lifestyle Driver</p>
                  <p className="text-text-secondary">Outlook Scenario: <strong className="text-text-primary">{result.why_recommendation.selected_scenario}</strong></p>
                  <p className="text-text-secondary">Key Habit Driving This: <strong className="text-primary">{result.why_recommendation.primary_contributing_factor}</strong></p>
                  <p className="text-text-secondary">Real Records Checked: {result.why_recommendation.evidence_used}</p>
                </div>

                <div className="p-3 rounded bg-muted/40 border border-border space-y-1.5">
                  <p className="font-semibold text-text-primary">2. Safety Alerts & Habit Checks</p>
                  {result.why_recommendation.rules_triggered.length === 0 ? (
                    <p className="text-text-secondary">No negative risk thresholds or budget alerts were exceeded. You are in a safe zone!</p>
                  ) : (
                    <ul className="space-y-1 list-disc pl-4 text-text-secondary">
                      {result.why_recommendation.rules_triggered.map((rule, i) => (
                        <li key={i}><strong className="text-text-primary">{rule}</strong></li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              <div className="mt-3 p-3 rounded bg-muted/40 border border-border text-xs">
                <p className="font-semibold text-text-primary">3. Recommended Action Plan</p>
                <p className="mt-1 text-text-secondary">{result.why_recommendation.final_recommendation}</p>
              </div>
            </Card>
          )}

          {/* COLLAPSIBLE: RULE TRACE */}
          {showRuleTrace && result.rule_trace && (
            <Card className="border-border bg-surface">
              <div className="flex items-center justify-between pb-3 border-b border-border mb-3">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-500" />
                  <h3 className="font-semibold text-text-primary text-sm">Safety, Health & Budget Limits Checked</h3>
                </div>
                <span className="text-xs text-text-secondary">Verified Against Your Real Limits</span>
              </div>

              <div className="space-y-3">
                {result.rule_trace.map((rule, idx) => (
                  <div key={rule.condition_id} className="p-3 rounded bg-muted/40 border border-border text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[11px] text-text-secondary font-bold">Check {idx + 1}:</span>
                        <strong className="text-text-primary">{rule.condition_name}</strong>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded font-mono font-bold text-[10px] ${
                          rule.status_label === 'TRIGGERED'
                            ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                            : rule.status_label === 'TRUE'
                            ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                            : 'bg-muted text-text-secondary border border-border'
                        }`}
                      >
                        {rule.status_label === 'TRIGGERED' ? 'ATTENTION NEEDED' : rule.status_label === 'TRUE' ? 'SAFE & STABLE' : 'CHECKED'}
                      </span>
                    </div>

                    <p className="text-[11px] text-text-secondary mt-1">{rule.condition_text}</p>
                    <p className="text-[11px] text-text-primary mt-1 font-medium bg-surface/60 p-1.5 rounded border border-border/40">
                      {rule.impact_explanation}
                    </p>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* COLLAPSIBLE: EVIDENCE & CONFIDENCE SECTION */}
          {showEvidence && result.evidence_meta && (
            <Card className="border-border bg-surface">
              <div className="flex items-center justify-between pb-3 border-b border-border mb-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  <h3 className="font-semibold text-text-primary text-sm">Data Quality & Accuracy Audit</h3>
                </div>
                <span className="text-xs font-semibold text-emerald-500">{result.evidence_meta.confidence_pct}% Reliability Score</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                <div className="p-3 rounded bg-muted/40 border border-border">
                  <p className="text-[10px] text-text-secondary uppercase">User Records Analyzed</p>
                  <p className="text-base font-bold text-text-primary mt-1">{result.evidence_meta.records_used}</p>
                  <span className="text-[10px] text-text-secondary">Range: {result.evidence_meta.historical_range}</span>
                </div>

                <div className="p-3 rounded bg-muted/40 border border-border">
                  <p className="text-[10px] text-text-secondary uppercase">Habit Factors Included</p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {result.evidence_meta.features_used.map((f) => (
                      <span key={f} className="px-1.5 py-0.5 rounded bg-surface border border-border text-[10px] text-emerald-500 font-medium">
                        ✓ {f}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="p-3 rounded bg-muted/40 border border-border">
                  <p className="text-[10px] text-text-secondary uppercase">Areas Needing More Logs</p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {result.evidence_meta.insufficient_features.length === 0 ? (
                      <span className="text-[11px] text-text-secondary">None (Full Coverage)</span>
                    ) : (
                      result.evidence_meta.insufficient_features.map((f) => (
                        <span key={f} className="px-1.5 py-0.5 rounded bg-surface border border-border text-[10px] text-amber-500 font-medium">
                          ⚠ {f}
                        </span>
                      ))
                    )}
                  </div>
                </div>

                <div className="p-3 rounded bg-muted/40 border border-border">
                  <p className="text-[10px] text-text-secondary uppercase">AI Simulation Engine</p>
                  <p className="text-[11px] text-text-primary font-medium mt-1 leading-snug">Hosted Modern LLM + Habit Trajectory Model</p>
                </div>
              </div>

              <p className="text-xs text-text-secondary mt-3 pt-3 border-t border-border">
                All simulation outputs are grounded in your actual personal history to prevent generic or ungrounded estimates.
              </p>
            </Card>
          )}

          {/* Traceability & Compliance Footer Card */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <h3 className="font-semibold text-text-primary text-sm">Privacy & Data Integrity</h3>
              <p className="text-xs text-text-secondary mt-1">How we safeguard and calculate your private forecast.</p>
              <div className="mt-3 space-y-2 text-xs">
                <div className="flex gap-2">
                  <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                  <p className="text-text-secondary">
                    All predictions are calculated directly from your real stored logs without guessing or fake data.
                  </p>
                </div>
                <div className="flex gap-2">
                  <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                  <p className="text-text-secondary">
                    Your personal habits and financial numbers remain strictly private and isolated to your profile.
                  </p>
                </div>
              </div>
            </Card>

            <Card>
              <h3 className="font-semibold text-text-primary text-sm">Helpful Reminder</h3>
              <p className="text-xs text-text-secondary mt-1">How to get the most from your simulations.</p>
              <p className="text-xs text-text-secondary mt-3 leading-relaxed">
                These projections show how your daily choices compound over time. Small, consistent improvements—like putting away an extra ₹500/month or maintaining a steady 7.5 hours of sleep—build massive financial security and energy over time!
              </p>
            </Card>
          </div>
        </>
      )}
    </div>
  );
};
