'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send, Sparkles, BookOpen, RotateCcw, ChevronDown,
  Plus, MessageSquare, Loader2, User,
} from 'lucide-react';
import { useStore, useActiveSession } from '@/store';
import { cn, formatRelativeDate } from '@/lib/utils';
import type { ChatMessage } from '@/types';

const SUGGESTED_PROMPTS = [
  'Interroge-moi sur mes dernières notes 🎯',
  'Résume mes notes de Mathématiques simplement',
  'Quels sujets ai-je étudiés cette semaine ?',
  'Aide-moi à comprendre un concept que j\'ai tagué comme confus',
  'Crée un plan de révision basé sur mes notes',
  'Explique les thèmes clés de mes notes d\'Histoire',
];

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user';
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 28 }}
      className={cn('flex gap-3', isUser ? 'flex-row-reverse' : 'flex-row')}
    >
      {/* Avatar */}
      <div className={cn(
        'w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-1',
        isUser ? 'bg-[#1A1A1A]' : 'bg-[#F4A236]'
      )}>
        {isUser
          ? <User size={13} className="text-white" />
          : <Sparkles size={13} className="text-white" />
        }
      </div>

      {/* Bubble */}
      <div className={cn('max-w-[80%] space-y-1', isUser ? 'items-end' : 'items-start', 'flex flex-col')}>
        {message.isLoading ? (
          <div className="bg-[#F5F3EF] rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-2">
            <Loader2 size={14} className="text-[#9B9590] animate-spin" />
            <span className="text-sm text-[#9B9590]">En train de réfléchir…</span>
          </div>
        ) : (
          <div className={cn(
            'px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap',
            isUser
              ? 'bg-[#1A1A1A] text-white rounded-tr-sm'
              : 'bg-[#F5F3EF] text-[#1A1A1A] rounded-tl-sm'
          )}>
            {message.content}
          </div>
        )}

        {/* Sources */}
        {message.sources && message.sources.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {message.sources.slice(0, 3).map((src) => (
              <span
                key={src.noteId}
                className="flex items-center gap-1 text-[10px] px-2 py-0.5 bg-white border border-[#E8E4DF] rounded-full text-[#9B9590]"
              >
                <BookOpen size={9} />
                {src.title}
              </span>
            ))}
          </div>
        )}

        <span className="text-[9px] text-[#C8C4BE] px-1">
          {formatRelativeDate(message.timestamp)}
        </span>
      </div>
    </motion.div>
  );
}

export function ChatPanel() {
  const { sessions, createSession, sendMessage, setActiveSession, isAILoading, notes } = useStore();
  const activeSession = useActiveSession();
  const [input, setInput] = useState('');
  const [showSessions, setShowSessions] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeSession?.messages]);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || isAILoading) return;
    setInput('');
    await sendMessage(text);
  }, [input, isAILoading, sendMessage]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handlePrompt = (prompt: string) => {
    setInput(prompt);
    inputRef.current?.focus();
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-[#E8E4DF] flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-2xl bg-[#F4A236] flex items-center justify-center">
            <Sparkles size={17} className="text-white" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-[#1A1A1A]">Tuteur Cake</h2>
              <p className="text-[10px] text-[#9B9590]">
                Propulsé par DeepSeek · {notes.length} note{notes.length > 1 ? 's' : ''} disponible{notes.length > 1 ? 's' : ''}
              </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {sessions.length > 0 && (
            <button
              onClick={() => setShowSessions(!showSessions)}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-[#9B9590] hover:text-[#1A1A1A] hover:bg-[#F5F3EF] rounded-xl transition-colors"
            >
              <MessageSquare size={13} />
              Historique
              <ChevronDown size={12} className={cn('transition-transform', showSessions && 'rotate-180')} />
            </button>
          )}
          <button
            onClick={() => { createSession(); setShowSessions(false); }}
            className="p-1.5 rounded-xl bg-[#F5F3EF] text-[#9B9590] hover:text-[#1A1A1A] hover:bg-[#EDE9E3] transition-colors"
            title="Nouvelle conversation"
          >
            <Plus size={15} />
          </button>
        </div>
      </div>

      {/* Session History Dropdown */}
      <AnimatePresence>
        {showSessions && sessions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="border-b border-[#E8E4DF] overflow-hidden"
          >
            <div className="p-3 space-y-1 max-h-40 overflow-y-auto">
              {sessions.map((sess) => (
                <button
                  key={sess.id}
                  onClick={() => { setActiveSession(sess.id); setShowSessions(false); }}
                  className={cn(
                    'w-full text-left px-3 py-2 rounded-xl text-xs transition-colors',
                    activeSession?.id === sess.id
                      ? 'bg-[#FDF0DC] text-[#F4A236]'
                      : 'hover:bg-[#F5F3EF] text-[#1A1A1A]'
                  )}
                >
                  <span className="font-medium truncate block">{sess.title || 'New Conversation'}</span>
                  <span className="text-[10px] text-[#9B9590]">{sess.messages.length} message{sess.messages.length > 1 ? 's' : ''}</span>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 min-h-0">
        {!activeSession || activeSession.messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4 py-8">
            <div className="w-14 h-14 rounded-3xl bg-[#FDF0DC] flex items-center justify-center mb-4">
              <Sparkles size={24} className="text-[#F4A236]" />
            </div>
            <h3 className="text-[#1A1A1A] font-semibold mb-1">Bonjour ! Je suis Cake 👋</h3>
            <p className="text-[#9B9590] text-sm max-w-xs mb-6">
              Ton tuteur IA personnel. Pose-moi des questions sur tes notes, demande un quiz ou aide-toi à comprendre un concept.
            </p>
            <div className="w-full space-y-2">
              <p className="text-[10px] font-semibold text-[#9B9590] uppercase tracking-wider mb-2">Essaie de demander…</p>
              {SUGGESTED_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => handlePrompt(prompt)}
                  className="w-full text-left px-3 py-2.5 bg-white border border-[#E8E4DF] rounded-xl text-sm text-[#1A1A1A] hover:border-[#F4A236] hover:bg-[#FDF0DC]/30 transition-all"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {activeSession.messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} />
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input */}
      <div className="px-4 py-4 border-t border-[#E8E4DF] flex-shrink-0">
        <div className="flex items-end gap-2 bg-white border border-[#E8E4DF] rounded-2xl px-3 py-2.5 focus-within:border-[#F4A236] focus-within:ring-2 focus-within:ring-[#F4A236]/20 transition-all">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about your notes, request a quiz, get explanations…"
            rows={1}
            className="flex-1 text-sm text-[#1A1A1A] placeholder-[#C8C4BE] bg-transparent resize-none max-h-32 leading-relaxed"
            style={{ minHeight: '24px' }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isAILoading}
            className={cn(
              'w-8 h-8 rounded-xl flex items-center justify-center transition-all flex-shrink-0',
              input.trim() && !isAILoading
                ? 'bg-[#1A1A1A] text-white hover:bg-[#2C2C2C] active:scale-95'
                : 'bg-[#F5F3EF] text-[#C8C4BE] cursor-not-allowed'
            )}
            aria-label="Send"
          >
            {isAILoading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
          </button>
        </div>
        <div className="flex items-center justify-between mt-1.5">
          <p className="text-[9px] text-[#C8C4BE]">Enter to send · Shift+Enter for new line</p>
          <button
            onClick={() => {
              const sess = useStore.getState().activeSessionId;
              if (sess) useStore.setState((s) => ({
                sessions: s.sessions.map((se) => se.id === sess ? { ...se, messages: [] } : se)
              }));
            }}
            className="text-[9px] text-[#C8C4BE] hover:text-[#9B9590] flex items-center gap-1 transition-colors"
          >
            <RotateCcw size={9} /> Clear chat
          </button>
        </div>
      </div>
    </div>
  );
}
