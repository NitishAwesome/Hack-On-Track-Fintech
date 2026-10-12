'use client';

// ============================================================
// FINOVA — AI Chat Conversation History Sidebar
// components/insights/ChatSidebar.tsx
//
// Left sidebar for managing persistent conversation history:
// - New Chat
// - Search filter
// - Recent & Older grouping
// - Inline rename
// - Safe delete with confirmation dialog
// ============================================================

import React, { useState } from 'react';
import {
  Plus,
  Search,
  MessageSquare,
  MoreVertical,
  Edit2,
  Trash2,
  X,
  Check,
  AlertTriangle,
} from 'lucide-react';
import type { AIChatConversation } from '@/types/chat';

interface ChatSidebarProps {
  conversations: AIChatConversation[];
  activeConversationId?: string;
  onSelectConversation: (id: string) => void;
  onNewChat: () => void;
  onRenameConversation: (id: string, newTitle: string) => void;
  onDeleteConversation: (id: string) => void;
  isLoading?: boolean;
  onCloseMobile?: () => void;
}

export function ChatSidebar({
  conversations,
  activeConversationId,
  onSelectConversation,
  onNewChat,
  onRenameConversation,
  onDeleteConversation,
  isLoading = false,
  onCloseMobile,
}: ChatSidebarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { recentChats, olderChats, totalFiltered } = React.useMemo(() => {
    const q = searchQuery.toLowerCase();
    const filtered = conversations.filter((c) => c.title.toLowerCase().includes(q));
    const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return {
      recentChats: filtered.filter((c) => new Date(c.updated_at).getTime() >= cutoff),
      olderChats: filtered.filter((c) => new Date(c.updated_at).getTime() < cutoff),
      totalFiltered: filtered.length,
    };
  }, [conversations, searchQuery]);

  const startRename = (c: AIChatConversation) => {
    setEditingId(c.id);
    setEditTitle(c.title);
  };

  const handleSaveRename = (id: string) => {
    if (editTitle.trim()) {
      onRenameConversation(id, editTitle.trim());
    }
    setEditingId(null);
    setEditTitle('');
  };

  const handleConfirmDelete = () => {
    if (deletingId) {
      onDeleteConversation(deletingId);
      setDeletingId(null);
    }
  };

  return (
    <div
      className="w-full sm:w-64 md:w-72 flex flex-col h-full border-r bg-card/60"
      style={{
        borderColor: 'rgb(var(--border))',
      }}
    >
      {/* Top Header: New Chat & Mobile Close */}
      <div className="p-3 border-b flex items-center justify-between gap-2" style={{ borderColor: 'rgb(var(--border))' }}>
        <button
          type="button"
          onClick={onNewChat}
          className="flex-1 py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 bg-brand text-white hover:opacity-90 transition-all cursor-pointer shadow-xs"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Chat</span>
        </button>
        {onCloseMobile && (
          <button
            type="button"
            onClick={onCloseMobile}
            className="p-2 rounded-lg hover:bg-muted/20 text-muted sm:hidden"
            title="Close sidebar"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Search Input */}
      <div className="p-3 border-b" style={{ borderColor: 'rgb(var(--border))' }}>
        <div
          className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-xs"
          style={{
            backgroundColor: 'rgba(var(--foreground-rgb, 128,128,128), 0.03)',
            borderColor: 'rgb(var(--border))',
          }}
        >
          <Search className="w-3.5 h-3.5 text-muted flex-shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search chats..."
            className="w-full bg-transparent border-none outline-none text-xs text-foreground placeholder:text-muted"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="text-muted hover:text-foreground"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-4">
        {isLoading ? (
          <div className="space-y-2 p-2">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-9 rounded-lg bg-muted/10 animate-pulse"
              />
            ))}
          </div>
        ) : totalFiltered === 0 ? (
          <div className="text-center py-8 px-4 text-xs" style={{ color: 'rgb(var(--muted))' }}>
            <MessageSquare className="w-6 h-6 mx-auto mb-2 opacity-40" />
            <p>{searchQuery ? 'No chats match your search.' : 'No conversations yet.'}</p>
            <p className="text-[10px] mt-1">Start a new chat to begin research.</p>
          </div>
        ) : (
          <>
            {/* Recent Chats */}
            {recentChats.length > 0 && (
              <div className="space-y-1">
                <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted">
                  Recent
                </div>
                {recentChats.map((conv) => (
                  <ConversationListItem
                    key={conv.id}
                    conversation={conv}
                    isActive={conv.id === activeConversationId}
                    isEditing={conv.id === editingId}
                    editTitle={editTitle}
                    setEditTitle={setEditTitle}
                    onSaveRename={() => handleSaveRename(conv.id)}
                    onCancelRename={() => setEditingId(null)}
                    onSelect={() => onSelectConversation(conv.id)}
                    onStartRename={() => startRename(conv)}
                    onStartDelete={() => setDeletingId(conv.id)}
                  />
                ))}
              </div>
            )}

            {/* Older Chats */}
            {olderChats.length > 0 && (
              <div className="space-y-1">
                <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted">
                  Older
                </div>
                {olderChats.map((conv) => (
                  <ConversationListItem
                    key={conv.id}
                    conversation={conv}
                    isActive={conv.id === activeConversationId}
                    isEditing={conv.id === editingId}
                    editTitle={editTitle}
                    setEditTitle={setEditTitle}
                    onSaveRename={() => handleSaveRename(conv.id)}
                    onCancelRename={() => setEditingId(null)}
                    onSelect={() => onSelectConversation(conv.id)}
                    onStartRename={() => startRename(conv)}
                    onStartDelete={() => setDeletingId(conv.id)}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deletingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div
            className="w-full max-w-sm rounded-xl border p-4 shadow-xl space-y-3 bg-card"
            style={{
              borderColor: 'rgb(var(--border))',
            }}
          >
            <div className="flex items-center gap-2 text-rose-500 font-semibold text-sm">
              <AlertTriangle className="w-4 h-4" />
              <span>Delete Conversation?</span>
            </div>
            <p className="text-xs leading-relaxed" style={{ color: 'rgb(var(--muted))' }}>
              Are you sure you want to permanently delete this chat? All messages and citations in this conversation will be removed.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2 border-t" style={{ borderColor: 'rgb(var(--border))' }}>
              <button
                type="button"
                onClick={() => setDeletingId(null)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium border hover:bg-muted/10 transition-colors"
                style={{ borderColor: 'rgb(var(--border))' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-rose-600 text-white hover:bg-rose-700 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface ConversationListItemProps {
  conversation: AIChatConversation;
  isActive: boolean;
  isEditing: boolean;
  editTitle: string;
  setEditTitle: (val: string) => void;
  onSaveRename: () => void;
  onCancelRename: () => void;
  onSelect: () => void;
  onStartRename: () => void;
  onStartDelete: () => void;
}

function ConversationListItem({
  conversation,
  isActive,
  isEditing,
  editTitle,
  setEditTitle,
  onSaveRename,
  onCancelRename,
  onSelect,
  onStartRename,
  onStartDelete,
}: ConversationListItemProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  if (isEditing) {
    return (
      <div className="p-1.5 rounded-lg border flex items-center gap-1 bg-card" style={{ borderColor: 'rgb(var(--brand))' }}>
        <input
          type="text"
          value={editTitle}
          onChange={(e) => setEditTitle(e.target.value)}
          autoFocus
          onKeyDown={(e) => {
            if (e.key === 'Enter') onSaveRename();
            if (e.key === 'Escape') onCancelRename();
          }}
          className="flex-1 text-xs bg-transparent border-none outline-none px-1"
        />
        <button
          type="button"
          onClick={onSaveRename}
          className="p-1 hover:text-emerald-500 text-muted"
          title="Save"
        >
          <Check className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={onCancelRename}
          className="p-1 hover:text-rose-500 text-muted"
          title="Cancel"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div
      className={`group relative flex items-center justify-between rounded-lg px-2.5 py-2 text-xs transition-colors cursor-pointer ${
        isActive
          ? 'bg-brand/10 text-brand font-semibold border border-brand/20'
          : 'hover:bg-muted/10 text-foreground border border-transparent'
      }`}
      onClick={onSelect}
    >
      <div className="flex items-center gap-2 min-w-0 flex-1 pr-1">
        <MessageSquare className={`w-3.5 h-3.5 flex-shrink-0 ${isActive ? 'text-brand' : 'text-muted'}`} />
        <span className="truncate">{conversation.title}</span>
      </div>

      <div className="relative flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setMenuOpen(!menuOpen);
          }}
          className="p-1 rounded hover:bg-muted/20 text-muted hover:text-foreground"
          title="Conversation options"
        >
          <MoreVertical className="w-3 h-3" />
        </button>

        {menuOpen && (
          <div
            className="absolute right-0 top-full mt-1 z-30 w-28 rounded-lg border bg-card p-1 shadow-lg text-xs"
            style={{ borderColor: 'rgb(var(--border))' }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                onStartRename();
              }}
              className="w-full flex items-center gap-1.5 px-2 py-1 rounded hover:bg-muted/10 text-left text-muted hover:text-foreground text-[11px]"
            >
              <Edit2 className="w-3 h-3" />
              <span>Rename</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                onStartDelete();
              }}
              className="w-full flex items-center gap-1.5 px-2 py-1 rounded hover:bg-rose-500/10 text-left text-rose-500 text-[11px]"
            >
              <Trash2 className="w-3 h-3" />
              <span>Delete</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
