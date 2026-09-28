import React, { useState, useEffect } from 'react';
import { Play, Square, Clock } from 'lucide-react';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import type { WorkSession, WorkActivityType } from '../../types';

interface ActiveSessionWidgetProps {
  activeSession: WorkSession | null;
  onStart: (activityType: WorkActivityType, notes?: string) => Promise<void>;
  onStop: (sessionId: number, notes?: string) => Promise<void>;
}

export const ActiveSessionWidget: React.FC<ActiveSessionWidgetProps> = ({
  activeSession,
  onStart,
  onStop,
}) => {
  const [selectedActivity, setSelectedActivity] = useState<WorkActivityType>('Coding');
  const [notes, setNotes] = useState('');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!activeSession || !activeSession.started_at) {
      setElapsedSeconds(0);
      return;
    }

    const startTs = new Date(activeSession.started_at).getTime();
    const updateElapsed = () => {
      const now = Date.now();
      setElapsedSeconds(Math.max(0, Math.floor((now - startTs) / 1000)));
    };

    updateElapsed();
    const interval = setInterval(updateElapsed, 1000);
    return () => clearInterval(interval);
  }, [activeSession]);

  const formatTimer = (totalSecs: number) => {
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    return `${hrs > 0 ? `${hrs.toString().padStart(2, '0')}:` : ''}${mins
      .toString()
      .padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStart = async () => {
    setLoading(true);
    try {
      await onStart(selectedActivity, notes);
      setNotes('');
    } finally {
      setLoading(false);
    }
  };

  const handleStop = async () => {
    if (!activeSession) return;
    setLoading(true);
    try {
      await onStop(activeSession.id, notes);
      setNotes('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <div className="flex items-center justify-between pb-4 mb-4 border-b border-border gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-2 rounded-lg bg-muted text-text-secondary border border-border">
            <Clock className="w-4 h-4" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <h3 className="card-title">Work Session</h3>
            <p className="text-sm text-text-secondary">Log an active focus session</p>
          </div>
        </div>

        {activeSession && (
          <span className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            In progress
          </span>
        )}
      </div>

      {activeSession ? (
        <div className="space-y-4">
          <div className="p-4 text-center border rounded-lg bg-muted border-border">
            <p className="text-xs font-medium text-text-secondary mb-1">
              {activeSession.activity_type}
            </p>
            <div className="text-3xl font-semibold text-text-primary font-mono tracking-tight my-1 tabular-nums">
              {formatTimer(elapsedSeconds)}
            </div>
            <p className="text-xs text-text-secondary">Started at {new Date(activeSession.started_at).toLocaleTimeString()}</p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <input
              type="text"
              placeholder="Session notes / goals (optional)..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="input-field"
            />
            <Button
              variant="danger"
              onClick={handleStop}
              isLoading={loading}
            >
              <Square className="w-3.5 h-3.5 mr-1" />
              Stop & Record Session
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="session-activity" className="block text-sm font-medium text-text-primary mb-1.5">Select Activity</label>
              <select
                id="session-activity"
                value={selectedActivity}
                onChange={(e) => setSelectedActivity(e.target.value as WorkActivityType)}
                className="input-field"
              >
                <option value="Coding">Coding</option>
                <option value="Study">Study</option>
                <option value="Project">Project</option>
                <option value="Reading">Reading</option>
                <option value="Meeting">Meeting</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label htmlFor="session-note" className="block text-sm font-medium text-text-primary mb-1.5">Session Note (Optional)</label>
              <input
                id="session-note"
                type="text"
                placeholder="e.g., Implementing Auth API"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="input-field"
              />
            </div>
          </div>

          <Button
            variant="primary"
            onClick={handleStart}
            isLoading={loading}
            className="w-full"
          >
            <Play className="w-4 h-4 mr-1.5 fill-current" />
            Start Focus Session Now
          </Button>
        </div>
      )}
    </Card>
  );
};
