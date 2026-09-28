import React from 'react';
import { Card } from '../common/Card';
import { Cpu, CheckCircle } from 'lucide-react';
import type { ForecastEvaluation } from '../../types';

interface ModelEvaluationCardProps {
  modelName: string;
  baselineMa: number;
  evaluation?: ForecastEvaluation | null;
  historicalObservations: number;
}

export const ModelEvaluationCard: React.FC<ModelEvaluationCardProps> = ({
  modelName,
  baselineMa,
  evaluation,
  historicalObservations,
}) => {
  return (
    <Card className="border border-border">
      <div className="flex items-center justify-between pb-3 mb-4 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-md bg-purple-100 text-purple-700">
            <Cpu className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-semibold text-text-primary text-sm">Model Evaluation & Metrics</h3>
            <p className="text-xs text-text-secondary">Chronological Time-Series validation</p>
          </div>
        </div>
        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200 uppercase">
          {modelName.replace('_', ' ')}
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
        <div className="p-2.5 bg-gray-50 rounded-lg border border-gray-100">
          <p className="text-[10px] font-semibold text-text-secondary uppercase">3-Wk Baseline MA</p>
          <p className="text-base font-bold text-text-primary mt-0.5">{baselineMa} hrs</p>
        </div>

        <div className="p-2.5 bg-purple-50/60 rounded-lg border border-purple-100">
          <p className="text-[10px] font-semibold text-purple-800 uppercase">MAE (Mean Error)</p>
          <p className="text-base font-bold text-purple-900 mt-0.5">
            {evaluation ? `${evaluation.mae} hrs` : 'N/A'}
          </p>
        </div>

        <div className="p-2.5 bg-blue-50/60 rounded-lg border border-blue-100">
          <p className="text-[10px] font-semibold text-blue-800 uppercase">RMSE (Root MSE)</p>
          <p className="text-base font-bold text-blue-900 mt-0.5">
            {evaluation ? `${evaluation.rmse} hrs` : 'N/A'}
          </p>
        </div>

        <div className="p-2.5 bg-emerald-50/60 rounded-lg border border-emerald-100">
          <p className="text-[10px] font-semibold text-emerald-800 uppercase">R² Fit Score</p>
          <p className="text-base font-bold text-emerald-900 mt-0.5">
            {evaluation && evaluation.r2 !== null && evaluation.r2 !== undefined ? evaluation.r2 : 'N/A'}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between mt-3 text-[11px] text-text-secondary pt-2 border-t border-gray-100">
        <span className="flex items-center gap-1">
          <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
          Chronological Split: Past $\rightarrow$ Train, Future $\rightarrow$ Test
        </span>
        <span className="font-semibold text-text-primary">{historicalObservations} Historical Weeks</span>
      </div>
    </Card>
  );
};
