import React, { useState, useEffect, useRef } from 'react';
import {
  Bot,
  Plus,
  Send,
  Trash2,
  Copy,
  Check,
  Sparkles,
  Loader2,
  Clock,
  ExternalLink,
  Info,
  Activity,
  TrendingUp,
  Cpu,
} from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader';
import { api } from '../services/api';
import type { Conversation, ConversationDetail, ChatMessage } from '../types';
import { useApp } from '../context/AppContext';
import { MarkdownRenderer } from '../components/common/MarkdownRenderer';

interface SuggestionItem {
  category: string;
  question: string;
}

interface ChatSuggestionsMeta {
  categories: string[];
  suggestions: SuggestionItem[];
}

const DEFAULT_SUGGESTIONS: SuggestionItem[] = [
  { category: 'PRODUCTIVITY', question: 'Summarize my recent productivity and activity patterns.' },
  { category: 'HABITS', question: 'What habits are affecting my productivity the most?' },
  { category: 'PRODUCTIVITY', question: 'How has my productivity changed over the past few weeks?' },
  { category: 'FORECASTS', question: 'What does my recent behaviour suggest about my future productivity?' },
  { category: 'FORECASTS', question: 'Explain my latest forecast and the factors influencing it.' },
  { category: 'STUDY & WORK', question: 'What are the main patterns in my study and work sessions?' },
  { category: 'SIMULATIONS', question: 'What does my latest simulation indicate about my future routine?' },
  { category: 'LIFESTYLE', question: 'Give me practical recommendations based on my recent activity.' },
];

export const AIAssistant: React.FC = () => {
  const { showToast } = useApp();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<number | null>(null);
  const [activeConversation, setActiveConversation] = useState<ConversationDetail | null>(null);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [copiedMsgId, setCopiedMsgId] = useState<number | null>(null);
  const [readinessMeta, setReadinessMeta] = useState<any>(null);
  const [suggestionsMeta, setSuggestionsMeta] = useState<ChatSuggestionsMeta | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load conversations and dynamic context metadata on mount
  useEffect(() => {
    loadConversations();
    api.getAIReadiness().then(setReadinessMeta).catch(() => {});
    api
      .getChatSuggestions()
      .then((data) => setSuggestionsMeta(data))
      .catch(() => {
        setSuggestionsMeta({
          categories: ['PRODUCTIVITY', 'HABITS', 'FORECASTS', 'STUDY & WORK', 'SIMULATIONS', 'LIFESTYLE'],
          suggestions: DEFAULT_SUGGESTIONS,
        });
      });
  }, []);

  const loadConversations = async (selectId?: number) => {
    setIsLoading(true);
    try {
      const list = await api.getConversations();
      setConversations(list);
      if (selectId) {
        setActiveConvId(selectId);
        await loadConversationDetail(selectId);
      } else if (list.length > 0 && !activeConvId) {
        setActiveConvId(list[0].id);
        await loadConversationDetail(list[0].id);
      } else if (list.length === 0) {
        setActiveConvId(null);
        setActiveConversation(null);
      }
    } catch {
      showToast('Could not load conversations', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const loadConversationDetail = async (convId: number) => {
    try {
      const detail = await api.getConversationDetail(convId);
      setActiveConversation(detail);
      scrollToBottom();
    } catch {
      showToast('Failed to load conversation history', 'error');
    }
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 80);
  };

  const handleSelectConversation = async (convId: number) => {
    if (convId === activeConvId) return;
    setActiveConvId(convId);
    await loadConversationDetail(convId);
  };

  const handleNewChat = async () => {
    try {
      const created = await api.createConversation('New Conversation');
      await loadConversations(created.id);
      showToast('Started new conversation', 'success');
      textareaRef.current?.focus();
    } catch {
      showToast('Failed to start new conversation', 'error');
    }
  };

  const handleDeleteConversation = async (e: React.MouseEvent, convId: number) => {
    e.stopPropagation();
    try {
      await api.deleteConversation(convId);
      showToast('Conversation deleted', 'info');
      const remaining = conversations.filter((c) => c.id !== convId);
      setConversations(remaining);
      if (activeConvId === convId) {
        if (remaining.length > 0) {
          setActiveConvId(remaining[0].id);
          await loadConversationDetail(remaining[0].id);
        } else {
          setActiveConvId(null);
          setActiveConversation(null);
        }
      }
    } catch {
      showToast('Failed to delete conversation', 'error');
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    const messageContent = (textToSend || inputText).trim();
    if (!messageContent || isSending) return;

    setInputText('');
    setIsSending(true);

    let targetConvId = activeConvId;

    try {
      // If no active conversation exists, create one first
      if (!targetConvId) {
        const newConv = await api.createConversation(messageContent.slice(0, 40));
        targetConvId = newConv.id;
        setActiveConvId(newConv.id);
      }

      // Optimistically add user message to UI
      const optimisticUserMsg: ChatMessage = {
        id: Date.now(),
        conversation_id: targetConvId,
        sender: 'user',
        content: messageContent,
        created_at: new Date().toISOString(),
      };

      setActiveConversation((prev) => {
        if (!prev) {
          return {
            id: targetConvId!,
            user_id: 0,
            title: messageContent.slice(0, 40),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            messages: [optimisticUserMsg],
          };
        }
        return {
          ...prev,
          messages: [...prev.messages, optimisticUserMsg],
        };
      });
      scrollToBottom();

      const response = await api.sendChatMessage(targetConvId, messageContent);

      // Refresh full conversation detail from backend for verified consistency
      await loadConversationDetail(targetConvId);
      // Refresh list to show updated timestamps / message count
      const updatedList = await api.getConversations();
      setConversations(updatedList);

      if (!response.is_success) {
        showToast('AI service is temporarily unavailable. Please try again later.', 'info');
      }
    } catch (err: any) {
      showToast('AI service is temporarily unavailable. Please try again later.', 'error');
    } finally {
      setIsSending(false);
      scrollToBottom();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleCopyMessage = (msgId: number, content: string) => {
    navigator.clipboard.writeText(content);
    setCopiedMsgId(msgId);
    showToast('Copied to clipboard', 'info');
    setTimeout(() => setCopiedMsgId(null), 2000);
  };

  // Filter suggested questions based on selected category and availability
  const activeSuggestions = (suggestionsMeta?.suggestions || DEFAULT_SUGGESTIONS).filter((item) => {
    if (selectedCategory === 'ALL') return true;
    return item.category.toUpperCase() === selectedCategory.toUpperCase();
  });

  const availableCategories = ['ALL', ...(suggestionsMeta?.categories || ['PRODUCTIVITY', 'HABITS', 'FORECASTS', 'STUDY & WORK', 'SIMULATIONS', 'LIFESTYLE'])];

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <PageHeader
          title="AI Productivity & Lifestyle Assistant"
          description="Understand your productivity, habits, behaviour, lifestyle patterns, forecasts, and simulations using your personal data."
        />
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>Database Connected</span>
          </div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
            <Activity className="w-3 h-3" />
            <span>Analytics Ready</span>
          </div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
            <TrendingUp className="w-3 h-3" />
            <span>Forecasting Ready</span>
          </div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
            <Cpu className="w-3 h-3" />
            <span>Simulation Ready</span>
          </div>
          <div
            title={readinessMeta?.rag_retrieval?.description || 'RAG architecture ready for productivity and lifestyle documents'}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
          >
            <Info className="w-3 h-3" />
            <span>RAG Ready</span>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 h-[calc(100vh-190px)] min-h-[550px]">
        {/* Left Column: Conversations Sidebar */}
        <div className="lg:col-span-1 bg-surface rounded-card border border-border flex flex-col overflow-hidden">
          <div className="p-3 border-b border-border flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
              Conversations ({conversations.length})
            </h3>
            <button
              onClick={handleNewChat}
              className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-button bg-primary text-white hover:bg-primary-hover transition-colors shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Chat</span>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {isLoading && conversations.length === 0 ? (
              <div className="flex items-center justify-center p-8 text-xs text-text-secondary">
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Loading conversations...
              </div>
            ) : conversations.length === 0 ? (
              <div className="text-center p-6 text-xs text-text-secondary">
                <Bot className="w-8 h-8 mx-auto mb-2 text-text-secondary/60" />
                <p>No conversations yet.</p>
                <p className="mt-1 text-[11px]">Click &quot;New Chat&quot; to start an analysis session.</p>
              </div>
            ) : (
              conversations.map((conv) => {
                const isActive = conv.id === activeConvId;
                return (
                  <div
                    key={conv.id}
                    onClick={() => handleSelectConversation(conv.id)}
                    className={`group relative flex items-center justify-between p-2.5 rounded-lg text-xs cursor-pointer transition-colors ${
                      isActive
                        ? 'bg-primary-light text-primary font-medium border border-primary/20'
                        : 'text-text-primary hover:bg-muted'
                    }`}
                  >
                    <div className="min-w-0 flex-1 pr-2">
                      <p className="truncate">{conv.title}</p>
                      <div className="flex items-center gap-2 mt-1 text-[10px] text-text-secondary">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(conv.updated_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                        </span>
                        <span>· {conv.message_count} msgs</span>
                      </div>
                    </div>
                    <button
                      onClick={(e) => handleDeleteConversation(e, conv.id)}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-status-danger-bg hover:text-status-danger text-text-secondary transition-opacity"
                      title="Delete conversation"
                      aria-label="Delete conversation"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Columns: Main Chat Area */}
        <div className="lg:col-span-3 bg-surface rounded-card border border-border flex flex-col overflow-hidden">
          {/* Conversation Header */}
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary-light text-primary shrink-0">
                <Bot className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h2 className="text-sm font-semibold text-text-primary truncate">
                  {activeConversation?.title || 'New Conversation'}
                </h2>
                <p className="text-[11px] text-text-secondary">
                  Personal Intelligence Assistant · Strict user-data isolation
                </p>
              </div>
            </div>
            {activeConversation && activeConversation.messages.length > 0 && (
              <button
                onClick={handleNewChat}
                className="text-xs text-primary hover:underline font-medium shrink-0"
              >
                Start New Thread
              </button>
            )}
          </div>

          {/* Messages Viewport */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {!activeConversation || activeConversation.messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center max-w-xl mx-auto text-center py-6 px-2">
                <div className="p-3.5 rounded-2xl bg-primary-light text-primary mb-3 shadow-inner">
                  <Sparkles className="w-8 h-8" />
                </div>
                <h3 className="text-base font-semibold text-text-primary">
                  Personal Intelligence Assistant
                </h3>
                <p className="mt-1 text-xs text-text-secondary max-w-md">
                  Ask questions about your productivity, habits, behaviour, lifestyle patterns, financial activity, forecasts, and future simulations.
                </p>

                {/* Category Filter Chips */}
                <div className="mt-5 w-full">
                  <div className="flex items-center justify-center gap-1.5 flex-wrap mb-3">
                    {availableCategories.map((cat) => (
                      <button
                        key={cat}
                        onClick={() => setSelectedCategory(cat)}
                        className={`px-2.5 py-1 rounded-full text-[10px] font-semibold tracking-wider transition-colors ${
                          selectedCategory === cat
                            ? 'bg-primary text-white shadow-xs'
                            : 'bg-muted text-text-secondary hover:text-text-primary hover:bg-muted/80'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>

                  <div className="space-y-1.5 text-left">
                    {activeSuggestions.slice(0, 6).map((item, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSendMessage(item.question)}
                        className="w-full text-left p-2.5 rounded-lg text-xs bg-muted hover:bg-primary-light/40 hover:text-primary border border-border transition-colors flex items-center justify-between group"
                      >
                        <div className="flex items-center gap-2 min-w-0 pr-2">
                          <span className="shrink-0 px-1.5 py-0.5 rounded text-[9px] font-medium bg-primary/10 text-primary">
                            {item.category}
                          </span>
                          <span className="truncate text-text-primary group-hover:text-primary">{item.question}</span>
                        </div>
                        <ExternalLink className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 text-primary transition-opacity shrink-0 ml-1" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              activeConversation.messages.map((msg) => {
                const isUser = msg.sender === 'user';
                return (
                  <div
                    key={msg.id}
                    className={`flex items-start gap-2.5 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
                  >
                    {!isUser && (
                      <div className="w-7 h-7 rounded-lg bg-primary-light text-primary flex items-center justify-center shrink-0 mt-0.5">
                        <Bot className="w-4 h-4" />
                      </div>
                    )}
                    <div
                      className={`group relative max-w-[82%] rounded-xl px-3.5 py-2.5 text-xs leading-relaxed ${
                        isUser
                          ? 'bg-primary text-white rounded-br-none shadow-sm'
                          : 'bg-muted text-text-primary rounded-bl-none border border-border'
                      }`}
                    >
                      <MarkdownRenderer content={msg.content} isUser={isUser} />

                      <div
                        className={`flex items-center justify-between gap-3 mt-1.5 pt-1 text-[10px] ${
                          isUser ? 'text-white/70 border-t border-white/10' : 'text-text-secondary border-t border-border'
                        }`}
                      >
                        <span>
                          {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {!isUser && (
                          <button
                            onClick={() => handleCopyMessage(msg.id, msg.content)}
                            className="inline-flex items-center gap-1 opacity-70 hover:opacity-100 transition-opacity"
                            title="Copy response"
                          >
                            {copiedMsgId === msg.id ? (
                              <>
                                <Check className="w-3 h-3 text-status-success" />
                                <span className="text-status-success">Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" />
                                <span>Copy</span>
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}

            {isSending && (
              <div className="flex items-start gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-primary-light text-primary flex items-center justify-center shrink-0 mt-0.5">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="bg-muted text-text-primary rounded-xl rounded-bl-none border border-border px-3.5 py-2.5 text-xs flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                  <span>Synthesizing personal records, forecasts, and habit patterns...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-3 border-t border-border bg-surface">
            <div className="relative flex items-end gap-2 bg-muted rounded-xl border border-border p-2 focus-within:border-primary transition-colors">
              <textarea
                ref={textareaRef}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about your productivity, habits, behaviour, forecasts, or simulations... (Press Enter to send)"
                rows={2}
                disabled={isSending}
                className="flex-1 bg-transparent text-xs text-text-primary placeholder:text-text-secondary outline-none resize-none px-1"
              />
              <button
                onClick={() => handleSendMessage()}
                disabled={!inputText.trim() || isSending}
                className="h-8 w-8 rounded-lg bg-primary text-white flex items-center justify-center shrink-0 hover:bg-primary-hover disabled:opacity-40 disabled:hover:bg-primary transition-colors"
                aria-label="Send message"
              >
                {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </div>
            <p className="mt-1 text-[10px] text-center text-text-secondary">
              Responses are grounded in verified personal database records. Insufficient evidence is explicitly flagged.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
