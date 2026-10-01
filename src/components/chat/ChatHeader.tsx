import React, { useState } from 'react';
import {
  Bot,
  Plus,
  PanelRightClose,
  PanelRightOpen,
  Menu,
  ChevronDown,
  Cpu,
  ShieldCheck,
} from 'lucide-react';

interface ChatHeaderProps {
  activeTitle: string;
  hasMessages: boolean;
  onNewChat: () => void;
  isRightPanelOpen: boolean;
  onToggleRightPanel: () => void;
  onOpenMobileSidebar: () => void;
  onOpenMobileContext: () => void;
  selectedModelTier: string;
  onSelectModelTier: (tier: string) => void;
  sourcesCount: number;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({
  activeTitle,
  hasMessages,
  onNewChat,
  isRightPanelOpen,
  onToggleRightPanel,
  onOpenMobileSidebar,
  onOpenMobileContext,
  selectedModelTier,
  onSelectModelTier,
  sourcesCount,
}) => {
  const [showModelDropdown, setShowModelDropdown] = useState(false);

  const modelLabels: Record<string, { label: string; desc: string }> = {
    auto: { label: 'Auto (Smart Routing)', desc: 'Routes automatically based on question complexity' },
    fast: { label: 'Fast Model', desc: 'Optimized for quick answers and simple queries' },
    strong: { label: 'Strong Model', desc: 'Deep multi-step reasoning for simulations & forecasting' },
  };

  return (
    <div className="px-4 py-3 border-b border-border bg-surface flex items-center justify-between gap-3 shrink-0">
      {/* Left: Mobile Menu Toggle & Title */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onOpenMobileSidebar}
          className="p-1.5 rounded-lg text-text-secondary hover:text-text-primary hover:bg-muted lg:hidden"
          title="Open conversations"
          aria-label="Open conversations"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-primary-light text-primary flex items-center justify-center shrink-0">
            <Bot className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-text-primary truncate">
                {activeTitle || 'Personal Intelligence Assistant'}
              </h2>
            </div>
            <p className="text-[11px] text-text-secondary truncate">
              Productivity • Behaviour • Lifestyle
            </p>
          </div>
        </div>
      </div>

      {/* Right Controls: Model Selector, Grounding Status, New Thread, Context Toggle */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Model Selector Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowModelDropdown(!showModelDropdown)}
            className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs bg-muted hover:bg-muted/80 text-text-primary border border-border transition-colors"
            title="Model routing configuration"
          >
            <Cpu className="w-3.5 h-3.5 text-primary" />
            <span className="font-medium">{modelLabels[selectedModelTier]?.label || 'Auto Routing'}</span>
            <ChevronDown className="w-3 h-3 text-text-secondary" />
          </button>

          {showModelDropdown && (
            <div
              className="absolute right-0 top-full mt-1 w-64 rounded-xl bg-surface border border-border shadow-card p-1.5 z-40 text-xs"
              onClick={() => setShowModelDropdown(false)}
            >
              <div className="px-2 py-1 text-[10px] font-semibold text-text-secondary uppercase tracking-wider border-b border-border mb-1">
                Model Routing
              </div>
              {Object.entries(modelLabels).map(([tier, { label, desc }]) => (
                <button
                  key={tier}
                  onClick={() => onSelectModelTier(tier)}
                  className={`w-full text-left p-2 rounded-lg transition-colors ${
                    selectedModelTier === tier
                      ? 'bg-primary-light text-primary font-medium'
                      : 'hover:bg-muted text-text-primary'
                  }`}
                >
                  <div className="font-medium">{label}</div>
                  <div className="text-[10px] text-text-secondary mt-0.5">{desc}</div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Grounding Indicator (Clickable to open Context Panel) */}
        <button
          onClick={onToggleRightPanel}
          className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/15 transition-colors"
          title="Click to view context & data grounding"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>Based on personal data</span>
        </button>

        {/* Start New Thread button */}
        {hasMessages && (
          <button
            onClick={onNewChat}
            className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-lg bg-muted hover:bg-primary-light hover:text-primary text-text-primary border border-border transition-colors"
            title="Start fresh conversation"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">New Thread</span>
          </button>
        )}

        {/* Desktop Context Toggle Button */}
        <button
          onClick={onToggleRightPanel}
          className={`hidden lg:inline-flex items-center gap-1.5 p-1.5 rounded-lg border transition-colors ${
            isRightPanelOpen
              ? 'bg-primary-light text-primary border-primary/30'
              : 'text-text-secondary hover:text-text-primary hover:bg-muted border-border'
          }`}
          title={isRightPanelOpen ? 'Close context panel' : 'Open context panel'}
          aria-label={isRightPanelOpen ? 'Close context panel' : 'Open context panel'}
        >
          {isRightPanelOpen ? <PanelRightClose className="w-4 h-4" /> : <PanelRightOpen className="w-4 h-4" />}
          {sourcesCount > 0 && (
            <span className="text-[10px] px-1 rounded-full bg-primary text-white font-bold">
              {sourcesCount}
            </span>
          )}
        </button>

        {/* Mobile Context Panel Button */}
        <button
          onClick={onOpenMobileContext}
          className="p-1.5 rounded-lg text-text-secondary hover:text-text-primary hover:bg-muted border border-border lg:hidden"
          title="Open context & insights"
          aria-label="Open context & insights"
        >
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
        </button>
      </div>
    </div>
  );
};
