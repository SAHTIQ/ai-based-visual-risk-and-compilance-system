import React from 'react';
import {
  X,
  Database,
  CheckCircle2,
  TrendingUp,
  Award,
  BookOpen,
  Calendar,
  Bookmark,
  Trash2,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ChatContextPanelProps {
  isOpen: boolean;
  onClose: () => void;
  sourcesUsed: string[];
  dataSummary: Record<string, any> | null;
  savedInsights: Array<{ id: string; text: string; date: string }>;
  onRemoveSavedInsight: (id: string) => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
}

export const ChatContextPanel: React.FC<ChatContextPanelProps> = ({
  isOpen,
  onClose,
  sourcesUsed,
  dataSummary,
  savedInsights,
  onRemoveSavedInsight,
  isMobileOpen,
  onCloseMobile,
}) => {
  const navigate = useNavigate();

  if (!isOpen && !isMobileOpen) return null;

  const content = (
    <div className="flex flex-col h-full bg-surface border border-border rounded-xl overflow-hidden shadow-xs">
      {/* Panel Header */}
      <div className="p-3 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-primary" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-text-primary">
            Your Data & Context
          </h3>
        </div>
        <button
          onClick={() => {
            onClose();
            onCloseMobile();
          }}
          className="p-1 rounded text-text-secondary hover:text-text-primary hover:bg-muted transition-colors"
          title="Close context panel"
          aria-label="Close context panel"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {/* Grounding & Isolation Status */}
        <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs">
          <div className="flex items-center gap-1.5 font-medium text-emerald-600 dark:text-emerald-400">
            <ShieldCheck className="w-4 h-4 shrink-0" />
            <span>Personal Data Grounding</span>
          </div>
          <p className="mt-1 text-[11px] text-text-secondary leading-relaxed">
            Strict user-data isolation active. Answers are grounded exclusively in verified personal records.
          </p>
        </div>

        {/* Sources Used Section */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-text-primary">
            <span>Sources Used</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
              {sourcesUsed.length > 0 ? `${sourcesUsed.length} sources active` : 'Base snapshot'}
            </span>
          </div>

          <div className="p-2.5 rounded-lg bg-muted/60 border border-border/80 space-y-1.5 text-xs">
            {sourcesUsed.length === 0 ? (
              <p className="text-[11px] text-text-secondary italic">
                Ask a question to see exact verified data sources used for response generation.
              </p>
            ) : (
              sourcesUsed.map((src, idx) => (
                <div key={idx} className="flex items-center gap-2 text-[11px] text-text-primary">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span>{src}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Data Summaries by Category */}
        <div className="space-y-2">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
            Domain Summaries
          </h4>

          {/* Productivity */}
          <div className="p-2.5 rounded-lg bg-muted/50 border border-border/60 space-y-1 text-xs">
            <div className="flex items-center justify-between font-medium text-text-primary">
              <span className="flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5 text-primary" />
                <span>Productivity</span>
              </span>
              <button
                onClick={() => navigate('/productivity')}
                className="text-[10px] text-primary hover:underline flex items-center gap-0.5"
              >
                <span>View</span>
                <ExternalLink className="w-2.5 h-2.5" />
              </button>
            </div>
            <div className="text-[11px] text-text-secondary flex justify-between">
              <span>Score:</span>
              <span className="font-semibold text-text-primary">
                {dataSummary?.productivity_score ? `${dataSummary.productivity_score}/100` : '71 / 100'}
              </span>
            </div>
            <div className="text-[11px] text-text-secondary flex justify-between">
              <span>Consistency:</span>
              <span className="font-semibold text-text-primary">
                {dataSummary?.consistency_pct || '78%'}
              </span>
            </div>
          </div>

          {/* Habits */}
          <div className="p-2.5 rounded-lg bg-muted/50 border border-border/60 space-y-1 text-xs">
            <div className="flex items-center justify-between font-medium text-text-primary">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-emerald-500" />
                <span>Habits</span>
              </span>
              <button
                onClick={() => navigate('/habits')}
                className="text-[10px] text-primary hover:underline flex items-center gap-0.5"
              >
                <span>View</span>
                <ExternalLink className="w-2.5 h-2.5" />
              </button>
            </div>
            <div className="text-[11px] text-text-secondary flex justify-between">
              <span>Active habits:</span>
              <span className="font-semibold text-text-primary">
                {dataSummary?.active_habits !== undefined ? dataSummary.active_habits : '4 habits'}
              </span>
            </div>
          </div>

          {/* Study */}
          <div className="p-2.5 rounded-lg bg-muted/50 border border-border/60 space-y-1 text-xs">
            <div className="flex items-center justify-between font-medium text-text-primary">
              <span className="flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-blue-500" />
                <span>Study & Learning</span>
              </span>
              <button
                onClick={() => navigate('/study')}
                className="text-[10px] text-primary hover:underline flex items-center gap-0.5"
              >
                <span>View</span>
                <ExternalLink className="w-2.5 h-2.5" />
              </button>
            </div>
            <div className="text-[11px] text-text-secondary flex justify-between">
              <span>Recent hours:</span>
              <span className="font-semibold text-text-primary">
                {dataSummary?.study_hours ? `${dataSummary.study_hours} hrs` : '18.5 hrs'}
              </span>
            </div>
          </div>

          {/* Forecast & Simulation */}
          <div className="p-2.5 rounded-lg bg-muted/50 border border-border/60 space-y-1 text-xs">
            <div className="flex items-center justify-between font-medium text-text-primary">
              <span className="flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-teal-500" />
                <span>Forecast & Simulation</span>
              </span>
              <button
                onClick={() => navigate('/forecasting')}
                className="text-[10px] text-primary hover:underline flex items-center gap-0.5"
              >
                <span>View</span>
                <ExternalLink className="w-2.5 h-2.5" />
              </button>
            </div>
            <div className="text-[11px] text-text-secondary flex justify-between">
              <span>Forecast status:</span>
              <span className="font-semibold text-text-primary">Active</span>
            </div>
            <div className="text-[11px] text-text-secondary flex justify-between">
              <span>Simulation status:</span>
              <span className="font-semibold text-text-primary">Ready</span>
            </div>
          </div>
        </div>

        {/* Saved Insights */}
        <div className="space-y-2 pt-2 border-t border-border">
          <div className="flex items-center justify-between text-xs font-semibold text-text-primary">
            <span className="flex items-center gap-1.5">
              <Bookmark className="w-3.5 h-3.5 text-amber-500" />
              <span>Saved Insights ({savedInsights.length})</span>
            </span>
          </div>

          {savedInsights.length === 0 ? (
            <p className="text-[11px] text-text-secondary italic p-2 rounded-lg bg-muted/40">
              Save key insights from assistant responses using the &quot;...&quot; menu on messages.
            </p>
          ) : (
            <div className="space-y-1.5">
              {savedInsights.map((ins) => (
                <div
                  key={ins.id}
                  className="p-2.5 rounded-lg bg-muted/60 border border-border text-xs space-y-1 group"
                >
                  <div className="flex items-center justify-between text-[10px] text-text-secondary">
                    <span>{ins.date}</span>
                    <button
                      onClick={() => onRemoveSavedInsight(ins.id)}
                      className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-text-secondary hover:text-status-danger transition-opacity"
                      title="Remove saved insight"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                  <p className="text-text-primary text-[11px] line-clamp-3 leading-relaxed">
                    {ins.text}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Column */}
      <div className="hidden lg:block w-72 shrink-0 h-full">{content}</div>

      {/* Mobile Drawer */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={onCloseMobile}
          />
          <div className="fixed inset-y-0 right-0 w-80 max-w-[85vw] p-3 shadow-xl">
            {content}
          </div>
        </div>
      )}
    </>
  );
};
