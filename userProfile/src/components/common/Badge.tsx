import React from 'react';

interface BadgeProps {
  variant?: 'success' | 'warning' | 'danger' | 'primary' | 'neutral';
  children: React.ReactNode;
  size?: 'sm' | 'md';
  className?: string;
  dot?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  variant = 'neutral',
  children,
  size = 'md',
  className = '',
  dot = true,
}) => {
  const sizeStyles = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-xs px-2.5 py-1',
  };

  const variantStyles = {
    success: 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800',
    warning: 'bg-amber-50 text-amber-800 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800',
    danger: 'bg-red-50 text-red-700 border border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800',
    primary: 'bg-primary-light text-primary border border-border',
    neutral: 'bg-muted text-text-secondary border border-border',
  };

  const dotColors = {
    success: 'bg-status-success',
    warning: 'bg-status-warning',
    danger: 'bg-status-danger',
    primary: 'bg-primary',
    neutral: 'bg-text-secondary',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium rounded-full ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
    >
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${dotColors[variant]}`} />}
      <span>{children}</span>
    </span>
  );
};
