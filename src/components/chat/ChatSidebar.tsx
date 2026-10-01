import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Plus,
  Search,
  MessageSquare,
  Pin,
  Archive,
  Trash2,
  Edit2,
  Download,
  MoreVertical,
  X,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import type { Conversation } from '../../types';

interface ChatSidebarProps {
  conversations: Conversation[];
  activeConvId: number | null;
  onSelectConversation: (id: number) => void;
  onNewChat: () => void;
  onDeleteConversation: (id: number) => void;
  onRenameConversation: (id: number, newTitle: string) => void;
  onTogglePin: (id: number, currentPinned: boolean) => void;
  onToggleArchive: (id: number, currentArchived: boolean) => void;
  onExportConversation: (id: number, format: 'markdown' | 'json') => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
}

export const ChatSidebar: React.FC<ChatSidebarProps> = ({
  conversations,
  activeConvId,
  onSelectConversation,
  onNewChat,
  onDeleteConversation,
  onRenameConversation,
  onTogglePin,
  onToggleArchive,
  onExportConversation,
  isMobileOpen,
  onCloseMobile,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [menuOpenConvId, setMenuOpenConvId] = useState<number | null>(null);
  const [editingConvId, setEditingConvId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [showArchived, setShowArchived] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcut Ctrl/Cmd + K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (editingConvId) {
      editInputRef.current?.focus();
      editInputRef.current?.select();
    }
  }, [editingConvId]);

  // Close three-dot menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setMenuOpenConvId(null);
    if (menuOpenConvId !== null) {
      window.addEventListener('click', handleClickOutside);
      return () => window.removeEventListener('click', handleClickOutside);
    }
  }, [menuOpenConvId]);

  // Filter conversations
  const filteredConversations = useMemo(() => {
    return conversations.filter((c) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        c.title.toLowerCase().includes(q) ||
        (c.last_message && c.last_message.toLowerCase().includes(q))
      );
    });
  }, [conversations, searchQuery]);

  // Group conversations into Today, Yesterday, Previous 7 Days, Older, and Pinned
  const groups = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startOfYesterday = startOfToday - 24 * 60 * 60 * 1000;
    const startOf7Days = startOfToday - 7 * 24 * 60 * 60 * 1000;

    const pinned: Conversation[] = [];
    const today: Conversation[] = [];
    const yesterday: Conversation[] = [];
    const prev7Days: Conversation[] = [];
    const older: Conversation[] = [];
    const archived: Conversation[] = [];

    for (const c of filteredConversations) {
      if (c.is_archived) {
        archived.push(c);
        continue;
      }
      if (c.is_pinned) {
        pinned.push(c);
        continue;
      }

      const updatedTime = new Date(c.updated_at || c.created_at).getTime();
      if (updatedTime >= startOfToday) {
        today.push(c);
      } else if (updatedTime >= startOfYesterday) {
        yesterday.push(c);
      } else if (updatedTime >= startOf7Days) {
        prev7Days.push(c);
      } else {
        older.push(c);
      }
    }

    return { pinned, today, yesterday, prev7Days, older, archived };
  }, [filteredConversations]);

  const handleStartRename = (conv: Conversation) => {
    setEditingConvId(conv.id);
    setEditTitle(conv.title);
    setMenuOpenConvId(null);
  };

  const handleSaveRename = (convId: number) => {
    if (editTitle.trim()) {
      onRenameConversation(convId, editTitle.trim());
    }
    setEditingConvId(null);
  };

  const renderConversationItem = (conv: Conversation) => {
    const isActive = conv.id === activeConvId;
    const isEditing = editingConvId === conv.id;

    return (
      <div
        key={conv.id}
        onClick={() => {
          if (!isEditing) {
            onSelectConversation(conv.id);
            onCloseMobile();
          }
        }}
        className={`group relative flex items-center justify-between px-2.5 py-2 rounded-lg text-xs cursor-pointer transition-all ${
          isActive
            ? 'bg-primary-light text-primary font-medium border border-primary/20 shadow-xs'
            : 'text-text-primary hover:bg-muted/80'
        }`}
      >
        <div className="min-w-0 flex-1 pr-2">
          {isEditing ? (
            <input
              ref={editInputRef}
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onBlur={() => handleSaveRename(conv.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveRename(conv.id);
                if (e.key === 'Escape') setEditingConvId(null);
              }}
              onClick={(e) => e.stopPropagation()}
              className="w-full bg-surface border border-primary rounded px-1.5 py-0.5 text-xs text-text-primary outline-none"
            />
          ) : (
            <div className="flex items-center gap-1.5 min-w-0">
              {conv.is_pinned && <Pin className="w-3 h-3 text-amber-500 shrink-0" />}
              <p className="truncate font-medium">{conv.title}</p>
            </div>
          )}
          <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-text-secondary">
            <span>{conv.message_count} {conv.message_count === 1 ? 'msg' : 'msgs'}</span>
            <span>·</span>
            <span>{new Date(conv.updated_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
          </div>
        </div>

        {/* Action Menu Button */}
        <div className="relative shrink-0" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => setMenuOpenConvId(menuOpenConvId === conv.id ? null : conv.id)}
            className={`p-1 rounded text-text-secondary hover:text-text-primary hover:bg-muted transition-opacity ${
              isActive || menuOpenConvId === conv.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
            }`}
            title="Conversation actions"
            aria-label="Conversation actions"
          >
            <MoreVertical className="w-3.5 h-3.5" />
          </button>

          {/* Context Dropdown Menu */}
          {menuOpenConvId === conv.id && (
            <div className="absolute right-0 top-full mt-1 w-44 rounded-lg bg-surface border border-border shadow-card py-1 z-30 text-xs">
              <button
                onClick={() => {
                  onSelectConversation(conv.id);
                  setMenuOpenConvId(null);
                  onCloseMobile();
                }}
                className="w-full px-3 py-1.5 text-left flex items-center gap-2 hover:bg-muted text-text-primary"
              >
                <MessageSquare className="w-3.5 h-3.5 text-text-secondary" />
                <span>Open chat</span>
              </button>
              <button
                onClick={() => handleStartRename(conv)}
                className="w-full px-3 py-1.5 text-left flex items-center gap-2 hover:bg-muted text-text-primary"
              >
                <Edit2 className="w-3.5 h-3.5 text-text-secondary" />
                <span>Rename</span>
              </button>
              <button
                onClick={() => {
                  onTogglePin(conv.id, !!conv.is_pinned);
                  setMenuOpenConvId(null);
                }}
                className="w-full px-3 py-1.5 text-left flex items-center gap-2 hover:bg-muted text-text-primary"
              >
                <Pin className="w-3.5 h-3.5 text-text-secondary" />
                <span>{conv.is_pinned ? 'Unpin chat' : 'Pin chat'}</span>
              </button>
              <button
                onClick={() => {
                  onToggleArchive(conv.id, !!conv.is_archived);
                  setMenuOpenConvId(null);
                }}
                className="w-full px-3 py-1.5 text-left flex items-center gap-2 hover:bg-muted text-text-primary"
              >
                <Archive className="w-3.5 h-3.5 text-text-secondary" />
                <span>{conv.is_archived ? 'Unarchive' : 'Archive'}</span>
              </button>
              <button
                onClick={() => {
                  onExportConversation(conv.id, 'markdown');
                  setMenuOpenConvId(null);
                }}
                className="w-full px-3 py-1.5 text-left flex items-center gap-2 hover:bg-muted text-text-primary"
              >
                <Download className="w-3.5 h-3.5 text-text-secondary" />
                <span>Export as Markdown</span>
              </button>
              <button
                onClick={() => {
                  onExportConversation(conv.id, 'json');
                  setMenuOpenConvId(null);
                }}
                className="w-full px-3 py-1.5 text-left flex items-center gap-2 hover:bg-muted text-text-primary"
              >
                <Download className="w-3.5 h-3.5 text-text-secondary" />
                <span>Export as JSON</span>
              </button>
              <div className="border-t border-border my-1" />
              <button
                onClick={() => {
                  onDeleteConversation(conv.id);
                  setMenuOpenConvId(null);
                }}
                className="w-full px-3 py-1.5 text-left flex items-center gap-2 hover:bg-status-danger-bg text-status-danger"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete chat</span>
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  const content = (
    <div className="flex flex-col h-full bg-surface border border-border rounded-xl overflow-hidden shadow-xs">
      {/* Sidebar Header: New Chat & Search */}
      <div className="p-3 border-b border-border space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
            Chats ({conversations.length})
          </span>
          {isMobileOpen && (
            <button
              onClick={onCloseMobile}
              className="p-1 rounded text-text-secondary hover:text-text-primary lg:hidden"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* New Chat Button */}
        <button
          onClick={() => {
            onNewChat();
            onCloseMobile();
          }}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-primary text-white text-xs font-semibold hover:bg-primary-hover transition-colors shadow-xs"
        >
          <Plus className="w-4 h-4" />
          <span>New Chat</span>
        </button>

        {/* Search input with shortcut hint */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-text-secondary absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search conversations..."
            className="w-full h-8 pl-8 pr-12 text-xs bg-muted border border-border rounded-lg text-text-primary placeholder:text-text-secondary outline-none focus:border-primary transition-colors"
          />
          <kbd className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-text-secondary px-1.5 py-0.5 rounded bg-surface border border-border/80 font-mono">
            ⌘K
          </kbd>
        </div>
      </div>

      {/* Conversations List grouped by time */}
      <div className="flex-1 overflow-y-auto p-2 space-y-3">
        {filteredConversations.length === 0 ? (
          <div className="text-center p-6 text-xs text-text-secondary space-y-2">
            <MessageSquare className="w-7 h-7 mx-auto text-text-secondary/50" />
            <p>{searchQuery ? 'No matching conversations' : 'No conversations yet'}</p>
            <p className="text-[11px]">Click &quot;New Chat&quot; to begin.</p>
          </div>
        ) : (
          <>
            {/* Pinned Group */}
            {groups.pinned.length > 0 && (
              <div className="space-y-1">
                <div className="px-2 text-[10px] font-semibold uppercase tracking-wider text-amber-500 flex items-center gap-1">
                  <Pin className="w-3 h-3" />
                  <span>Pinned</span>
                </div>
                {groups.pinned.map(renderConversationItem)}
              </div>
            )}

            {/* Today Group */}
            {groups.today.length > 0 && (
              <div className="space-y-1">
                <div className="px-2 text-[10px] font-semibold uppercase tracking-wider text-text-secondary">
                  Today
                </div>
                {groups.today.map(renderConversationItem)}
              </div>
            )}

            {/* Yesterday Group */}
            {groups.yesterday.length > 0 && (
              <div className="space-y-1">
                <div className="px-2 text-[10px] font-semibold uppercase tracking-wider text-text-secondary">
                  Yesterday
                </div>
                {groups.yesterday.map(renderConversationItem)}
              </div>
            )}

            {/* Previous 7 Days Group */}
            {groups.prev7Days.length > 0 && (
              <div className="space-y-1">
                <div className="px-2 text-[10px] font-semibold uppercase tracking-wider text-text-secondary">
                  Previous 7 Days
                </div>
                {groups.prev7Days.map(renderConversationItem)}
              </div>
            )}

            {/* Older Group */}
            {groups.older.length > 0 && (
              <div className="space-y-1">
                <div className="px-2 text-[10px] font-semibold uppercase tracking-wider text-text-secondary">
                  Older
                </div>
                {groups.older.map(renderConversationItem)}
              </div>
            )}

            {/* Archived Group */}
            {groups.archived.length > 0 && (
              <div className="space-y-1 pt-2 border-t border-border">
                <button
                  onClick={() => setShowArchived(!showArchived)}
                  className="w-full px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-text-secondary flex items-center justify-between hover:text-text-primary"
                >
                  <span className="flex items-center gap-1">
                    <Archive className="w-3 h-3" />
                    <span>Archived ({groups.archived.length})</span>
                  </span>
                  {showArchived ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                </button>
                {showArchived && groups.archived.map(renderConversationItem)}
              </div>
            )}
          </>
        )}
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
          <div className="fixed inset-y-0 left-0 w-80 max-w-[85vw] p-3 shadow-xl">
            {content}
          </div>
        </div>
      )}
    </>
  );
};
