import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, Target, Award, CheckCircle, TrendingUp } from 'lucide-react';
import { SummaryCard } from '../components/common/SummaryCard';
import { ActiveSessionWidget } from '../components/behavior/ActiveSessionWidget';
import { ProfileOverviewCard } from '../components/dashboard/ProfileOverviewCard';
import { FinancialOverviewCard } from '../components/dashboard/FinancialOverviewCard';
import { StudyOverviewCard } from '../components/dashboard/StudyOverviewCard';
import { HabitOverviewCard } from '../components/dashboard/HabitOverviewCard';
import { RecentActivityList } from '../components/dashboard/RecentActivityList';
import { Card } from '../components/common/Card';
import { PageHeader } from '../components/layout/PageHeader';
import { api } from '../services/api';
import type { WorkSession, ProductivityAnalytics, MetricForecast, WorkActivityType } from '../types';
import { useApp } from '../context/AppContext';

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useApp();

  const [sessions, setSessions] = useState<WorkSession[]>([]);
  const [analytics, setAnalytics] = useState<ProductivityAnalytics | null>(null);
  const [forecast, setForecast] = useState<MetricForecast | null>(null);

  const activeSession = sessions.find((s) => s.status === 'in_progress') || null;

  const loadDashboardData = async () => {
    try {
      const [sess, anal, fc] = await Promise.all([
        api.getWorkSessions(),
        api.getProductivityAnalytics(),
        api.getProductivityForecast(),
      ]);
      setSessions(sess);
      setAnalytics(anal);
      setForecast(fc);
    } catch {
      // Fallback
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const handleStartSession = async (activityType: WorkActivityType, notes?: string) => {
    try {
      await api.startWorkSession(activityType, notes);
      showToast(`Started ${activityType} session`, 'success');
      await loadDashboardData();
    } catch (err: any) {
      showToast(err.message || 'Failed to start session', 'error');
    }
  };

  const handleStopSession = async (sessionId: number, notes?: string) => {
    try {
      const stopped = await api.stopWorkSession(sessionId, notes);
      showToast(`Completed ${stopped.duration_minutes} mins work session!`, 'success');
      await loadDashboardData();
    } catch (err: any) {
      showToast(err.message || 'Failed to stop session', 'error');
    }
  };

  const series = forecast?.historical_series ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="A concise view of work time, habits, and upcoming forecast."
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard
          title="Work Time"
          value={`${analytics?.total_work_hours || 0} hrs`}
          subtitle="Total logged work time"
          icon={Clock}
          onClick={() => navigate('/productivity')}
        />
        <SummaryCard
          title="Focus Time"
          value={`${analytics?.total_focus_hours || 0} hrs`}
          subtitle="Coding, study & projects"
          icon={Target}
          iconBgColor="bg-sky-50"
          iconColor="text-sky-700"
          onClick={() => navigate('/productivity')}
        />
        <SummaryCard
          title="Productivity Score"
          value={analytics ? `${analytics.productivity_score} / 100` : '—'}
          subtitle="Weighted score formula"
          icon={Award}
          iconBgColor="bg-emerald-50"
          iconColor="text-emerald-700"
          onClick={() => navigate('/productivity')}
        />
        <SummaryCard
          title="Habit Consistency"
          value={analytics ? `${analytics.consistency_pct}%` : '—'}
          subtitle="Routine consistency rate"
          icon={CheckCircle}
          iconBgColor="bg-amber-50"
          iconColor="text-amber-700"
          onClick={() => navigate('/habits')}
        />
      </div>

      <Card>
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-4 mb-4 border-b border-border">
          <div>
            <h2 className="card-title">Productivity trend</h2>
            <p className="text-sm text-text-secondary mt-1">Recent work hours from the forecasting series</p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/forecasting')}
            className="text-sm font-medium text-primary hover:underline shrink-0"
          >
            Open forecasting
          </button>
        </div>
        {series.length ? (
          <MiniTrend series={series} predicted={forecast?.predicted_value ?? null} />
        ) : (
          <p className="py-10 text-center text-sm text-text-secondary">No data available</p>
        )}
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <ActiveSessionWidget
            activeSession={activeSession}
            onStart={handleStartSession}
            onStop={handleStopSession}
          />
        </div>

        <Card className="flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 pb-4 mb-4 border-b border-border">
              <div className="p-2 rounded-lg bg-muted text-text-secondary border border-border">
                <TrendingUp className="w-4 h-4" aria-hidden="true" />
              </div>
              <div>
                <h3 className="card-title">Next-period forecast</h3>
                <p className="text-sm text-text-secondary">Linear regression estimate</p>
              </div>
            </div>

            {forecast ? (
              <div className="space-y-3">
                <div className="p-4 bg-muted rounded-lg border border-border">
                  <p className="text-xs font-medium text-text-secondary">Estimated next week work</p>
                  <p className="metric-value mt-1">
                    {forecast.status === 'valid' ? `~${forecast.predicted_value} hrs/wk` : '—'}
                  </p>
                  <p className="text-sm text-text-secondary mt-1">
                    Trend: <span className="font-medium text-text-primary capitalize">{forecast.trend}</span>
                    {forecast.confidence != null ? ` · ${(forecast.confidence * 100).toFixed(0)}% reliability` : ''}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-text-secondary mb-1">Evidence</p>
                  <ul className="space-y-1 text-sm text-text-secondary">
                    {forecast.evidence.slice(0, 2).map((ev, i) => (
                      <li key={i}>{ev}</li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : (
              <p className="text-sm text-text-secondary py-6 text-center">Loading forecast data...</p>
            )}
          </div>

          <button
            onClick={() => navigate('/forecasting')}
            className="w-full mt-4 h-10 text-sm font-medium text-primary bg-primary-light hover:opacity-90 rounded-button"
          >
            View predictive analytics
          </button>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ProfileOverviewCard />
        <FinancialOverviewCard />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <StudyOverviewCard />
        <HabitOverviewCard />
        <RecentActivityList />
      </div>
    </div>
  );
};

function MiniTrend({
  series,
  predicted,
}: {
  series: { label: string; value: number }[];
  predicted: number | null;
}) {
  const width = 900;
  const height = 180;
  const pad = { left: 36, right: 20, top: 12, bottom: 28 };
  const values = [...series.map((p) => p.value), ...(predicted != null ? [predicted] : [])];
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = Math.max(max - min, 1);
  const yMin = Math.max(0, min - range * 0.12);
  const yMax = max + range * 0.12;
  const x = (i: number) => pad.left + (i / Math.max(series.length - 1, 1)) * (width - pad.left - pad.right);
  const y = (v: number) => pad.top + ((yMax - v) / Math.max(yMax - yMin, 1)) * (height - pad.top - pad.bottom);
  const line = series.map((p, i) => `${i ? 'L' : 'M'} ${x(i)} ${y(p.value)}`).join(' ');
  const area = `${line} L ${x(series.length - 1)} ${height - pad.bottom} L ${x(0)} ${height - pad.bottom} Z`;
  const every = Math.max(1, Math.ceil(series.length / 7));

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-[180px]" role="img" aria-label="Recent productivity trend">
      <path d={area} fill="var(--chart-fill)" />
      <path d={line} fill="none" stroke="var(--chart-actual)" strokeWidth="2.25" strokeLinecap="round" />
      {series.map((p, i) => (
        <circle key={i} cx={x(i)} cy={y(p.value)} r="3" fill="var(--color-surface)" stroke="var(--chart-actual)" strokeWidth="2">
          <title>{`${p.label}: ${p.value.toFixed(1)} hrs`}</title>
        </circle>
      ))}
      {series.map((p, i) =>
        i % every === 0 || i === series.length - 1 ? (
          <text key={`l${i}`} x={x(i)} y={height - 8} textAnchor="middle" fontSize="11" fill="var(--chart-axis)">
            {p.label}
          </text>
        ) : null
      )}
    </svg>
  );
}
