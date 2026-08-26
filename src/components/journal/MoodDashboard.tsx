'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { MOOD_CONFIG } from '@/lib/utils';
import type { Note, Mood } from '@/types';

interface MoodDashboardProps {
  notes: Note[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Humeur dominante d'une liste de notes (null si vide) */
function dominant(ns: Note[]): Mood | null {
  if (ns.length === 0) return null;
  const counts = ns.reduce<Record<string, number>>((a, n) => {
    if (n.mood) a[n.mood] = (a[n.mood] ?? 0) + 1;
    return a;
  }, {});
  const best = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  return (best?.[0] as Mood) ?? null;
}

/** Même jour calendaire ? */
function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
}

// ─── Composant ────────────────────────────────────────────────────────────────

export function MoodDashboard({ notes }: MoodDashboardProps) {
  const moodNotes = useMemo(
    () => notes.filter((n) => n.mood),
    [notes],
  );

  // ── 28 jours de données ────────────────────────────────────────────────────
  const days28 = useMemo(() => {
    const result: { date: Date; mood: Mood | null; label: string }[] = [];
    for (let i = 27; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);
      const dayNotes = moodNotes.filter((n) => sameDay(n.updatedAt, d));
      result.push({
        date: d,
        mood: dominant(dayNotes),
        label: ['D', 'L', 'M', 'M', 'J', 'V', 'S'][d.getDay()],
      });
    }
    return result;
  }, [moodNotes]);

  // ── Notes des 14 derniers jours ────────────────────────────────────────────
  const recent14 = useMemo(() => {
    const cutoff = Date.now() - 14 * 86_400_000;
    return moodNotes.filter((n) => n.updatedAt.getTime() > cutoff);
  }, [moodNotes]);

  // ── Streak : jours consécutifs (depuis aujourd'hui) avec une note humeur ──
  const streak = useMemo(() => {
    let count = 0;
    for (let i = 0; i < 28; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);
      const has = moodNotes.some((n) => sameDay(n.updatedAt, d));
      if (has) count++;
      else if (i > 0) break; // on arrête dès qu'il manque un jour (pas aujourd'hui)
    }
    return count;
  }, [moodNotes]);

  // ── Répartition 14 jours ───────────────────────────────────────────────────
  const counts14 = useMemo(
    () =>
      recent14.reduce<Record<string, number>>((acc, n) => {
        acc[n.mood!] = (acc[n.mood!] ?? 0) + 1;
        return acc;
      }, {}),
    [recent14],
  );
  const total14 = recent14.length;

  // ── Insight textuel purement descriptif ───────────────────────────────────
  const insight = useMemo((): string | null => {
    if (total14 < 3) return null;
    const sorted = (Object.entries(counts14) as [Mood, number][]).sort(
      (a, b) => b[1] - a[1],
    );
    const top = sorted[0];
    if (!top) return null;
    const pct = Math.round((top[1] / total14) * 100);
    const cfg = MOOD_CONFIG[top[0]];
    // Dernière humeur enregistrée
    const last = [...recent14].sort(
      (a, b) => b.updatedAt.getTime() - a.updatedAt.getTime(),
    )[0];
    const lastCfg = last?.mood ? MOOD_CONFIG[last.mood] : null;
    const lastPart = lastCfg
      ? ` Dernière humeur notée : ${lastCfg.emoji} ${lastCfg.label}.`
      : '';
    return `Sur 14 jours, ton humeur dominante est ${cfg.emoji} ${cfg.label} (${pct} % des notes).${lastPart}`;
  }, [counts14, total14, recent14]);

  // ── Seuil d'affichage ─────────────────────────────────────────────────────
  if (moodNotes.length < 2) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-[#E8E4DF] bg-white overflow-hidden mb-6"
    >
      {/* En-tête */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#F0EDE8]">
        <p className="text-xs font-semibold text-[#1A1A1A]">Suivi d'humeur</p>
        <div className="flex items-center gap-3">
          {streak > 1 && (
            <span className="flex items-center gap-1 text-[10px] font-semibold text-[#F4A236]">
              🔥 {streak} jour{streak > 1 ? 's' : ''} d'affilée
            </span>
          )}
          <span className="text-[10px] text-[#9B9590]">
            {total14} note{total14 > 1 ? 's' : ''} · 14 j
          </span>
        </div>
      </div>

      <div className="px-4 pt-3 pb-4 space-y-4">

        {/* ── Graphe 28 jours ── */}
        <div>
          <p className="text-[10px] text-[#9B9590] font-medium mb-1.5">28 derniers jours</p>
          <div className="flex items-end gap-[3px] h-8">
            {days28.map((d, i) => {
              const cfg = d.mood ? MOOD_CONFIG[d.mood] : null;
              return (
                <motion.div
                  key={i}
                  initial={{ scaleY: 0 }}
                  animate={{ scaleY: 1 }}
                  transition={{ delay: i * 0.015, type: 'spring', stiffness: 300, damping: 24 }}
                  title={d.mood ? `${d.date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} — ${cfg?.emoji} ${cfg?.label}` : d.date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                  className="flex-1 rounded-sm origin-bottom"
                  style={{
                    height: cfg ? '100%' : '20%',
                    backgroundColor: cfg ? cfg.color : '#F0EDE8',
                    opacity: cfg ? 1 : 0.4,
                  }}
                />
              );
            })}
          </div>
          {/* Étiquettes jours visibles tous les 7 jours */}
          <div className="flex gap-[3px] mt-1">
            {days28.map((d, i) => (
              <div key={i} className="flex-1 text-center">
                {(i === 0 || i === 6 || i === 13 || i === 20 || i === 27) ? (
                  <span className="text-[8px] text-[#C8C4BE]">{d.label}</span>
                ) : null}
              </div>
            ))}
          </div>
        </div>

        {/* ── Barre de répartition 14 jours ── */}
        {total14 >= 2 && (
          <div>
            <p className="text-[10px] text-[#9B9590] font-medium mb-1.5">Répartition · 14 j</p>
            <div className="flex gap-0.5 h-1.5 rounded-full overflow-hidden">
              {(Object.entries(counts14) as [Mood, number][])
                .sort((a, b) => b[1] - a[1])
                .map(([mood, count]) => (
                  <motion.div
                    key={mood}
                    initial={{ width: 0 }}
                    animate={{ width: `${(count / total14) * 100}%` }}
                    transition={{ duration: 0.6, ease: 'easeOut' }}
                    title={`${MOOD_CONFIG[mood]?.label} : ${count}`}
                    className="h-full"
                    style={{ backgroundColor: MOOD_CONFIG[mood]?.color ?? '#E8E4DF' }}
                  />
                ))}
            </div>
            {/* Légende */}
            <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
              {(Object.entries(counts14) as [Mood, number][])
                .sort((a, b) => b[1] - a[1])
                .map(([mood, count]) => (
                  <span key={mood} className="flex items-center gap-1 text-[11px] text-[#57606a]">
                    <span>{MOOD_CONFIG[mood]?.emoji}</span>
                    <span>{MOOD_CONFIG[mood]?.label}</span>
                    <span className="font-semibold text-[#1A1A1A]">{count}</span>
                  </span>
                ))}
            </div>
          </div>
        )}

        {/* ── Insight textuel ── */}
        {insight && (
          <p className="text-[11px] text-[#9B9590] leading-relaxed border-t border-[#F0EDE8] pt-3">
            {insight}
          </p>
        )}
      </div>
    </motion.div>
  );
}
