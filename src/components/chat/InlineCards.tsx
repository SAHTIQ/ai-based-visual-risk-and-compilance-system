import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp,
  Award,
  Sparkles,
  ArrowRight,
  Sliders,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import type { InlineCardsData } from '../../types';

interface InlineCardsProps {
  cards?: InlineCardsData | null;
}

export const InlineCards: React.FC<InlineCardsProps> = ({ cards }) => {
  const navigate = useNavigate();
  if (!cards) return null;

  return (
    <div className="my-3 space-y-2.5">
      {/* Productivity Card */}
      {cards.productivity && (
        <div className="p-3.5 rounded-xl bg-surface border border-border/80 shadow-xs hover:border-primary/40 transition-colors">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-border/60">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-blue-500/10 text-primary flex items-center justify-center">
                <Award className="w-3.5 h-3.5" />
              </div>
              <span className="text-xs font-semibold text-text-primary">Productivity Snapshot</span>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              {cards.productivity.change_pct}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 py-1 text-center">
            <div className="p-2 rounded-lg bg-muted/60">
              <span className="text-[10px] text-text-secondary block">Score</span>
              <span className="text-base font-bold text-text-primary tabular-nums">
                {cards.productivity.score}
              </span>
              <span className="text-[9px] text-text-secondary block">/ 100</span>
            </div>
            <div className="p-2 rounded-lg bg-muted/60">
              <span className="text-[10px] text-text-secondary block">Focus Time</span>
              <span className="text-base font-bold text-primary tabular-nums">
                {cards.productivity.focus_hours}
              </span>
              <span className="text-[9px] text-text-secondary block">deep work</span>
            </div>
            <div className="p-2 rounded-lg bg-muted/60">
              <span className="text-[10px] text-text-secondary block">Consistency</span>
              <span className="text-base font-bold text-text-primary tabular-nums">
                {cards.productivity.consistency}
              </span>
              <span className="text-[9px] text-text-secondary block">28-day routine</span>
            </div>
          </div>

          <div className="mt-2.5 pt-2 border-t border-border/60 flex items-center justify-between text-[11px]">
            <span className="text-text-secondary flex items-center gap-1">
              <Clock className="w-3 h-3 text-text-secondary" />
              Peak window: {cards.productivity.peak_hours}
            </span>
            <button
              onClick={() => navigate('/productivity')}
              className="text-primary hover:underline font-medium inline-flex items-center gap-1 text-[11px]"
            >
              <span>View details</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}

      {/* Forecast Card */}
      {cards.forecast && (
        <div className="p-3.5 rounded-xl bg-surface border border-border/80 shadow-xs hover:border-primary/40 transition-colors">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-border/60">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center">
                <TrendingUp className="w-3.5 h-3.5" />
              </div>
              <div>
                <span className="text-xs font-semibold text-text-primary">Predictive Forecast</span>
                <span className="text-[10px] text-text-secondary ml-2">· {cards.forecast.metric}</span>
              </div>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
              {cards.forecast.confidence} confidence
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 my-1.5">
            <div className="p-2 rounded-lg bg-muted/60">
              <span className="text-[10px] text-text-secondary block">Current Value</span>
              <span className="text-sm font-bold text-text-primary tabular-nums">
                {cards.forecast.current_value}
              </span>
            </div>
            <div className="p-2 rounded-lg bg-muted/60">
              <span className="text-[10px] text-text-secondary block">Forecast Value</span>
              <span className="text-sm font-bold text-teal-600 dark:text-teal-400 tabular-nums">
                {cards.forecast.forecast_value} ({cards.forecast.trend})
              </span>
            </div>
          </div>

          {cards.forecast.factors && cards.forecast.factors.length > 0 && (
            <div className="my-2 space-y-1">
              <span className="text-[10px] font-semibold text-text-secondary uppercase tracking-wider block">
                Relevant Factors:
              </span>
              <ul className="space-y-0.5">
                {cards.forecast.factors.map((f, i) => (
                  <li key={i} className="text-[11px] text-text-primary flex items-start gap-1.5">
                    <CheckCircle2 className="w-3 h-3 text-teal-500 shrink-0 mt-0.5" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-2.5 pt-2 border-t border-border/60 flex items-center justify-end">
            <button
              onClick={() => navigate(cards.forecast?.view_url || '/forecasting')}
              className="text-primary hover:underline font-medium inline-flex items-center gap-1 text-[11px]"
            >
              <span>View full forecast</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}

      {/* Simulation Card */}
      {cards.simulation && (
        <div className="p-3.5 rounded-xl bg-surface border border-border/80 shadow-xs hover:border-primary/40 transition-colors">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-border/60">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                <Sliders className="w-3.5 h-3.5" />
              </div>
              <span className="text-xs font-semibold text-text-primary">Future Simulation Outcome</span>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
              {cards.simulation.scenario}
            </span>
          </div>

          <div className="space-y-1.5 text-[11px] my-1.5">
            <div className="flex items-center justify-between p-2 rounded-lg bg-muted/60">
              <span className="text-text-secondary">Current State:</span>
              <span className="font-medium text-text-primary">{cards.simulation.current_state}</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg bg-muted/60">
              <span className="text-text-secondary">Simulated Outcome:</span>
              <span className="font-semibold text-purple-600 dark:text-purple-400">
                {cards.simulation.simulated_outcome}
              </span>
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg bg-purple-500/5 border border-purple-500/15">
              <span className="text-text-secondary">Projected Difference:</span>
              <span className="font-bold text-text-primary">{cards.simulation.difference}</span>
            </div>
          </div>

          <div className="mt-2.5 pt-2 border-t border-border/60 flex items-center justify-end">
            <button
              onClick={() => navigate(cards.simulation?.view_url || '/simulation')}
              className="text-primary hover:underline font-medium inline-flex items-center gap-1 text-[11px]"
            >
              <span>View simulation</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}

      {/* Insight Card */}
      {cards.insight && (
        <div className="p-3.5 rounded-xl bg-surface border-l-4 border-l-amber-500 border border-border/80 shadow-xs hover:border-border transition-colors">
          <div className="flex items-center justify-between pb-1.5 mb-1.5">
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span className="text-xs font-semibold text-text-primary">Insight</span>
            </div>
            <span className="text-[10px] text-text-secondary">{cards.insight.relevant_data}</span>
          </div>

          <p className="text-xs font-semibold text-text-primary mb-1">
            &ldquo;{cards.insight.observation}&rdquo;
          </p>

          <p className="text-[11px] text-text-secondary leading-relaxed">
            <strong className="text-text-primary font-medium">Why it matters:</strong> {cards.insight.why_it_matters}
          </p>

          <div className="mt-2.5 pt-1.5 border-t border-border/60 flex items-center justify-end">
            <button
              onClick={() => navigate(cards.insight?.view_url || '/productivity')}
              className="text-primary hover:underline font-medium inline-flex items-center gap-1 text-[11px]"
            >
              <span>View analysis</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
