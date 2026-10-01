import React from 'react';
import {
  Sparkles,
  Award,
  Calendar,
  TrendingUp,
  Activity,
  Sliders,
  ArrowRight,
  Compass,
} from 'lucide-react';

interface SuggestionItem {
  category: string;
  question: string;
}

interface ChatEmptyStateProps {
  categories: string[];
  suggestions: SuggestionItem[];
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
  onSelectPrompt: (prompt: string) => void;
}

export const ChatEmptyState: React.FC<ChatEmptyStateProps> = ({
  categories,
  suggestions,
  selectedCategory,
  onSelectCategory,
  onSelectPrompt,
}) => {
  const quickActionButtons = [
    {
      label: 'Analyze my productivity',
      prompt: 'Analyze my recent productivity, focus hours, and behavioral consistency.',
      icon: Award,
      color: 'text-primary bg-primary/10',
    },
    {
      label: 'Review my habits',
      prompt: 'Review my current habits, completion rates, and streak patterns.',
      icon: Calendar,
      color: 'text-emerald-500 bg-emerald-500/10',
    },
    {
      label: 'Explain my forecast',
      prompt: 'Explain my latest predictive forecast and the primary factors influencing it.',
      icon: TrendingUp,
      color: 'text-teal-500 bg-teal-500/10',
    },
    {
      label: 'Explore my activity',
      prompt: 'Summarize my recent work sessions and activity patterns.',
      icon: Activity,
      color: 'text-blue-500 bg-blue-500/10',
    },
    {
      label: 'Explain my latest simulation',
      prompt: 'What does my latest future simulation indicate about my upcoming routine and wellbeing?',
      icon: Sliders,
      color: 'text-purple-500 bg-purple-500/10',
    },
  ];

  const filteredSuggestions = suggestions.filter((s) => {
    if (selectedCategory === 'ALL') return true;
    return s.category.toUpperCase() === selectedCategory.toUpperCase();
  });

  return (
    <div className="h-full flex flex-col items-center justify-center max-w-2xl mx-auto py-8 px-4 text-center">
      {/* Icon & Title */}
      <div className="w-12 h-12 rounded-2xl bg-primary-light text-primary flex items-center justify-center mb-3 shadow-inner">
        <Sparkles className="w-6 h-6" />
      </div>

      <h3 className="text-lg font-semibold text-text-primary tracking-tight">
        Personal Intelligence Assistant
      </h3>

      <p className="mt-1 text-xs text-text-secondary max-w-md leading-relaxed">
        Understand your productivity, habits, behaviour and lifestyle using your personal data.
      </p>

      {/* Quick Contextual Action Buttons */}
      <div className="mt-5 w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-left">
        {quickActionButtons.map((btn, idx) => {
          const Icon = btn.icon;
          return (
            <button
              key={idx}
              onClick={() => onSelectPrompt(btn.prompt)}
              className="p-3 rounded-xl bg-surface border border-border hover:border-primary/50 hover:bg-muted/60 transition-all flex flex-col justify-between group shadow-2xs"
            >
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-6 h-6 rounded-md flex items-center justify-center ${btn.color}`}>
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <span className="text-xs font-semibold text-text-primary group-hover:text-primary transition-colors">
                  {btn.label}
                </span>
              </div>
              <div className="flex items-center justify-end text-[10px] text-text-secondary group-hover:text-primary transition-colors">
                <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </button>
          );
        })}
      </div>

      {/* Dynamic Suggestions with Category Tabs */}
      <div className="mt-6 w-full pt-4 border-t border-border">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-text-secondary">
            <Compass className="w-3.5 h-3.5" />
            <span>Suggested Inquiries</span>
          </div>

          {/* Category Chips */}
          <div className="flex items-center gap-1 flex-wrap justify-end">
            {categories.slice(0, 5).map((cat) => (
              <button
                key={cat}
                onClick={() => onSelectCategory(cat)}
                className={`px-2 py-0.5 rounded-full text-[10px] font-semibold transition-colors ${
                  selectedCategory === cat
                    ? 'bg-primary text-white shadow-2xs'
                    : 'bg-muted text-text-secondary hover:text-text-primary'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Suggestion Prompt Cards */}
        <div className="space-y-1.5 text-left">
          {filteredSuggestions.slice(0, 4).map((item, idx) => (
            <button
              key={idx}
              onClick={() => onSelectPrompt(item.question)}
              className="w-full text-left p-2.5 rounded-lg text-xs bg-muted/60 hover:bg-primary-light/40 hover:text-primary border border-border/80 transition-all flex items-center justify-between group"
            >
              <div className="flex items-center gap-2 min-w-0 pr-2">
                <span className="shrink-0 px-1.5 py-0.5 rounded text-[9px] font-medium bg-primary/10 text-primary">
                  {item.category}
                </span>
                <span className="truncate text-text-primary group-hover:text-primary font-medium">
                  {item.question}
                </span>
              </div>
              <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 text-primary transition-opacity shrink-0 ml-1" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
