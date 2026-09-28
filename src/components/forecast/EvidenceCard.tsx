import React from 'react';
import { Card } from '../common/Card';
import { FileText, Check } from 'lucide-react';

interface EvidenceCardProps {
  evidence: string[];
}

export const EvidenceCard: React.FC<EvidenceCardProps> = ({ evidence }) => {
  return (
    <Card className="border border-border">
      <div className="flex items-center gap-2 pb-3 mb-3 border-b border-gray-100">
        <div className="p-1.5 rounded-md bg-amber-100 text-amber-700">
          <FileText className="w-4 h-4" />
        </div>
        <div>
          <h3 className="font-semibold text-text-primary text-sm">Explainability & Reasoning</h3>
          <p className="text-xs text-text-secondary">Transparent mathematical evidence for prediction</p>
        </div>
      </div>

      {evidence.length === 0 ? (
        <p className="text-xs text-text-secondary py-3 text-center">No evidence available.</p>
      ) : (
        <ul className="space-y-2">
          {evidence.map((item, idx) => (
            <li key={idx} className="flex items-start gap-2 text-xs text-text-primary">
              <span className="p-0.5 rounded-full bg-emerald-100 text-emerald-700 mt-0.5 flex-shrink-0">
                <Check className="w-3 h-3" />
              </span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
};
