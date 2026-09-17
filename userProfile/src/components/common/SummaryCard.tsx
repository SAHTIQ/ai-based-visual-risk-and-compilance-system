import React from 'react';
import type { LucideIcon } from 'lucide-react';

interface SummaryCardProps {
  title: string;
  value: string | number;
  subtitle: string;
  icon: LucideIcon;
  iconBgColor?: string;
  iconColor?: string;
  badge?: string;
  onClick?: () => void;
}

export const SummaryCard: React.FC<SummaryCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  iconBgColor = 'bg-primary-light',
  iconColor = 'text-primary',
  badge,
  onClick,
}) => {
  const Wrapper = onClick ? 'button' : 'div';

  return (
    <Wrapper
      {...(onClick ? { type: 'button' as const, onClick } : {})}
      className={`bg-surface border border-border rounded-card p-5 shadow-card text-left w-full ${
        onClick ? 'cursor-pointer hover:border-border-dark hover:shadow-card-hover' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-text-secondary">{title}</p>
          <div className="flex items-baseline gap-2 mt-2">
            <p className="metric-value truncate">{value}</p>
            {badge && (
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                {badge}
              </span>
            )}
          </div>
          <p className="text-sm text-text-secondary mt-1">{subtitle}</p>
        </div>
        <div className={`p-2 rounded-lg shrink-0 ${iconBgColor} ${iconColor}`}>
          <Icon className="w-4 h-4" aria-hidden="true" />
        </div>
      </div>
    </Wrapper>
  );
};
