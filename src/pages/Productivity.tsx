import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import { ActiveSessionWidget } from '../components/behavior/ActiveSessionWidget';
import { ActivityHeatmap } from '../components/behavior/ActivityHeatmap';
import { ProductivityTrend } from '../components/behavior/ProductivityTrend';
import { PeakHoursCard } from '../components/behavior/PeakHoursCard';
import { SummaryCard } from '../components/common/SummaryCard';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { PageHeader } from '../components/layout/PageHeader';
import { Clock, Target, Award, CheckCircle, Sparkles } from 'lucide-react';
import type { WorkSession, ProductivityAnalytics, WorkActivityType } from '../types';

export const Productivity: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useApp();
  const [sessions, setSessions] = useState<WorkSession[]>([]);
  const [analytics, setAnalytics] = useState<ProductivityAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  const activeSession = sessions.find((s) => s.status === 'in_progress') || null;

  const loadData = async () => {
    setLoading(true);
    try {
      const [sessData, analData] = await Promise.all([
        api.getWorkSessions(),
        api.getProductivityAnalytics(),
      ]);
      setSessions(sessData);
      setAnalytics(analData);
    } catch (err: any) {
      showToast(err.message || 'Failed to load productivity data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleStartSession = async (activityType: WorkActivityType, notes?: string) => {
    try {
      await api.startWorkSession(activityType, notes);
      showToast(`Started ${activityType} work session!`, 'success');
      await loadData();
    } catch (err: any) {
      showToast(err.message || 'Failed to start work session', 'error');
    }
  };

  const handleStopSession = async (sessionId: number, notes?: string) => {
    try {
      const stopped = await api.stopWorkSession(sessionId, notes);
      showToast(`Completed work session: ${stopped.duration_minutes} mins recorded!`, 'success');
      await loadData();
    } catch (err: any) {
      showToast(err.message || 'Failed to stop work session', 'error');
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Productivity & Behavior"
        description="Work sessions, focus time, and behavioral consistency"
        actions={
          <button
            onClick={() =>
              navigate('/ai-assistant', {
                state: {
                  prompt: `Explain my current productivity score (${analytics?.productivity_score ?? 71}) and suggest actionable steps to improve focus time.`,
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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard
          title="Productivity Score"
          value={analytics ? `${analytics.productivity_score} / 100` : '—'}
          subtitle="Transparent score formula"
          icon={Award}
        />
        <SummaryCard
          title="Total Work Time"
          value={analytics ? `${analytics.total_work_hours} hrs` : '—'}
          subtitle={analytics ? `${analytics.total_sessions_count} logged sessions` : 'No analytics loaded'}
          icon={Clock}
        />
        <SummaryCard
          title="Total Focus Time"
          value={analytics ? `${analytics.total_focus_hours} hrs` : '—'}
          subtitle="Coding, study, projects & reading"
          icon={Target}
        />
        <SummaryCard
          title="Routine Consistency"
          value={analytics ? `${analytics.consistency_pct}%` : '—'}
          subtitle="Active days in past 28 days"
          icon={CheckCircle}
        />
      </div>

      <ProductivityTrend />

      <ActiveSessionWidget
        activeSession={activeSession}
        onStart={handleStartSession}
        onStop={handleStopSession}
      />

      {analytics && <ActivityHeatmap heatmapData={analytics.activity_heatmap} />}

      <PeakHoursCard
        peakHours={analytics?.peak_working_hours || '—'}
        mostProductiveDay={analytics?.most_productive_day || '—'}
        leastProductiveDay={analytics?.least_productive_day || '—'}
        consistencyPct={analytics?.consistency_pct || 0}
      />

      <Card>
        <div className="pb-4 mb-4 border-b border-border">
          <h3 className="card-title">Work sessions history</h3>
          <p className="text-sm text-text-secondary mt-1">Full log of recorded focus and work sessions</p>
        </div>
        <div className="overflow-x-auto">
          {loading ? (
            <p className="text-sm text-text-secondary py-8 text-center">Loading work sessions...</p>
          ) : sessions.length === 0 ? (
            <p className="text-sm text-text-secondary py-8 text-center">No work sessions recorded yet. Start a session above.</p>
          ) : (
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="table-head">
                  <th className="py-2.5 px-3 font-medium">Activity</th>
                  <th className="py-2.5 px-3 font-medium">Started at</th>
                  <th className="py-2.5 px-3 font-medium">Duration</th>
                  <th className="py-2.5 px-3 font-medium">Status</th>
                  <th className="py-2.5 px-3 font-medium">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {sessions.map((s) => (
                  <tr key={s.id} className="hover:bg-muted">
                    <td className="py-3 px-3 font-medium text-text-primary">{s.activity_type}</td>
                    <td className="py-3 px-3 text-text-secondary whitespace-nowrap">
                      {new Date(s.started_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                    </td>
                    <td className="py-3 px-3 tabular-nums">{s.duration_minutes} mins</td>
                    <td className="py-3 px-3">
                      <Badge variant={s.status === 'completed' ? 'success' : 'warning'}>
                        {s.status === 'completed' ? 'Completed' : 'In Progress'}
                      </Badge>
                    </td>
                    <td className="py-3 px-3 text-text-secondary">
                      {s.notes || (s.is_demo ? '[DEMO DATA]' : '—')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>
    </div>
  );
};
