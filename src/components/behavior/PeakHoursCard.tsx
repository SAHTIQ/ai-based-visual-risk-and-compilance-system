import React from 'react';
import { Card } from '../common/Card';
import { Sun, Calendar, Award } from 'lucide-react';

interface PeakHoursCardProps {
  peakHours: string;
  mostProductiveDay: string;
  leastProductiveDay: string;
  consistencyPct: number;
}

export const PeakHoursCard: React.FC<PeakHoursCardProps> = ({
  peakHours,
  mostProductiveDay,
  leastProductiveDay,
  consistencyPct,
}) => {
  const items = [
    { label: 'Peak working hours', value: peakHours, icon: Sun },
    { label: 'Most productive day', value: mostProductiveDay, icon: Calendar },
    { label: 'Least active day', value: leastProductiveDay, icon: Calendar },
    { label: 'Routine consistency', value: `${consistencyPct}% active days`, icon: Award },
  ];

  return (
    <Card>
      <div className="pb-4 mb-4 border-b border-border">
        <h3 className="card-title">Peak Hours</h3>
        <p className="text-sm text-text-secondary mt-1">When work tends to concentrate</p>
      </div>

      <div className="space-y-3">
        {items.map(({ label, value, icon: Icon }) => (
          <div key={label} className="flex items-center gap-3 p-3 rounded-lg bg-muted border border-border">
            <div className="p-2 bg-surface text-text-secondary rounded-lg border border-border">
              <Icon className="w-4 h-4" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-text-secondary">{label}</p>
              <p className="text-sm font-semibold text-text-primary truncate">{value || '—'}</p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};
