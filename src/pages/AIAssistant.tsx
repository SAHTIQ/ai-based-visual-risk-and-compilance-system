import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { api } from '../services/api';
import type { Conversation, ConversationDetail, ChatMessage, InlineCardsData } from '../types';
import { useApp } from '../context/AppContext';
import { ChatSidebar } from '../components/chat/ChatSidebar';
import { ChatHeader } from '../components/chat/ChatHeader';
import { ChatComposer } from '../components/chat/ChatComposer';
import { ChatMessageItem } from '../components/chat/ChatMessageItem';
import { ChatContextPanel } from '../components/chat/ChatContextPanel';
import { ChatEmptyState } from '../components/chat/ChatEmptyState';
import { InlineCards } from '../components/chat/InlineCards';

const SAVED_INSIGHTS_KEY = 'user_saved_insights_v1';

export const AIAssistant: React.FC = () => {
  const { showToast } = useApp();
  const location = useLocation();
  const navigate = useNavigate();

  // Conversations state
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<number | null>(null);
  const [activeConversation, setActiveConversation] = useState<ConversationDetail | null>(null);

  // Streaming & Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStatus, setGenerationStatus] = useState<string>('');
  const [streamingContent, setStreamingContent] = useState<string>('');
  const [streamingCards, setStreamingCards] = useState<InlineCardsData | null>(null);

  // Panels & UI State
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(true);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isMobileContextOpen, setIsMobileContextOpen] = useState(false);
  const [selectedModelTier, setSelectedModelTier] = useState<string>('auto');

  // Metadata & Context
  const [activeSourcesUsed, setActiveSourcesUsed] = useState<string[]>([]);
  const [activeDataSummary, setActiveDataSummary] = useState<Record<string, any> | null>(null);
  const [suggestionsMeta, setSuggestionsMeta] = useState<{ categories: string[]; suggestions: any[] } | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  // Saved Insights
  const [savedInsights, setSavedInsights] = useState<Array<{ id: string; text: string; date: string }>>(() => {
    try {
      const stored = localStorage.getItem(SAVED_INSIGHTS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const abortControllerRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 60);
  };

  // Load initial data
  useEffect(() => {
    loadConversations();
    api
      .getChatSuggestions()
      .then(setSuggestionsMeta)
      .catch(() => {
        setSuggestionsMeta({
          categories: ['PRODUCTIVITY', 'HABITS', 'FORECASTS', 'STUDY & WORK', 'SIMULATIONS', 'LIFESTYLE'],
          suggestions: [
            { category: 'PRODUCTIVITY', question: 'Summarize my recent productivity and activity patterns.' },
            { category: 'HABITS', question: 'What habits are affecting my productivity the most?' },
            { category: 'FORECASTS', question: 'Explain my latest forecast and the factors influencing it.' },
            { category: 'SIMULATIONS', question: 'What does my latest simulation indicate about my future routine?' },
            { category: 'STUDY & WORK', question: 'What are the main patterns in my study and work sessions?' },
            { category: 'LIFESTYLE', question: 'Give me practical recommendations based on my recent activity.' },
          ],
        });
      });
  }, []);

  // Handle incoming contextual prompt from other pages ("Ask AI about this")
  useEffect(() => {
    const navState = location.state as { prompt?: string; initialPrompt?: string } | null;
    const promptToSend = navState?.prompt || navState?.initialPrompt;

    if (promptToSend) {
      // Clear location state so refresh doesn't re-trigger
      navigate(location.pathname, { replace: true, state: {} });
      handleSendPrompt(promptToSend);
    }
  }, [location.state]);

  const loadConversations = async (selectId?: number) => {
    try {
      const list = await api.getConversations(true);
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
    }
  };

  const loadConversationDetail = async (convId: number) => {
    try {
      const detail = await api.getConversationDetail(convId);
      setActiveConversation(detail);

      // Extract sources & summary from latest assistant message metadata if available
      const lastAsst = [...detail.messages].reverse().find((m) => m.sender === 'assistant');
      if (lastAsst?.metadata_json) {
        try {
          const parsed = JSON.parse(lastAsst.metadata_json);
          if (parsed.sources_used) setActiveSourcesUsed(parsed.sources_used);
          if (parsed.data_summary) setActiveDataSummary(parsed.data_summary);
        } catch {}
      }
      scrollToBottom();
    } catch {
      showToast('Failed to load conversation history', 'error');
    }
  };

  const handleSelectConversation = async (convId: number) => {
    if (convId === activeConvId) return;
    if (isGenerating) handleStopGeneration();
    setActiveConvId(convId);
    await loadConversationDetail(convId);
  };

  const handleNewChat = async () => {
    if (isGenerating) handleStopGeneration();
    try {
      const created = await api.createConversation('New Chat');
      await loadConversations(created.id);
      showToast('Started new conversation', 'success');
    } catch {
      showToast('Failed to start new conversation', 'error');
    }
  };

  const handleDeleteConversation = async (convId: number) => {
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

  const handleRenameConversation = async (convId: number, newTitle: string) => {
    try {
      const updated = await api.updateConversation(convId, { title: newTitle });
      setConversations((prev) => prev.map((c) => (c.id === convId ? updated : c)));
      if (activeConversation && activeConversation.id === convId) {
        setActiveConversation((prev) => (prev ? { ...prev, title: newTitle } : null));
      }
      showToast('Conversation renamed', 'success');
    } catch {
      showToast('Failed to rename conversation', 'error');
    }
  };

  const handleTogglePin = async (convId: number, currentPinned: boolean) => {
    try {
      const updated = await api.updateConversation(convId, { is_pinned: !currentPinned });
      setConversations((prev) =>
        prev
          .map((c) => (c.id === convId ? updated : c))
          .sort((a, b) => (b.is_pinned ? 1 : 0) - (a.is_pinned ? 1 : 0))
      );
      showToast(updated.is_pinned ? 'Conversation pinned' : 'Conversation unpinned', 'info');
    } catch {
      showToast('Failed to update pin status', 'error');
    }
  };

  const handleToggleArchive = async (convId: number, currentArchived: boolean) => {
    try {
      const updated = await api.updateConversation(convId, { is_archived: !currentArchived });
      setConversations((prev) => prev.map((c) => (c.id === convId ? updated : c)));
      showToast(updated.is_archived ? 'Conversation archived' : 'Conversation unarchived', 'info');
    } catch {
      showToast('Failed to update archive status', 'error');
    }
  };

  const handleExportConversation = async (convId: number, format: 'markdown' | 'json') => {
    try {
      const data = await api.exportConversation(convId, format);
      const filename = `${(data.title || 'chat').replace(/[^a-z0-9_-]/gi, '_')}.${format === 'json' ? 'json' : 'md'}`;
      const blob = new Blob([format === 'json' ? JSON.stringify(data, null, 2) : data.markdown], {
        type: format === 'json' ? 'application/json' : 'text/markdown',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast(`Exported conversation as ${format.toUpperCase()}`, 'success');
    } catch {
      showToast('Failed to export conversation', 'error');
    }
  };

  const handleStopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsGenerating(false);
    setGenerationStatus('');
  };

  const handleSendPrompt = async (promptText: string, actionModifier?: string) => {
    const content = promptText.trim();
    if (!content || isGenerating) return;

    let targetConvId = activeConvId;

    try {
      // 1. Ensure conversation exists
      if (!targetConvId) {
        const newConv = await api.createConversation('New Chat');
        targetConvId = newConv.id;
        setActiveConvId(newConv.id);
        setConversations((prev) => [newConv, ...prev]);
      }

      // Optimistic user message
      const optimisticUserMsg: ChatMessage = {
        id: Date.now(),
        conversation_id: targetConvId,
        sender: 'user',
        content,
        created_at: new Date().toISOString(),
      };

      setActiveConversation((prev) => {
        if (!prev) {
          return {
            id: targetConvId!,
            user_id: 0,
            title: content.slice(0, 30),
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

      // Setup streaming state
      setIsGenerating(true);
      setGenerationStatus('Analyzing your data...');
      setStreamingContent('');
      setStreamingCards(null);

      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      let accumulatedText = '';

      await api.streamChatMessage(
        targetConvId,
        content,
        {
          onStatus: (status) => {
            setGenerationStatus(status);
          },
          onMeta: (meta) => {
            if (meta.sources_used) setActiveSourcesUsed(meta.sources_used);
            if (meta.data_summary) setActiveDataSummary(meta.data_summary);
            if (meta.inline_cards) setStreamingCards(meta.inline_cards);
          },
          onChunk: (chunk) => {
            accumulatedText += chunk;
            setStreamingContent(accumulatedText);
            scrollToBottom();
          },
          onDone: async () => {
            setIsGenerating(false);
            setGenerationStatus('');
            setStreamingContent('');
            setStreamingCards(null);
            await loadConversationDetail(targetConvId!);
            const updatedList = await api.getConversations(true);
            setConversations(updatedList);
          },
          onError: () => {
            setIsGenerating(false);
            setGenerationStatus('');
            showToast('AI service is temporarily unavailable. Please try again.', 'error');
          },
        },
        abortController.signal,
        actionModifier,
        selectedModelTier
      );
    } catch {
      setIsGenerating(false);
      setGenerationStatus('');
      showToast('AI service is temporarily unavailable. Please try again.', 'error');
    }
  };

  const handleMessageAction = (action: 'explain_simply' | 'explain_detailed' | 'make_shorter' | 'make_bullets') => {
    if (!activeConversation || activeConversation.messages.length === 0) return;
    const lastUserMessage = [...activeConversation.messages].reverse().find((m) => m.sender === 'user');
    const query = lastUserMessage?.content || 'Explain my data';

    const actionPrompts = {
      explain_simply: 'Can you explain the previous answer in simple, intuitive terms without technical jargon?',
      explain_detailed: 'Can you provide an in-depth, rigorous breakdown with detailed underlying factors?',
      make_shorter: 'Can you summarize the key takeaway into 2-3 concise sentences?',
      make_bullets: 'Can you format the key insights as crisp, high-signal bullet points?',
    };

    handleSendPrompt(actionPrompts[action] || query, action);
  };

  const handleRegenerate = () => {
    if (!activeConversation || activeConversation.messages.length === 0) return;
    const lastUserMessage = [...activeConversation.messages].reverse().find((m) => m.sender === 'user');
    if (lastUserMessage) {
      handleSendPrompt(lastUserMessage.content);
    }
  };

  const handleSaveInsight = (text: string) => {
    const newInsight = {
      id: `ins-${Date.now()}`,
      text: text.slice(0, 240),
      date: new Date().toLocaleDateString([], { month: 'short', day: 'numeric' }),
    };
    const updated = [newInsight, ...savedInsights].slice(0, 20);
    setSavedInsights(updated);
    try {
      localStorage.setItem(SAVED_INSIGHTS_KEY, JSON.stringify(updated));
    } catch {}
    showToast('Saved insight to Your Data panel', 'success');
  };

  const handleRemoveSavedInsight = (id: string) => {
    const updated = savedInsights.filter((i) => i.id !== id);
    setSavedInsights(updated);
    try {
      localStorage.setItem(SAVED_INSIGHTS_KEY, JSON.stringify(updated));
    } catch {}
    showToast('Removed insight', 'info');
  };

  const activeTitle = activeConversation?.title || 'Personal Intelligence Assistant';
  const hasMessages = !!(activeConversation && activeConversation.messages.length > 0);

  return (
    <div className="flex-1 flex w-full h-full min-h-0 gap-3 overflow-hidden">
      {/* 1. Left Sidebar: Conversations */}
      <ChatSidebar
        conversations={conversations}
        activeConvId={activeConvId}
        onSelectConversation={handleSelectConversation}
        onNewChat={handleNewChat}
        onDeleteConversation={handleDeleteConversation}
        onRenameConversation={handleRenameConversation}
        onTogglePin={handleTogglePin}
        onToggleArchive={handleToggleArchive}
        onExportConversation={handleExportConversation}
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

      {/* 2. Center: Main Chat Workspace */}
      <div className="flex-1 flex flex-col h-full bg-surface border border-border rounded-xl overflow-hidden shadow-xs min-w-0">
        {/* Chat Header */}
        <ChatHeader
          activeTitle={activeTitle}
          hasMessages={hasMessages}
          onNewChat={handleNewChat}
          isRightPanelOpen={isRightPanelOpen}
          onToggleRightPanel={() => setIsRightPanelOpen(!isRightPanelOpen)}
          onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
          onOpenMobileContext={() => setIsMobileContextOpen(true)}
          selectedModelTier={selectedModelTier}
          onSelectModelTier={setSelectedModelTier}
          sourcesCount={activeSourcesUsed.length}
        />

        {/* Messages Viewport */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {!hasMessages ? (
            <ChatEmptyState
              categories={suggestionsMeta?.categories || ['PRODUCTIVITY', 'HABITS', 'FORECASTS', 'STUDY & WORK', 'SIMULATIONS', 'LIFESTYLE']}
              suggestions={suggestionsMeta?.suggestions || []}
              selectedCategory={selectedCategory}
              onSelectCategory={setSelectedCategory}
              onSelectPrompt={handleSendPrompt}
            />
          ) : (
            <>
              {activeConversation.messages.map((msg, index) => {
                const isLatestAsst =
                  msg.sender === 'assistant' &&
                  index === activeConversation.messages.length - 1 &&
                  !isGenerating;

                return (
                  <ChatMessageItem
                    key={msg.id}
                    message={msg}
                    onCopy={(content) => {
                      navigator.clipboard.writeText(content);
                      showToast('Copied to clipboard', 'info');
                    }}
                    onRegenerate={isLatestAsst ? handleRegenerate : undefined}
                    onAction={handleMessageAction}
                    onSaveInsight={handleSaveInsight}
                    isLatestAssistant={isLatestAsst}
                  />
                );
              })}

              {/* Streaming In-Progress Assistant Bubble */}
              {isGenerating && (
                <div className="flex items-start gap-3 py-2">
                  <div className="w-8 h-8 rounded-xl bg-primary-light text-primary flex items-center justify-center shrink-0 mt-0.5 border border-primary/20 shadow-xs">
                    <Loader2 className="w-4 h-4 animate-spin" />
                  </div>
                  <div className="flex flex-col min-w-0 max-w-[85%] sm:max-w-[78%]">
                    <div className="rounded-2xl px-4 py-3 text-xs leading-relaxed bg-surface text-text-primary rounded-tl-xs border border-border shadow-2xs space-y-2">
                      {/* Operational Status Information */}
                      <div className="flex items-center gap-2 text-text-secondary font-medium pb-1.5 border-b border-border/50 text-[11px]">
                        <span className="w-2 h-2 rounded-full bg-primary animate-ping" />
                        <span>{generationStatus || 'Analyzing your data...'}</span>
                      </div>

                      {/* Streamed text as it arrives */}
                      {streamingContent ? (
                        <div className="whitespace-pre-wrap">{streamingContent}</div>
                      ) : (
                        <p className="text-text-secondary italic">
                          Synthesizing personalized analytics and predictive insights...
                        </p>
                      )}

                      {streamingCards && <InlineCards cards={streamingCards} />}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Chat Composer */}
        <ChatComposer
          onSendMessage={(content) => handleSendPrompt(content)}
          onStopGeneration={handleStopGeneration}
          isGenerating={isGenerating}
          onToggleContext={() => setIsRightPanelOpen(!isRightPanelOpen)}
        />
      </div>

      {/* 3. Right Panel: Collapsible Data & Insights */}
      {isRightPanelOpen && (
        <ChatContextPanel
          isOpen={isRightPanelOpen}
          onClose={() => setIsRightPanelOpen(false)}
          sourcesUsed={activeSourcesUsed}
          dataSummary={activeDataSummary}
          savedInsights={savedInsights}
          onRemoveSavedInsight={handleRemoveSavedInsight}
          isMobileOpen={isMobileContextOpen}
          onCloseMobile={() => setIsMobileContextOpen(false)}
        />
      )}
    </div>
  );
};
