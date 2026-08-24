'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Plus, X, SlidersHorizontal,
  BookOpen, TrendingUp, Zap, Clock,
  LayoutGrid, List, Columns2, Smile,
} from 'lucide-react';
import { useStore, useFilteredNotes } from '@/store';
import { SUBJECT_CONFIG, MOOD_CONFIG, cn } from '@/lib/utils';
import { NoteCard } from '@/components/journal/NoteCard';
import { NoteEditor } from '@/components/journal/NoteEditor';
import { PinLockModal } from '@/components/journal/PinLock';
import { Button } from '@/components/ui/Button';
import type { Note, Subject, Mood } from '@/types';
import type { NoteLayout } from '@/store';

// ─── Journal d'humeur — vue personnelle, purement descriptive ─────────────────

function MoodDashboard({ notes }: { notes: Note[] }) {
  // Notes des 14 derniers jours ayant une humeur renseignée
  const recent = useMemo(() => {
    const cutoff = Date.now() - 14 * 86_400_000;
    return notes.filter((n) => n.mood && n.updatedAt.getTime() > cutoff);
  }, [notes]);

  if (recent.length < 2) return null;

  // Comptage brut par humeur — affiché tel quel, sans interprétation
  const counts = recent.reduce<Record<string, number>>((acc, n) => {
    acc[n.mood!] = (acc[n.mood!] ?? 0) + 1;
    return acc;
  }, {});
  const total = recent.length;

  // Courbe emoji sur les 7 derniers jours
  const days = useMemo(() => {
    const result: { label: string; emoji: string }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dayNotes = recent.filter((n) => {
        const nd = new Date(n.updatedAt);
        return nd.getDate() === d.getDate() && nd.getMonth() === d.getMonth();
      });
      const dominant = dayNotes.length > 0
        ? Object.entries(
            dayNotes.reduce<Record<string, number>>((a, n) => {
              a[n.mood!] = (a[n.mood!] ?? 0) + 1; return a;
            }, {})
          ).sort((a, b) => b[1] - a[1])[0]?.[0]
        : null;
      result.push({
        label: ['D', 'L', 'M', 'M', 'J', 'V', 'S'][d.getDay()],
        emoji: dominant ? MOOD_CONFIG[dominant as Mood]?.emoji ?? '·' : '·',
      });
    }
    return result;
  }, [recent]);

  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-[#E8E4DF] bg-white p-4 mb-6"
    >
      <div className="flex items-center gap-2 mb-3">
        <Smile size={15} className="text-[#9B9590]" />
        <p className="text-xs font-semibold text-[#1A1A1A]">Mon humeur — 14 derniers jours</p>
        <span className="text-[10px] text-[#9B9590] ml-auto">{total} note{total > 1 ? 's' : ''}</span>
      </div>

      {/* Barre proportionnelle par humeur */}
      <div className="flex gap-0.5 h-2 rounded-full overflow-hidden mb-3">
        {(Object.entries(counts) as [Mood, number][])
          .sort((a, b) => b[1] - a[1])
          .map(([mood, count]) => (
            <div
              key={mood}
              title={`${MOOD_CONFIG[mood]?.label} : ${count}`}
              className="h-full transition-all"
              style={{
                width: `${(count / total) * 100}%`,
                backgroundColor: MOOD_CONFIG[mood]?.color ?? '#E8E4DF',
              }}
            />
          ))}
      </div>

      {/* Légende comptage */}
      <div className="flex flex-wrap gap-3 mb-3">
        {(Object.entries(counts) as [Mood, number][])
          .sort((a, b) => b[1] - a[1])
          .map(([mood, count]) => (
            <span key={mood} className="flex items-center gap-1 text-[11px] text-[#57606a]">
              <span>{MOOD_CONFIG[mood]?.emoji}</span>
              <span>{MOOD_CONFIG[mood]?.label}</span>
              <span className="font-semibold text-[#1A1A1A]">{count}</span>
            </span>
          ))}
      </div>

      {/* Courbe emoji 7 jours */}
      <div className="flex gap-1">
        {days.map((d, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
            <span className="text-sm leading-none">{d.emoji}</span>
            <span className="text-[9px] text-[#C8C4BE]">{d.label}</span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

const SUBJECTS = Object.keys(SUBJECT_CONFIG) as Subject[];
const MOODS = Object.keys(MOOD_CONFIG) as Mood[];

const LAYOUT_ICONS: Record<NoteLayout, React.ElementType> = {
  masonry: Columns2,
  grid:    LayoutGrid,
  list:    List,
};

export default function JournalPage() {
  const {
    notes, searchQuery, filterSubject, filterMood,
    setSearchQuery, setFilterSubject, setFilterMood,
    openEditor, loadNotes, prefs, updatePrefs,
  } = useStore();
  const filteredNotes = useFilteredNotes();
  const [showFilters, setShowFilters] = useState(false);
  const [viewNote, setViewNote] = useState<Note | null>(null);

  useEffect(() => { loadNotes(); }, [loadNotes]);

  // Stats
  const totalWords = notes.reduce((acc, n) => acc + n.wordCount, 0);
  const subjectsSet = new Set(notes.map((n) => n.subject));
  const todayNotes = notes.filter((n) => {
    const today = new Date();
    return n.createdAt.getDate() === today.getDate() &&
      n.createdAt.getMonth() === today.getMonth();
  });

  const hasFilters = filterSubject || filterMood || searchQuery;

  return (
    <div className="flex flex-col h-full">
      {/* En-tête */}
      <div className="sticky top-0 z-10 bg-[#FAF8F5]/90 backdrop-blur-md border-b border-[#E8E4DF]">
        <div className="px-5 md:px-8 py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-[#1A1A1A]">Mes notes</h1>
              <p className="text-xs text-[#9B9590] mt-0.5">
                {notes.length} note{notes.length > 1 ? 's' : ''} · {subjectsSet.size} matière{subjectsSet.size > 1 ? 's' : ''}
              </p>
            </div>
            <Button variant="dark" size="md" onClick={() => openEditor()}>
              <Plus size={16} />
              <span className="hidden sm:inline">Nouvelle note</span>
            </Button>
          </div>

          {/* Recherche + Filtres + Layout switcher */}
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9B9590]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher notes, matières, tags…"
                className="w-full pl-9 pr-4 py-2.5 bg-white border border-[#E8E4DF] rounded-xl text-sm text-[#1A1A1A] placeholder-[#C8C4BE] focus:border-[#F4A236] focus:ring-2 focus:ring-[#F4A236]/20 transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9B9590] hover:text-[#1A1A1A]"
                >
                  <X size={14} />
                </button>
              )}
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all',
                (showFilters || filterSubject || filterMood)
                  ? 'bg-[#F4A236] text-white border-[#F4A236]'
                  : 'bg-white text-[#9B9590] border-[#E8E4DF] hover:border-[#F4A236] hover:text-[#F4A236]'
              )}
            >
              <SlidersHorizontal size={15} />
              <span className="hidden sm:inline">Filtrer</span>
            </button>
            {/* Layout switcher */}
            <div className="hidden sm:flex items-center gap-1 bg-white border border-[#E8E4DF] rounded-xl p-1">
              {(['masonry', 'grid', 'list'] as NoteLayout[]).map((layout) => {
                const Icon = LAYOUT_ICONS[layout];
                return (
                  <button
                    key={layout}
                    onClick={() => updatePrefs({ noteLayout: layout })}
                    className={cn(
                      'p-1.5 rounded-lg transition-all',
                      prefs.noteLayout === layout
                        ? 'bg-[#F5F3EF] text-[#1A1A1A]'
                        : 'text-[#C8C4BE] hover:text-[#9B9590]'
                    )}
                    title={layout === 'masonry' ? 'Mosaïque' : layout === 'grid' ? 'Grille' : 'Liste'}
                  >
                    <Icon size={15} />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Panneau de filtres */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="pt-3 space-y-3">
                  <div>
                    <p className="text-[10px] font-semibold text-[#9B9590] uppercase tracking-wider mb-1.5">Matière</p>
                    <div className="flex flex-wrap gap-1.5">
                      {SUBJECTS.map((s) => (
                        <button
                          key={s}
                          onClick={() => setFilterSubject(filterSubject === s ? null : s)}
                          className={cn(
                            'flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-all',
                            filterSubject === s
                              ? 'bg-[#1A1A1A] text-white'
                              : 'bg-white border border-[#E8E4DF] text-[#9B9590] hover:border-[#1A1A1A] hover:text-[#1A1A1A]'
                          )}
                        >
                          {SUBJECT_CONFIG[s].emoji} {s}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-[10px] font-semibold text-[#9B9590] uppercase tracking-wider mb-1.5">Humeur</p>
                    <div className="flex flex-wrap gap-1.5">
                      {MOODS.map((m) => (
                        <button
                          key={m}
                          onClick={() => setFilterMood(filterMood === m ? null : m)}
                          className={cn(
                            'flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-all',
                            filterMood === m
                              ? 'bg-[#1A1A1A] text-white'
                              : 'bg-white border border-[#E8E4DF] text-[#9B9590] hover:border-[#1A1A1A]'
                          )}
                        >
                          {MOOD_CONFIG[m].emoji} {MOOD_CONFIG[m].label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {hasFilters && (
                    <button
                      onClick={() => { setFilterSubject(null); setFilterMood(null); setSearchQuery(''); }}
                      className="text-xs text-[#F4A236] font-medium hover:underline"
                    >
                      Effacer les filtres
                    </button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Contenu principal */}
      <div className="flex-1 px-5 md:px-8 py-5 overflow-y-auto">
        {/* Dashboard humeur */}
        {!hasFilters && <MoodDashboard notes={notes} />}

        {/* Statistiques */}
        {!hasFilters && notes.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            {[
              { label: 'Notes totales',     value: notes.length,        icon: BookOpen,  color: '#F4A236', bg: '#FDF0DC' },
              { label: "Notes aujourd'hui", value: todayNotes.length,   icon: Clock,     color: '#3B82F6', bg: '#EFF6FF' },
              { label: 'Matières',          value: subjectsSet.size,    icon: TrendingUp,color: '#10B981', bg: '#ECFDF5' },
              { label: 'Mots écrits',       value: totalWords > 999 ? `${(totalWords/1000).toFixed(1)}k` : totalWords, icon: Zap, color: '#8B5CF6', bg: '#F5F3FF' },
            ].map(({ label, value, icon: Icon, color, bg }) => (
              <motion.div
                key={label}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl p-4 border border-[#E8E4DF]"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ backgroundColor: bg }}>
                    <Icon size={15} style={{ color }} />
                  </div>
                </div>
                <p className="text-xl font-bold text-[#1A1A1A]">{value}</p>
                <p className="text-[11px] text-[#9B9590] mt-0.5">{label}</p>
              </motion.div>
            ))}
          </div>
        )}

        {/* Grille de notes */}
        {filteredNotes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-3xl bg-[#F5F3EF] flex items-center justify-center mb-4">
              <BookOpen size={24} className="text-[#C8C4BE]" />
            </div>
            <h3 className="text-[#1A1A1A] font-semibold mb-1">
              {hasFilters ? 'Aucune note ne correspond' : 'Aucune note pour l\'instant'}
            </h3>
            <p className="text-[#9B9590] text-sm max-w-xs">
              {hasFilters
                ? 'Essaie d\'ajuster ta recherche ou tes filtres.'
                : 'Commence à capturer tes cours, idées et réflexions. Ta première note est à un clic.'}
            </p>
            {!hasFilters && (
              <Button variant="dark" size="md" className="mt-5" onClick={() => openEditor()}>
                <Plus size={16} /> Écrire ma première note
              </Button>
            )}
          </div>
        ) : (
          <>
            {/* ── Masonry layout ── */}
            {prefs.noteLayout === 'masonry' && (
              <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-3 space-y-3">
                {filteredNotes.map((note, i) => (
                  <div key={note.id} className="break-inside-avoid">
                    <NoteCard note={note} onOpen={setViewNote} index={i} />
                  </div>
                ))}
              </div>
            )}

            {/* ── Grid layout ── */}
            {prefs.noteLayout === 'grid' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {filteredNotes.map((note, i) => (
                  <NoteCard key={note.id} note={note} onOpen={setViewNote} index={i} />
                ))}
              </div>
            )}

            {/* ── List layout ── */}
            {prefs.noteLayout === 'list' && (
              <div className="flex flex-col gap-2 max-w-3xl">
                {filteredNotes.map((note, i) => (
                  <NoteCard key={note.id} note={note} onOpen={setViewNote} index={i} listMode />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Note Detail Modal */}
      <AnimatePresence>
        {viewNote && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/30 backdrop-blur-sm"
              onClick={() => setViewNote(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              className="relative w-full max-w-2xl max-h-[85vh] bg-white rounded-3xl shadow-xl overflow-hidden flex flex-col"
            >
              <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-[#E8E4DF]">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{SUBJECT_CONFIG[viewNote.subject].emoji}</span>
                  <span className="text-xs font-medium text-[#9B9590]">{viewNote.subject}</span>
                  {viewNote.mood && <span className="text-sm">{MOOD_CONFIG[viewNote.mood].emoji}</span>}
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="secondary" size="sm" onClick={() => { setViewNote(null); useStore.getState().openEditor(viewNote.id); }}>
                    Edit
                  </Button>
                  <button onClick={() => setViewNote(null)} className="p-1.5 rounded-xl hover:bg-[#F5F3EF] text-[#9B9590]">
                    <X size={16} />
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto px-6 py-4">
                <h2 className="text-xl font-bold text-[#1A1A1A] mb-3">{viewNote.title}</h2>
                <p className="text-sm text-[#1A1A1A] leading-relaxed whitespace-pre-wrap note-content">{viewNote.content}</p>
                {viewNote.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-4">
                    {viewNote.tags.map((tag) => (
                      <span key={tag.id} className="text-xs px-2.5 py-1 bg-[#F5F3EF] text-[#9B9590] rounded-full">
                        #{tag.label}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Editor + PIN overlays */}
      <NoteEditor />
      <PinLockModal />
    </div>
  );
}
