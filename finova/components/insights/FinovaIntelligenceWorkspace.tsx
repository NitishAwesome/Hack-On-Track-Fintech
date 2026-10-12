'use client';

// ============================================================
// FINOVA — AI Financial Intelligence Workspace
// components/insights/FinovaIntelligenceWorkspace.tsx
//
// Complete conversational assistant & research workspace:
// - Left Sidebar for persistent conversation history
// - Real-time portfolio grounding & source citations
// - Interactive suggested questions
// - Safe Markdown rendering & embedded metric snapshots
// - Secondary tab for Portfolio Intelligence Diagnostic Report
// ============================================================

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Sparkles,
  MessageSquare,
  FileText,
  Menu,
  Database,
} from 'lucide-react';
import { ChatSidebar } from './ChatSidebar';
import { ChatMessageItem } from './ChatMessageItem';
import { ChatComposer } from './ChatComposer';
import { SuggestedQuestions } from './SuggestedQuestions';
import { PortfolioIntelligenceHub } from './PortfolioIntelligenceHub';
import type { AIChatConversation, AIChatMessage } from '@/types/chat';

export function FinovaIntelligenceWorkspace() {
  const queryClient = useQueryClient();

  // Active view: 'chat' | 'diagnostics'
  const [activeView, setActiveView] = useState<'chat' | 'diagnostics'>('chat');
  const [sidebarOpenMobile, setSidebarOpenMobile] = useState(false);
  const [activeConversationId, setActiveConversationId] = useState<string | undefined>(undefined);
  const [isGenerating, setIsGenerating] = useState(false);
  const [abortController, setAbortController] = useState<AbortController | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 1. Fetch Conversations
  const {
    data: convData,
    isLoading: convsLoading,
    refetch: refetchConvs,
  } = useQuery({
    queryKey: ['ai-conversations'],
    queryFn: async () => {
      const res = await fetch('/api/ai/conversations');
      if (!res.ok) {
        // Unauthenticated or error
        return { conversations: [], persistenceStatus: 'session_fallback' };
      }
      return res.json();
    },
  });

  const conversations: AIChatConversation[] = useMemo(
    () => convData?.conversations || [],
    [convData?.conversations]
  );
  const persistenceStatus: string = convData?.persistenceStatus || 'persisted';

  // If activeConversationId not set and we have conversations, select the first one
  useEffect(() => {
    if (!activeConversationId && conversations.length > 0) {
      setActiveConversationId(conversations[0].id);
    }
  }, [conversations, activeConversationId]);

  // 2. Fetch Messages for active conversation
  const {
    data: msgData,
    isLoading: msgsLoading,
  } = useQuery({
    queryKey: ['ai-messages', activeConversationId],
    queryFn: async () => {
      if (!activeConversationId) return { messages: [] };
      const res = await fetch(`/api/ai/conversations/${activeConversationId}`);
      if (!res.ok) return { messages: [] };
      return res.json();
    },
    enabled: Boolean(activeConversationId),
  });

  const [localMessages, setLocalMessages] = useState<AIChatMessage[]>([]);

  // Synchronize remote messages into local state
  useEffect(() => {
    if (msgData?.messages) {
      setLocalMessages(msgData.messages);
    } else if (!activeConversationId) {
      setLocalMessages([]);
    }
  }, [msgData, activeConversationId]);

  // Scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [localMessages, isGenerating]);

  // 3. New Chat Handler
  const handleNewChat = () => {
    setActiveConversationId(undefined);
    setLocalMessages([]);
    setSidebarOpenMobile(false);
  };

  // 4. Send Message Handler
  const handleSendMessage = async (text: string) => {
    if (!text.trim() || isGenerating) return;

    const tempUserMsgId = `temp-user-${Date.now()}`;
    const tempUserMsg: AIChatMessage = {
      id: tempUserMsgId,
      conversation_id: activeConversationId || 'pending',
      role: 'user',
      content: text,
      created_at: new Date().toISOString(),
    };

    const tempAssistantMsgId = `temp-assistant-${Date.now()}`;
    const tempAssistantMsg: AIChatMessage = {
      id: tempAssistantMsgId,
      conversation_id: activeConversationId || 'pending',
      role: 'assistant',
      content: '',
      created_at: new Date().toISOString(),
      isPending: true,
    };

    setLocalMessages((prev) => [...prev, tempUserMsg, tempAssistantMsg]);
    setIsGenerating(true);

    const controller = new AbortController();
    setAbortController(controller);

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: activeConversationId,
          message: text,
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || 'Failed to generate AI response.');
      }

      const data = await res.json();

      // Update active conversation if this was a new chat
      if (data.conversation?.id && data.conversation.id !== activeConversationId) {
        setActiveConversationId(data.conversation.id);
      }

      // Replace pending message with completed assistant message
      setLocalMessages((prev) =>
        prev.map((m) => {
          if (m.id === tempUserMsgId) return data.userMessage || m;
          if (m.id === tempAssistantMsgId) return data.assistantMessage;
          return m;
        })
      );

      // Invalidate queries to refresh sidebar conversation list & title
      queryClient.invalidateQueries({ queryKey: ['ai-conversations'] });
    } catch (err: unknown) {
      const isAbort = err instanceof Error && err.name === 'AbortError';
      const errMsg = err instanceof Error ? err.message : 'Unable to connect to AI service. Please verify your connection or retry.';

      if (isAbort) {
        // User stopped generation
        setLocalMessages((prev) =>
          prev.map((m) =>
            m.id === tempAssistantMsgId
              ? { ...m, content: 'Generation stopped by user.', isPending: false }
              : m
          )
        );
      } else {
        setLocalMessages((prev) =>
          prev.map((m) =>
            m.id === tempAssistantMsgId
              ? {
                  ...m,
                  content: `### Response Error\n${errMsg}`,
                  isPending: false,
                  isError: true,
                }
              : m
          )
        );
      }
    } finally {
      setIsGenerating(false);
      setAbortController(null);
    }
  };

  const handleStop = () => {
    if (abortController) {
      abortController.abort();
    }
  };

  // 5. Rename Conversation
  const handleRename = async (id: string, newTitle: string) => {
    try {
      await fetch(`/api/ai/conversations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle }),
      });
      refetchConvs();
    } catch {
      // Ignore
    }
  };

  // 6. Delete Conversation
  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/ai/conversations/${id}`, {
        method: 'DELETE',
      });
      if (activeConversationId === id) {
        setActiveConversationId(undefined);
        setLocalMessages([]);
      }
      refetchConvs();
    } catch {
      // Ignore
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] min-h-[640px] rounded-xl border overflow-hidden bg-card shadow-xs" style={{ borderColor: 'rgb(var(--border))' }}>
      {/* Top Workspace Header */}
      <div className="px-4 py-3 border-b flex items-center justify-between gap-3 bg-card/80 backdrop-blur-xs z-10" style={{ borderColor: 'rgb(var(--border))' }}>
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setSidebarOpenMobile(!sidebarOpenMobile)}
            className="p-1.5 rounded-lg border hover:bg-muted/10 sm:hidden text-muted"
            title="Toggle conversation list"
            style={{ borderColor: 'rgb(var(--border))' }}
          >
            <Menu className="w-4 h-4" />
          </button>
          <div className="w-8 h-8 rounded-lg bg-brand/10 border border-brand/20 flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-4 h-4 text-brand" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold tracking-tight" style={{ color: 'rgb(var(--foreground))' }}>
                FINOVA Intelligence
              </h1>
              <span className="hidden sm:inline-flex px-1.5 py-0.5 rounded text-[10px] font-semibold bg-brand/10 text-brand border border-brand/20">
                Portfolio Aware
              </span>
            </div>
            <p className="text-[11px] text-muted line-clamp-1">
              Grounded conversational financial research, verified market data & per-user history
            </p>
          </div>
        </div>

        {/* View Switcher: Chat vs Diagnostics */}
        <div className="flex items-center gap-1.5">
          <div className="p-0.5 rounded-lg border flex items-center gap-1 bg-muted/20 text-xs" style={{ borderColor: 'rgb(var(--border))' }}>
            <button
              type="button"
              onClick={() => setActiveView('chat')}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeView === 'chat'
                  ? 'bg-card text-brand shadow-xs'
                  : 'text-muted hover:text-foreground'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Research Chat</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveView('diagnostics')}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeView === 'diagnostics'
                  ? 'bg-card text-brand shadow-xs'
                  : 'text-muted hover:text-foreground'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Diagnostic Hub</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Workspace Body */}
      {activeView === 'diagnostics' ? (
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <PortfolioIntelligenceHub />
        </div>
      ) : (
        <div className="flex-1 flex overflow-hidden relative">
          {/* Left Sidebar Desktop & Mobile Drawer */}
          <div
            className={`absolute sm:relative inset-y-0 left-0 z-30 transition-transform sm:translate-x-0 ${
              sidebarOpenMobile ? 'translate-x-0 shadow-2xl' : '-translate-x-full sm:translate-x-0'
            }`}
          >
            <ChatSidebar
              conversations={conversations}
              activeConversationId={activeConversationId}
              onSelectConversation={(id) => {
                setActiveConversationId(id);
                setSidebarOpenMobile(false);
              }}
              onNewChat={handleNewChat}
              onRenameConversation={handleRename}
              onDeleteConversation={handleDelete}
              isLoading={convsLoading}
              onCloseMobile={() => setSidebarOpenMobile(false)}
            />
          </div>

          {/* Backdrop for mobile drawer */}
          {sidebarOpenMobile && (
            <div
              className="fixed inset-0 z-20 bg-black/40 backdrop-blur-xs sm:hidden"
              onClick={() => setSidebarOpenMobile(false)}
            />
          )}

          {/* Main Chat Workspace */}
          <div className="flex-1 flex flex-col h-full overflow-hidden bg-background/50">
            {/* Persistence Status Notice if unmigrated */}
            {persistenceStatus === 'pending_migration' && (
              <div
                className="px-4 py-2 text-[11px] flex items-center justify-between border-b"
                style={{
                  backgroundColor: 'rgba(245, 158, 11, 0.08)',
                  borderColor: 'rgba(245, 158, 11, 0.2)',
                  color: 'rgb(217, 119, 6)',
                }}
              >
                <div className="flex items-center gap-1.5">
                  <Database className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>
                    Database persistence migration pending owner approval. Active session storage is engaged.
                  </span>
                </div>
              </div>
            )}

            {/* Message Area */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
              {msgsLoading && localMessages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-xs text-muted space-y-2">
                  <div className="w-5 h-5 border-2 border-brand border-t-transparent rounded-full animate-spin" />
                  <span>Loading conversation history...</span>
                </div>
              ) : localMessages.length === 0 ? (
                /* Welcome Screen */
                <div className="max-w-2xl mx-auto py-8 sm:py-12 space-y-6 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-brand/10 border border-brand/20 flex items-center justify-center mx-auto shadow-xs">
                    <Sparkles className="w-6 h-6 text-brand" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold tracking-tight" style={{ color: 'rgb(var(--foreground))' }}>
                      Welcome to FINOVA Intelligence
                    </h2>
                    <p className="text-xs text-muted max-w-md mx-auto mt-1 leading-relaxed">
                      Your conversational financial workspace. Ask about your actual portfolio,
                      explore stock comparisons, analyze multi-provider news, or model Future Lab scenarios.
                    </p>
                  </div>

                  {/* 10 Suggested Questions */}
                  <div className="text-left pt-2">
                    <SuggestedQuestions
                      onSelectQuestion={handleSendMessage}
                      disabled={isGenerating}
                    />
                  </div>
                </div>
              ) : (
                /* Messages List */
                <div className="max-w-3xl mx-auto space-y-4">
                  {localMessages.map((msg, idx) => (
                    <ChatMessageItem
                      key={msg.id || idx}
                      message={msg}
                      onRetry={(failedMsg) => {
                        // Find preceding user message
                        const userMsgIndex = localMessages.findIndex((m) => m.id === failedMsg.id) - 1;
                        if (userMsgIndex >= 0) {
                          handleSendMessage(localMessages[userMsgIndex].content);
                        }
                      }}
                      isLast={idx === localMessages.length - 1}
                    />
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* Bottom Composer */}
            <div className="p-3 sm:p-4 border-t bg-card/70 backdrop-blur-xs" style={{ borderColor: 'rgb(var(--border))' }}>
              <div className="max-w-3xl mx-auto">
                <ChatComposer
                  onSend={handleSendMessage}
                  onStop={handleStop}
                  isGenerating={isGenerating}
                  disabled={msgsLoading}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
