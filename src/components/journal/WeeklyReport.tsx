'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, BookOpen, PenLine, Calendar } from 'lucide-react';
import { SUBJECT_CONFIG } from '@/lib/utils';
import type { Note, Subject } from '@/types';

interface WeeklyReportProps {
  notes: Note[];
}

/**
 * Carte "rapport de la semaine" affichée en haut du journal.
 * Calculée entièrement côté client depuis les notes déjà chargées.
 * Ne fait aucune requête réseau.
 */
export function WeeklyReport({ notes }: WeeklyReportProps) {
  const report = useMemo(() => {
    const now   = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 86_400_000);
    const twoWeeksAgo = new Date(now.getTime() - 14 * 86_400_000);

    const thisWeek = notes.filter((n) => n.createdAt >= weekAgo);
    const lastWeek = notes.filter((n) => n.createdAt >= twoWeeksAgo && n.createdAt < weekAgo);

    const wordCount = thisWeek.reduce((acc, n) => acc + n.wordCount, 0);

    // Top matière cette semaine
    const subjectCount: Partial<Record<Subject, number>> = {};
    for (const n of thisWeek) {
      subjectCount[n.subject] = (subjectCount[n.subject] ?? 0) + 1;
    }
    const topSubject = Object.entries(subjectCount).sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0))[0];

    // Jours actifs (jours distincts avec au moins une note)
    const activeDays = new Set(thisWeek.map((n) => n.createdAt.toDateString())).size;

    const trend = thisWeek.length - lastWeek.length;

    return { count: thisWeek.length, wordCount, topSubject, activeDays, trend };
  }, [notes]);

  // N'affiche rien s'il n'y a aucune note cette semaine
  if (report.count === 0) return null;

  const trendLabel =
    report.trend > 0 ? `+${report.trend} vs sem. dernière` :
    report.trend < 0 ? `${report.trend} vs sem. dernière` :
    'Stable vs sem. dernière';

  const trendColor =
    report.trend > 0 ? 'text-green-600' :
    report.trend < 0 ? 'text-red-500' :
    'text-[#9B9590]';

  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-5 p-4 bg-white border border-[#E8E4DF] rounded-2xl"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-xl bg-[#FDF0DC] flex items-center justify-center">
            <Calendar size={13} className="text-[#F4A236]" />
          </div>
          <span className="text-xs font-semibold text-[#1A1A1A]">Cette semaine</span>
        </div>
        <span className={`text-[10px] font-medium ${trendColor}`}>{trendLabel}</span>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 mb-0.5">
            <BookOpen size={11} className="text-[#F4A236]" />
          </div>
          <p className="text-lg font-bold text-[#1A1A1A]">{report.count}</p>
          <p className="text-[10px] text-[#9B9590]">note{report.count > 1 ? 's' : ''}</p>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 mb-0.5">
            <PenLine size={11} className="text-[#F4A236]" />
          </div>
          <p className="text-lg font-bold text-[#1A1A1A]">
            {report.wordCount > 999 ? `${(report.wordCount / 1000).toFixed(1)}k` : report.wordCount}
          </p>
          <p className="text-[10px] text-[#9B9590]">mots</p>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 mb-0.5">
            <TrendingUp size={11} className="text-[#F4A236]" />
          </div>
          <p className="text-lg font-bold text-[#1A1A1A]">{report.activeDays}</p>
          <p className="text-[10px] text-[#9B9590]">jour{report.activeDays > 1 ? 's' : ''} actifs</p>
        </div>
      </div>

      {report.topSubject && (
        <div className="mt-3 pt-3 border-t border-[#F5F3EF] flex items-center gap-1.5">
          <span className="text-sm">{SUBJECT_CONFIG[report.topSubject[0] as Subject]?.emoji}</span>
          <span className="text-[11px] text-[#57514C]">
            Top matière : <strong>{report.topSubject[0]}</strong> ({report.topSubject[1]} note{(report.topSubject[1] ?? 0) > 1 ? 's' : ''})
          </span>
        </div>
      )}
    </motion.div>
  );
}
