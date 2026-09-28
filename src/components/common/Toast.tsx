import React from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import type { ToastMessage } from '../../context/AppContext';

interface ToastProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const Toast: React.FC<ToastProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none px-4 sm:px-0">
      {toasts.map((toast) => {
        const icons = {
          success: <CheckCircle2 className="w-5 h-5 text-status-success flex-shrink-0" />,
          error: <AlertCircle className="w-5 h-5 text-status-danger flex-shrink-0" />,
          info: <Info className="w-5 h-5 text-primary flex-shrink-0" />,
        };

        const borders = {
          success: 'border-emerald-200',
          error: 'border-red-200',
          info: 'border-border',
        };

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-card border shadow-card bg-surface ${borders[toast.type]}`}
            role="alert"
          >
            {icons[toast.type]}
            <div className="flex-1 text-sm font-medium text-text-primary mt-0.5">
              {toast.message}
            </div>
            <button
              onClick={() => onDismiss(toast.id)}
              aria-label="Dismiss notification"
              className="text-text-secondary hover:text-text-primary p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
