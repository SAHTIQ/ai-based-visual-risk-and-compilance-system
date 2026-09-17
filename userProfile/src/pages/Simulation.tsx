import React, { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Info, Orbit, RefreshCw, ShieldCheck, TrendingDown, TrendingUp } from 'lucide-react';
import { Card } from '../components/common/Card';
import { PageHeader } from '../components/layout/PageHeader';
import { api } from '../services/api';
import type { SimulationResponse, SimulationScenario } from '../types';

const scenarioMeta = {
  best: { label: 'Best Scenario', color: '#16A34A', icon: TrendingUp, tone: 'border-emerald-200 bg-emerald-50/50' },
  expected: { label: 'Expected Scenario', color: '#2563EB', icon: Orbit, tone: 'border-blue-200 bg-blue-50/50' },
  risk: { label: 'Risk Scenario', color: '#DC2626', icon: TrendingDown, tone: 'border-red-200 bg-red-50/50' },
} as const;

function formatNumber(value: number | null, suffix = '') {
  return value === null ? '—' : `${value.toFixed(1)}${suffix}`;
}

function TrajectoryChart({ scenarios }: { scenarios: SimulationResponse['scenarios'] }) {
  const width = 1000;
  const height = 280;
  const pad = { left: 48, right: 22, top: 20, bottom: 34 };
  const values = Object.values(scenarios).flatMap((scenario) => scenario.daily_values.map((day) => day.productivity_score));
  if (!values.length) return <div className="h-[280px] flex items-center justify-center text-sm text-text-secondary">No trajectory is available.</div>;
  const min = Math.max(0, Math.min(...values) - 5);
  const max = Math.min(100, Math.max(...values) + 5);
  const x = (index: number) => pad.left + (index / 29) * (width - pad.left - pad.right);
  const y = (value: number) => pad.top + ((max - value) / Math.max(max - min, 1)) * (height - pad.top - pad.bottom);
  const path = (scenario: SimulationScenario) => scenario.daily_values.map((day, index) => `${index === 0 ? 'M' : 'L'} ${x(index)} ${y(day.productivity_score)}`).join(' ');
  return (
    <div>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-[280px]" role="img" aria-label="30-day productivity scenario comparison">
        {[0, 1, 2, 3, 4].map((tick) => {
          const value = min + ((max - min) * (4 - tick)) / 4;
          return <g key={tick}><line x1={pad.left} x2={width - pad.right} y1={y(value)} y2={y(value)} stroke="var(--chart-grid)" /><text x={pad.left - 8} y={y(value) + 4} textAnchor="end" fontSize="11" fill="var(--chart-axis)">{value.toFixed(0)}</text></g>;
        })}
        {(Object.keys(scenarioMeta) as Array<keyof typeof scenarioMeta>).map((key) => (
          <path key={key} d={path(scenarios[key])} fill="none" stroke={scenarioMeta[key].color} strokeWidth="2.5" strokeLinecap="round" />
        ))}
        {[0, 9, 19, 29].map((index) => <text key={index} x={x(index)} y={height - 10} textAnchor="middle" fontSize="11" fill="var(--chart-axis)">Day {index + 1}</text>)}
      </svg>
      <div className="flex flex-wrap gap-5 text-xs text-text-secondary">
        {(Object.keys(scenarioMeta) as Array<keyof typeof scenarioMeta>).map((key) => <span key={key} className="inline-flex items-center gap-2"><span className="w-6 h-0.5" style={{ background: scenarioMeta[key].color }} />{scenarioMeta[key].label}</span>)}
      </div>
    </div>
  );
}

function ScenarioCard({ scenario, type }: { scenario: SimulationScenario; type: keyof typeof scenarioMeta }) {
  const meta = scenarioMeta[type];
  const Icon = meta.icon;
  return (
    <Card className={`border ${meta.tone}`}>
      <div className="flex items-start justify-between gap-3">
        <div><div className="flex items-center gap-2"><Icon className="w-4 h-4" style={{ color: meta.color }} /><h2 className="card-title">{scenario.name}</h2></div><p className="text-sm text-text-secondary mt-2">{scenario.summary.outcome}</p></div>
        <span className="text-xs font-medium text-text-secondary whitespace-nowrap">{scenario.confidence === null ? 'No confidence' : `${Math.round(scenario.confidence * 100)}% reliability`}</span>
      </div>
      <div className="grid grid-cols-3 gap-3 mt-5 pt-4 border-t border-border">
        <div><p className="text-xs text-text-secondary">Avg. score</p><p className="metric-value mt-1">{formatNumber(scenario.summary.projected_average_productivity)}</p></div>
        <div><p className="text-xs text-text-secondary">30-day hours</p><p className="metric-value mt-1">{formatNumber(scenario.summary.projected_total_work_hours)}</p></div>
        <div><p className="text-xs text-text-secondary">Baseline change</p><p className="metric-value mt-1">{formatNumber(scenario.summary.change_from_current, '')}</p></div>
      </div>
      <p className="text-sm text-text-primary mt-4"><span className="font-medium">Recommendation:</span> {scenario.recommendation}</p>
    </Card>
  );
}

export const Simulation: React.FC = () => {
  const [result, setResult] = useState<SimulationResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const runSimulation = async () => {
    setLoading(true);
    setError(null);
    try { setResult(await api.getFutureSimulation()); } catch (err) { setResult(null); setError(err instanceof Error ? err.message : 'Unable to run the simulation.'); } finally { setLoading(false); }
  };

  useEffect(() => { runSimulation(); }, []);

  return (
    <div className="space-y-6">
      <PageHeader title="Future Scenario Simulation" description="Evidence-based 30-day trajectories from your history and productivity forecast." />
      <Card>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div><p className="section-title">Simulation Controls</p><p className="text-sm text-text-secondary mt-1">Period: 30 days · calculated from your authenticated data</p></div>
          <button type="button" onClick={runSimulation} disabled={loading} className="inline-flex items-center justify-center gap-2 h-9 px-3 rounded-button bg-primary text-white text-sm font-medium hover:bg-primary-hover disabled:opacity-60"><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />{loading ? 'Running…' : 'Run Simulation'}</button>
        </div>
      </Card>

      {loading && <Card><p className="py-16 text-center text-sm text-text-secondary">Preparing your 30-day scenarios…</p></Card>}
      {!loading && error && <Card><div className="py-10 text-center"><AlertTriangle className="w-8 h-8 mx-auto text-red-600" /><p className="mt-3 font-medium">Simulation unavailable</p><p className="text-sm text-text-secondary mt-1">{error}</p></div></Card>}
      {!loading && result && result.evidence_status === 'insufficient_evidence' && <Card><div className="py-10 text-center"><Info className="w-8 h-8 mx-auto text-amber-600" /><h2 className="mt-3 font-semibold">Insufficient Evidence</h2><p className="text-sm text-text-secondary mt-1 max-w-lg mx-auto">{result.note} Human review is required before relying on a future scenario.</p></div></Card>}
      {!loading && result && result.evidence_status === 'valid' && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">{(Object.keys(scenarioMeta) as Array<keyof typeof scenarioMeta>).map((key) => <ScenarioCard key={key} type={key} scenario={result.scenarios[key]} />)}</div>
          <Card className="border-primary/40 bg-primary-light/40">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">Recommended Action</p>
                <p className="mt-2 text-xl font-bold leading-8 text-text-primary sm:text-2xl">{result.scenarios.best.recommendation}</p>
                <p className="mt-1 text-sm text-text-secondary">Based on the 30-day Best Scenario simulation.</p>
              </div>
              <Orbit className="hidden h-8 w-8 shrink-0 text-primary sm:block" aria-hidden="true" />
            </div>
          </Card>
          <Card><div className="flex items-start justify-between gap-3 pb-4 mb-3 border-b border-border"><div><h2 className="card-title">30-Day Scenario Comparison</h2><p className="text-sm text-text-secondary mt-1">Daily simulated productivity score; these are scenarios, not guaranteed predictions.</p></div><ShieldCheck className="w-5 h-5 text-primary" /></div><TrajectoryChart scenarios={result.scenarios} /></Card>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card><h2 className="card-title">Evidence & Rules</h2><p className="text-sm text-text-secondary mt-1">Personal history and the existing Milestone 2 forecast used by the engine.</p><div className="mt-4 space-y-4">{(Object.keys(scenarioMeta) as Array<keyof typeof scenarioMeta>).map((key) => <div key={key}><p className="text-sm font-medium">{result.scenarios[key].name}</p><ul className="mt-1 space-y-1 text-sm text-text-secondary list-disc pl-5">{result.scenarios[key].evidence.slice(0, 3).map((item) => <li key={item}>{item}</li>)}{result.scenarios[key].rules.map((item) => <li key={item}>{item}</li>)}</ul></div>)}</div></Card>
            <Card><h2 className="card-title">Simulation Notes</h2><p className="text-sm text-text-secondary mt-1">Traceability and reliability details for this run.</p><div className="mt-4 space-y-3"><div className="flex gap-3"><CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0 text-primary" /><p className="text-sm">The recommendation above comes directly from the Best Scenario returned by the simulation engine.</p></div><div className="flex gap-3"><ShieldCheck className="w-4 h-4 mt-0.5 shrink-0 text-primary" /><p className="text-sm">Historical observations used: {result.historical_observations} distinct days.</p></div></div><p className="text-xs text-text-secondary mt-5 pt-4 border-t border-border">{result.note}</p></Card>
          </div>
        </>
      )}
    </div>
  );
};