import React from 'react';
import { Card } from '../common/Card';
import type { ActivityHeatmapCell } from '../../types';

interface ActivityHeatmapProps { heatmapData: ActivityHeatmapCell[]; }
const days = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
const labels = ['6 AM','9 AM','12 PM','3 PM','6 PM','9 PM'];

export const ActivityHeatmap: React.FC<ActivityHeatmapProps> = ({ heatmapData }) => {
  const map = new Map(heatmapData.map(cell => [`${cell.day}|${cell.time_label}`, cell]));
  const max = Math.max(...heatmapData.map(c => c.minutes), 1);
  const totalMinutes = heatmapData.reduce((sum,c) => sum+c.minutes, 0);

  const intensity = (minutes: number) => {
    if (!minutes) return 'bg-muted';
    const ratio = minutes / max;
    if (ratio <= .2) return 'bg-blue-100 dark:bg-blue-950/50';
    if (ratio <= .4) return 'bg-blue-200 dark:bg-blue-900/60';
    if (ratio <= .6) return 'bg-blue-400 dark:bg-blue-700';
    if (ratio <= .8) return 'bg-blue-600 dark:bg-blue-500';
    return 'bg-blue-800 dark:bg-blue-400';
  };

  return (
    <Card>
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-4 mb-4 border-b border-border">
        <div>
          <h3 className="card-title">Behavioral Activity Heatmap</h3>
          <p className="text-sm text-text-secondary mt-1">Work activity by weekday and time of day</p>
        </div>
        <div className="text-left sm:text-right">
          <p className="text-lg font-semibold text-text-primary tabular-nums">{(totalMinutes/60).toFixed(1)} hrs</p>
          <p className="text-xs text-text-secondary">Total logged</p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[520px]">
          <div className="grid grid-cols-[56px_repeat(7,minmax(0,1fr))] gap-1.5 items-center mb-2">
            <span />
            {days.map(day => (
              <span key={day} className="text-xs text-text-secondary font-medium text-center">{day.slice(0,3)}</span>
            ))}
          </div>
          <div className="space-y-1.5">
            {labels.map(label => (
              <div key={label} className="grid grid-cols-[56px_repeat(7,minmax(0,1fr))] gap-1.5 items-center">
                <span className="text-xs text-text-secondary text-right pr-1 tabular-nums">{label}</span>
                {days.map(day => {
                  const cell = map.get(`${day}|${label}`) || { minutes: 0, session_count: 0 };
                  return (
                    <div
                      key={`${day}-${label}`}
                      role="img"
                      aria-label={`${day}, ${label}: ${cell.minutes} minutes, ${cell.session_count} sessions`}
                      title={`${day}, ${label}: ${cell.minutes} mins · ${cell.session_count} sessions`}
                      className={`aspect-square w-full min-h-[28px] rounded-md ${intensity(cell.minutes)}`}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 mt-4 text-xs text-text-secondary">
        <span>Less Activity</span>
        <div className="flex items-center gap-1" aria-hidden="true">
          <span className="w-3.5 h-3.5 rounded-sm bg-muted" />
          <span className="w-3.5 h-3.5 rounded-sm bg-blue-100" />
          <span className="w-3.5 h-3.5 rounded-sm bg-blue-200" />
          <span className="w-3.5 h-3.5 rounded-sm bg-blue-400" />
          <span className="w-3.5 h-3.5 rounded-sm bg-blue-600" />
          <span className="w-3.5 h-3.5 rounded-sm bg-blue-800" />
        </div>
        <span>More Activity</span>
      </div>
    </Card>
  );
};
