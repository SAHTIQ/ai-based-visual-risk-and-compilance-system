import React from 'react';
import { AlertTriangle, Database } from 'lucide-react';
import { Button } from '../common/Button';

interface ColdStartBannerProps {
  reason?: string | null;
  historicalObservations: number;
  requiredObservations: number;
  onSeedDemo?: () => void;
}

export const ColdStartBanner: React.FC<ColdStartBannerProps> = ({
  reason,
  historicalObservations,
  requiredObservations,
  onSeedDemo,
}) => {
  return (
    <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 shadow-sm space-y-3">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-amber-100 text-amber-700 flex-shrink-0">
          <AlertTriangle className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <h4 className="font-bold text-sm text-amber-900">Insufficient Evidence for Reliable Forecast</h4>
          <p className="text-xs text-amber-800 mt-1">
            {reason ||
              `The predictive engine requires at least ${requiredObservations} observations to construct a statistically valid linear regression trend line. Found ${historicalObservations} observations.`}
          </p>
        </div>
      </div>

      {onSeedDemo && (
        <div className="pt-2 border-t border-amber-200/60 flex items-center justify-between">
          <span className="text-xs text-amber-800">
            Want to evaluate predictive models right now with 12 weeks of data?
          </span>
          <Button
            variant="secondary"
            onClick={onSeedDemo}
            className="px-3 py-1.5 text-xs bg-white border-amber-300 text-amber-900 hover:bg-amber-100"
          >
            <Database className="w-3.5 h-3.5 mr-1" />
            Generate 12-Week Synthetic Dataset
          </Button>
        </div>
      )}
    </div>
  );
};
