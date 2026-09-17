import React from 'react';
import { Card } from '../common/Card';
import type { TimeAllocationItem } from '../../types';

interface TimeAllocationChartProps {
  timeAllocation: TimeAllocationItem[];
}

export const TimeAllocationChart: React.FC<TimeAllocationChartProps> = ({ timeAllocation }) => {
  const getCategoryColor = (act: string) => {
    switch (act) {
      case 'Coding':
        return 'bg-blue-600';
      case 'Study':
        return 'bg-sky-500';
      case 'Project':
        return 'bg-emerald-600';
      case 'Reading':
        return 'bg-amber-500';
      case 'Meeting':
        return 'bg-slate-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <Card>
      <div className="pb-4 mb-4 border-b border-border">
        <h3 className="card-title">Time Allocation</h3>
        <p className="text-sm text-text-secondary mt-1">Work session time by activity type</p>
      </div>

      {timeAllocation.length === 0 ? (
        <p className="text-sm text-text-secondary py-6 text-center">No data available</p>
      ) : (
        <div className="space-y-4">
          {timeAllocation.map((item) => (
            <div key={item.activity_type} className="space-y-1.5">
              <div className="flex items-center justify-between text-sm gap-3">
                <span className="font-medium text-text-primary flex items-center gap-2 min-w-0">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${getCategoryColor(item.activity_type)}`} />
                  <span className="truncate">{item.activity_type}</span>
                </span>
                <span className="tabular-nums text-text-primary shrink-0">
                  {item.hours} hrs <span className="text-text-secondary">({item.percentage}%)</span>
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                <div
                  className={`h-full rounded-full ${getCategoryColor(item.activity_type)}`}
                  style={{ width: `${item.percentage}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
};
