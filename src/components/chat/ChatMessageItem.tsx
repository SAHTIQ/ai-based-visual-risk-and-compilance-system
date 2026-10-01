import React, { useState } from 'react';
import {
  Bot,
  Copy,
  Check,
  RotateCcw,
  ThumbsUp,
  ThumbsDown,
  MoreHorizontal,
  Bookmark,
  Sparkles,
  ListFilter,
  Minimize2,
  Maximize2,
} from 'lucide-react';
import type { ChatMessage, InlineCardsData } from '../../types';
import { MarkdownRenderer } from '../common/MarkdownRenderer';
import { InlineCards } from './InlineCards';

interface ChatMessageItemProps {
  message: ChatMessage;
  onCopy: (content: string) => void;
  onRegenerate?: () => void;
  onAction?: (action: 'explain_simply' | 'explain_detailed' | 'make_shorter' | 'make_bullets') => void;
  onSaveInsight?: (text: string) => void;
  isLatestAssistant?: boolean;
}

export const ChatMessageItem: React.FC<ChatMessageItemProps> = ({
  message,
  onCopy,
  onRegenerate,
  onAction,
  onSaveInsight,
  isLatestAssistant = false,
}) => {
  const isUser = message.sender === 'user';
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState<'good' | 'bad' | null>(null);
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  // Parse inline cards metadata if available
  let inlineCards: InlineCardsData | null = null;
  if (message.metadata_json) {
    try {
      const parsed = JSON.parse(message.metadata_json);
      inlineCards = parsed.inline_cards || null;
    } catch {}
  }

  const handleCopy = () => {
    onCopy(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFeedback = (type: 'good' | 'bad') => {
    setFeedback(feedback === type ? null : type);
  };

  return (
    <div
      className={`group relative flex items-start gap-3 py-2 transition-colors ${
        isUser ? 'flex-row-reverse' : 'flex-row'
      }`}
    >
      {/* Avatar */}
      {!isUser ? (
        <div className="w-8 h-8 rounded-xl bg-primary-light text-primary flex items-center justify-center shrink-0 mt-0.5 border border-primary/20 shadow-xs">
          <Bot className="w-4 h-4" />
        </div>
      ) : (
        <div className="w-8 h-8 rounded-xl bg-muted text-text-primary flex items-center justify-center shrink-0 mt-0.5 border border-border text-xs font-semibold">
          You
        </div>
      )}

      {/* Message Bubble Container */}
      <div className={`flex flex-col min-w-0 max-w-[85%] sm:max-w-[78%] ${isUser ? 'items-end' : 'items-start'}`}>
        <div
          className={`rounded-2xl px-4 py-3 text-xs leading-relaxed transition-all ${
            isUser
              ? 'bg-primary text-white rounded-tr-xs shadow-xs'
              : 'bg-surface text-text-primary rounded-tl-xs border border-border shadow-2xs'
          }`}
        >
          <MarkdownRenderer content={message.content} isUser={isUser} />

          {/* Inline Analytics Cards (Productivity, Forecast, Simulation, Insight) */}
          {!isUser && inlineCards && <InlineCards cards={inlineCards} />}
        </div>

        {/* Message Footer & Actions Bar */}
        <div className="flex items-center gap-2 mt-1 px-1 text-[11px] text-text-secondary">
          <span>
            {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>

          {/* Assistant Actions Bar (on hover or active) */}
          {!isUser && (
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {/* Copy */}
              <button
                onClick={handleCopy}
                className="p-1 rounded hover:bg-muted text-text-secondary hover:text-text-primary transition-colors"
                title="Copy response"
                aria-label="Copy response"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              </button>

              {/* Regenerate (if latest message) */}
              {isLatestAssistant && onRegenerate && (
                <button
                  onClick={onRegenerate}
                  className="p-1 rounded hover:bg-muted text-text-secondary hover:text-text-primary transition-colors"
                  title="Regenerate response"
                  aria-label="Regenerate response"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              )}

              {/* Thumbs Up */}
              <button
                onClick={() => handleFeedback('good')}
                className={`p-1 rounded hover:bg-muted transition-colors ${
                  feedback === 'good' ? 'text-emerald-500' : 'text-text-secondary hover:text-text-primary'
                }`}
                title="Good response"
                aria-label="Good response"
              >
                <ThumbsUp className="w-3.5 h-3.5" />
              </button>

              {/* Thumbs Down */}
              <button
                onClick={() => handleFeedback('bad')}
                className={`p-1 rounded hover:bg-muted transition-colors ${
                  feedback === 'bad' ? 'text-status-danger' : 'text-text-secondary hover:text-text-primary'
                }`}
                title="Bad response"
                aria-label="Bad response"
              >
                <ThumbsDown className="w-3.5 h-3.5" />
              </button>

              {/* More Actions Menu */}
              <div className="relative">
                <button
                  onClick={() => setShowMoreMenu(!showMoreMenu)}
                  className="p-1 rounded hover:bg-muted text-text-secondary hover:text-text-primary transition-colors"
                  title="More actions"
                  aria-label="More actions"
                >
                  <MoreHorizontal className="w-3.5 h-3.5" />
                </button>

                {showMoreMenu && (
                  <div
                    className="absolute left-0 bottom-full mb-1 w-48 rounded-xl bg-surface border border-border shadow-card py-1 z-30 text-xs"
                    onClick={() => setShowMoreMenu(false)}
                  >
                    {onAction && (
                      <>
                        <button
                          onClick={() => onAction('explain_simply')}
                          className="w-full px-3 py-1.5 text-left flex items-center gap-2 hover:bg-muted text-text-primary"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-primary" />
                          <span>Explain simply</span>
                        </button>
                        <button
                          onClick={() => onAction('explain_detailed')}
                          className="w-full px-3 py-1.5 text-left flex items-center gap-2 hover:bg-muted text-text-primary"
                        >
                          <Maximize2 className="w-3.5 h-3.5 text-text-secondary" />
                          <span>Explain in detail</span>
                        </button>
                        <button
                          onClick={() => onAction('make_shorter')}
                          className="w-full px-3 py-1.5 text-left flex items-center gap-2 hover:bg-muted text-text-primary"
                        >
                          <Minimize2 className="w-3.5 h-3.5 text-text-secondary" />
                          <span>Make shorter</span>
                        </button>
                        <button
                          onClick={() => onAction('make_bullets')}
                          className="w-full px-3 py-1.5 text-left flex items-center gap-2 hover:bg-muted text-text-primary"
                        >
                          <ListFilter className="w-3.5 h-3.5 text-text-secondary" />
                          <span>Make into bullet points</span>
                        </button>
                        <div className="border-t border-border my-1" />
                      </>
                    )}

                    {onSaveInsight && (
                      <button
                        onClick={() => onSaveInsight(message.content)}
                        className="w-full px-3 py-1.5 text-left flex items-center gap-2 hover:bg-muted text-text-primary"
                      >
                        <Bookmark className="w-3.5 h-3.5 text-amber-500" />
                        <span>Save insight</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
