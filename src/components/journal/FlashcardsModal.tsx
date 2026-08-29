'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight, RotateCw } from 'lucide-react';
import { cn } from '@/lib/utils';

export type Flashcard = { q: string; a: string };

interface FlashcardsModalProps {
  cards: Flashcard[];
  noteTitle: string;
  onClose: () => void;
}

export function FlashcardsModal({ cards, noteTitle, onClose }: FlashcardsModalProps) {
  const [index, setIndex]     = useState(0);
  const [flipped, setFlipped]  = useState(false);
  const [done, setDone]        = useState<Set<number>>(new Set());

  const card = cards[index];

  const prev = () => { setIndex((i) => Math.max(0, i - 1)); setFlipped(false); };
  const next = () => { setIndex((i) => Math.min(cards.length - 1, i + 1)); setFlipped(false); };

  const markDone = () => {
    setDone((d) => new Set([...d, index]));
    if (index < cards.length - 1) next();
  };

  const progress = Math.round((done.size / cards.length) * 100);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 12 }}
        transition={{ type: 'spring', stiffness: 380, damping: 32 }}
        className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#E8E4DF]">
          <div>
            <h3 className="text-sm font-bold text-[#1A1A1A]">🃏 Flashcards</h3>
            <p className="text-[10px] text-[#9B9590] mt-0.5">{noteTitle} · {cards.length} cartes</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-[#F5F3EF] text-[#9B9590]">
            <X size={14} />
          </button>
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-[#F5F3EF]">
          <motion.div
            className="h-full bg-[#F4A236] rounded-full"
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>

        {/* Card */}
        <div className="flex-1 flex flex-col items-center justify-center px-6 py-8 min-h-[220px]">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-[#9B9590] mb-3">
            {flipped ? 'Réponse' : 'Question'} · {index + 1}/{cards.length}
          </div>

          {/* Flip card */}
          <div
            className="w-full cursor-pointer perspective-1000"
            onClick={() => setFlipped(!flipped)}
            style={{ perspective: '1000px' }}
          >
            <motion.div
              animate={{ rotateY: flipped ? 180 : 0 }}
              transition={{ duration: 0.35, ease: 'easeInOut' }}
              style={{ transformStyle: 'preserve-3d' }}
              className="relative w-full"
            >
              {/* Front */}
              <div
                className={cn(
                  'w-full min-h-[130px] flex items-center justify-center p-5 rounded-2xl text-center text-sm font-medium text-[#1A1A1A] leading-relaxed',
                  done.has(index) ? 'bg-green-50 border border-green-200' : 'bg-[#F5F3EF]'
                )}
                style={{ backfaceVisibility: 'hidden' }}
              >
                {card.q}
              </div>
              {/* Back */}
              <div
                className="absolute inset-0 w-full min-h-[130px] flex items-center justify-center p-5 rounded-2xl text-center text-sm text-[#57514C] leading-relaxed bg-[#FDF0DC]"
                style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
              >
                {card.a}
              </div>
            </motion.div>
          </div>

          <p className="text-[10px] text-[#C8C4BE] mt-3">Clique sur la carte pour retourner</p>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between px-5 py-4 border-t border-[#E8E4DF]">
          <button
            onClick={prev}
            disabled={index === 0}
            className="p-2 rounded-xl text-[#9B9590] hover:bg-[#F5F3EF] disabled:opacity-30 transition-all"
          >
            <ChevronLeft size={16} />
          </button>

          <div className="flex items-center gap-2">
            {flipped && !done.has(index) && (
              <button
                onClick={markDone}
                className="flex items-center gap-1 px-3 py-1.5 bg-green-500 text-white text-xs font-semibold rounded-xl hover:bg-green-600 transition-colors"
              >
                ✓ Su !
              </button>
            )}
            <button
              onClick={() => { setDone(new Set()); setIndex(0); setFlipped(false); }}
              className="p-2 rounded-xl text-[#9B9590] hover:bg-[#F5F3EF] transition-colors"
              title="Recommencer"
            >
              <RotateCw size={14} />
            </button>
          </div>

          <button
            onClick={next}
            disabled={index === cards.length - 1}
            className="p-2 rounded-xl text-[#9B9590] hover:bg-[#F5F3EF] disabled:opacity-30 transition-all"
          >
            <ChevronRight size={16} />
          </button>
        </div>

        {/* Done state */}
        {done.size === cards.length && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute inset-0 flex flex-col items-center justify-center bg-white/95 rounded-3xl text-center px-8"
          >
            <span className="text-4xl mb-3">🎉</span>
            <h4 className="text-lg font-bold text-[#1A1A1A] mb-1">Toutes les cartes maîtrisées !</h4>
            <p className="text-sm text-[#9B9590] mb-5">Tu peux recommencer pour consolider ta mémoire.</p>
            <button
              onClick={() => { setDone(new Set()); setIndex(0); setFlipped(false); }}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#F4A236] text-white text-sm font-semibold rounded-xl hover:bg-[#EAA240] transition-colors"
            >
              <RotateCw size={13} /> Recommencer
            </button>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
