'use client';

// ============================================================
// FINOVA — AI Chat Composer Component
// components/insights/ChatComposer.tsx
//
// Multiline input with auto-resize, Enter/Shift+Enter handling,
// character counter, send button, and stop generation support.
// ============================================================

import React, { useState, useRef, useEffect } from 'react';
import { Send, Square, CornerDownLeft } from 'lucide-react';

interface ChatComposerProps {
  onSend: (message: string) => void;
  onStop?: () => void;
  isGenerating?: boolean;
  disabled?: boolean;
  placeholder?: string;
}

export function ChatComposer({
  onSend,
  onStop,
  isGenerating = false,
  disabled = false,
  placeholder = 'Ask FINOVA Intelligence about your portfolio, stock comparisons, news, or regulations...',
}: ChatComposerProps) {
  const [text, setText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const MAX_CHARS = 2000;

  // Auto-resize textarea height
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 180)}px`;
  }, [text]);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isGenerating && onStop) {
      onStop();
      return;
    }

    const trimmed = text.trim();
    if (!trimmed || disabled || isGenerating) return;

    onSend(trimmed);
    setText('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div
      className="relative rounded-xl border p-2.5 transition-all shadow-xs"
      style={{
        backgroundColor: 'rgb(var(--card))',
        borderColor: 'rgb(var(--border))',
      }}
    >
      <textarea
        ref={textareaRef}
        rows={1}
        value={text}
        onChange={(e) => setText(e.target.value.slice(0, MAX_CHARS))}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        placeholder={placeholder}
        className="w-full bg-transparent resize-none border-none outline-none text-xs leading-relaxed max-h-44 pr-24"
        style={{
          color: 'rgb(var(--foreground))',
        }}
      />

      <div className="flex items-center justify-between pt-2 mt-1 border-t" style={{ borderColor: 'rgba(var(--foreground-rgb, 128,128,128), 0.08)' }}>
        <div className="flex items-center gap-2 text-[10px]" style={{ color: 'rgb(var(--muted))' }}>
          <span className="hidden sm:inline-flex items-center gap-1">
            <kbd className="px-1 py-0.5 rounded bg-muted/20 border font-mono text-[9px]">Enter</kbd> to send,
            <kbd className="px-1 py-0.5 rounded bg-muted/20 border font-mono text-[9px]">Shift+Enter</kbd> for newline
          </span>
          <span>
            {text.length}/{MAX_CHARS}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {isGenerating ? (
            <button
              type="button"
              onClick={onStop}
              className="px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors text-white"
              style={{ backgroundColor: 'rgb(var(--destructive, 220, 38, 38))' }}
              title="Stop generating"
            >
              <Square className="w-3 h-3 fill-current" />
              <span>Stop</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => handleSubmit()}
              disabled={!text.trim() || disabled}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all disabled:opacity-40 disabled:cursor-not-allowed bg-brand text-white hover:opacity-90 cursor-pointer"
            >
              <span>Send</span>
              <Send className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
