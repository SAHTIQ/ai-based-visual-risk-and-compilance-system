import React from 'react';

interface BarItem {
  label: string;
  value: number;
  color: string;
}

interface MinimalBarChartProps {
  items: BarItem[];
  currencyPrefix?: string;
}

export const MinimalBarChart: React.FC<MinimalBarChartProps> = ({
  items,
  currencyPrefix = '$',
}) => {
  const maxValue = Math.max(...items.map((i) => i.value), 1);

  return (
    <div className="space-y-3 pt-2">
      {items.map((item, idx) => {
        const percentage = Math.min(100, Math.max(8, Math.round((item.value / maxValue) * 100)));
        return (
          <div key={idx} className="space-y-1.5">
            <div className="flex justify-between text-sm gap-3">
              <span className="font-medium text-text-secondary truncate">{item.label}</span>
              <span className="font-semibold text-text-primary tabular-nums">
                {currencyPrefix}{item.value.toLocaleString()}
              </span>
            </div>
            <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${item.color}`}
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};
