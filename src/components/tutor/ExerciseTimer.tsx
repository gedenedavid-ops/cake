'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Timer, RotateCcw } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface ExerciseTimerProps {
  /** Durée initiale en secondes */
  durationSeconds: number;
  /** Appelé quand le chrono atteint 0 */
  onExpire: () => void;
}

export function ExerciseTimer({ durationSeconds, onExpire }: ExerciseTimerProps) {
  const [remaining, setRemaining] = useState(durationSeconds);
  const [running, setRunning] = useState(true);
  const expiredRef = useRef(false);
  const onExpireRef = useRef(onExpire);
  onExpireRef.current = onExpire;

  useEffect(() => {
    if (!running) return;
    if (remaining <= 0) {
      if (!expiredRef.current) {
        expiredRef.current = true;
        onExpireRef.current();
      }
      return;
    }
    const id = setTimeout(() => setRemaining((r) => r - 1), 1_000);
    return () => clearTimeout(id);
  }, [remaining, running]);

  const handleReset = useCallback(() => {
    expiredRef.current = false;
    setRemaining(durationSeconds);
    setRunning(true);
  }, [durationSeconds]);

  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  const ratio    = remaining / durationSeconds; // 1 → 0
  const expired  = remaining <= 0;

  // Couleur selon le temps restant
  const color = expired
    ? '#EF4444'          // rouge — expiré
    : ratio > 0.5
    ? '#22C55E'          // vert — >50 %
    : ratio > 0.2
    ? '#F4A236'          // orange — 20–50 %
    : '#EF4444';         // rouge — <20 %

  // Arc SVG du compte à rebours
  const SIZE   = 40;
  const R      = 16;
  const CIRC   = 2 * Math.PI * R;
  const dash   = expired ? 0 : CIRC * ratio;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn(
        'inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border mt-2 select-none',
        expired
          ? 'bg-red-50 border-red-200'
          : 'bg-white border-[#E8E4DF]'
      )}
    >
      {/* Arc SVG */}
      <svg width={SIZE} height={SIZE} className="-rotate-90">
        <circle cx={SIZE / 2} cy={SIZE / 2} r={R} fill="none" stroke="#E8E4DF" strokeWidth={3} />
        <circle
          cx={SIZE / 2} cy={SIZE / 2} r={R}
          fill="none"
          stroke={color}
          strokeWidth={3}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${CIRC}`}
          style={{ transition: 'stroke-dasharray 0.8s linear, stroke 0.5s' }}
        />
      </svg>

      <div className="flex flex-col leading-tight">
        <span className="text-[9px] font-semibold uppercase tracking-wider text-[#9B9590] flex items-center gap-1">
          <Timer size={8} />
          {expired ? 'Temps écoulé !' : 'Chrono'}
        </span>
        <span className="text-base font-bold tabular-nums" style={{ color }}>
          {expired ? '0:00' : `${minutes}:${String(seconds).padStart(2, '0')}`}
        </span>
      </div>

      {/* Bouton reset */}
      <button
        onClick={handleReset}
        className="ml-1 p-1 rounded-lg text-[#C8C4BE] hover:text-[#1A1A1A] hover:bg-[#F5F3EF] transition-colors"
        title="Relancer le chrono"
      >
        <RotateCcw size={12} />
      </button>
    </motion.div>
  );
}
