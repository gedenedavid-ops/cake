'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Network, BookOpen, Info, X, Sparkles, Eye, EyeOff,
  FileText, Hash, Clock, TrendingUp, Plus,
} from 'lucide-react';
import { Shell } from '@/components/layout/Shell';
import { KnowledgeGraph } from '@/components/graph/KnowledgeGraph';
import { useStore, useFilteredNotes } from '@/store';
import { NoteCard } from '@/components/journal/NoteCard';
import { NoteEditor } from '@/components/journal/NoteEditor';
import { PinLockModal } from '@/components/journal/PinLock';
import { SUBJECT_CONFIG, MOOD_CONFIG, cn } from '@/lib/utils';
import type { Note, Subject, Mood } from '@/types';

// ─── Panel latéral — stats d'un nœud sélectionné ─────────────────────────────

function NodePanel({
  nodeId, nodeLabel, nodeType, onClose, onAskTutor, onCreateNote,
}: {
  nodeId: string;
  nodeLabel: string;
  nodeType: string;
  onClose: () => void;
  onAskTutor: (subject: string) => void;
  onCreateNote: (subject?: string) => void;
}) {
  const { notes } = useStore();
  const filteredNotes = useFilteredNotes();

  // Stats selon le type de nœud
  const relatedNotes = nodeType === 'subject'
    ? notes.filter((n) => n.subject === nodeId)
    : nodeType === 'concept'
    ? notes.filter((n) => n.tags.some((t) => `tag:${t.label}` === nodeId))
    : notes.filter((n) => n.id === nodeId);

  const totalWords   = relatedNotes.reduce((s, n) => s + n.wordCount, 0);
  const avgReadTime  = relatedNotes.length
    ? Math.ceil(relatedNotes.reduce((s, n) => s + n.readTime, 0) / relatedNotes.length)
    : 0;
  const lastNote     = relatedNotes.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())[0];

  // Humeur dominante
  const moodCounts = relatedNotes.reduce<Record<string, number>>((acc, n) => {
    if (n.mood) acc[n.mood] = (acc[n.mood] ?? 0) + 1;
    return acc;
  }, {});
  const dominantMood = Object.entries(moodCounts).sort((a, b) => b[1] - a[1])[0]?.[0] as Mood | undefined;

  const subjectCfg = nodeType === 'subject'
    ? SUBJECT_CONFIG[nodeId as Subject]
    : null;

  const displaySubject = nodeType === 'subject' ? nodeId
    : nodeType === 'note' ? notes.find((n) => n.id === nodeId)?.subject
    : undefined;

  return (
    <motion.div
      key={nodeId}
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 16 }}
      className="flex flex-col h-full"
    >
      {/* En-tête nœud */}
      <div className="px-4 py-3 border-b border-[#E8E4DF] flex-shrink-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            {subjectCfg && (
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center text-base flex-shrink-0"
                style={{ background: subjectCfg.bg }}
              >
                {subjectCfg.emoji}
              </div>
            )}
            {nodeType === 'concept' && (
              <div className="w-8 h-8 rounded-xl bg-[#F5F3EF] flex items-center justify-center flex-shrink-0">
                <Hash size={14} className="text-[#9B9590]" />
              </div>
            )}
            {nodeType === 'note' && (
              <div className="w-8 h-8 rounded-xl bg-[#F5F3EF] flex items-center justify-center flex-shrink-0">
                <FileText size={14} className="text-[#9B9590]" />
              </div>
            )}
            <div className="min-w-0">
              <p className="text-xs font-bold text-[#1A1A1A] truncate leading-tight">{nodeLabel}</p>
              <p className="text-[10px] text-[#9B9590] capitalize">{
                nodeType === 'subject' ? 'Matière' :
                nodeType === 'concept' ? 'Concept / Tag' : 'Note'
              }</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-[#F5F3EF] text-[#9B9590] flex-shrink-0">
            <X size={13} />
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="px-4 py-3 border-b border-[#E8E4DF] flex-shrink-0">
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-[#F5F3EF] rounded-xl p-2.5">
            <p className="text-base font-bold text-[#1A1A1A]">{relatedNotes.length}</p>
            <p className="text-[10px] text-[#9B9590]">note{relatedNotes.length > 1 ? 's' : ''}</p>
          </div>
          <div className="bg-[#F5F3EF] rounded-xl p-2.5">
            <p className="text-base font-bold text-[#1A1A1A]">
              {totalWords > 999 ? `${(totalWords / 1000).toFixed(1)}k` : totalWords}
            </p>
            <p className="text-[10px] text-[#9B9590]">mots</p>
          </div>
          {avgReadTime > 0 && (
            <div className="bg-[#F5F3EF] rounded-xl p-2.5">
              <p className="text-base font-bold text-[#1A1A1A]">{avgReadTime} min</p>
              <p className="text-[10px] text-[#9B9590]">lecture moy.</p>
            </div>
          )}
          {dominantMood && MOOD_CONFIG[dominantMood] && (
            <div className="bg-[#F5F3EF] rounded-xl p-2.5">
              <p className="text-base">{MOOD_CONFIG[dominantMood].emoji}</p>
              <p className="text-[10px] text-[#9B9590]">{MOOD_CONFIG[dominantMood].label}</p>
            </div>
          )}
        </div>

        {lastNote && (
          <div className="mt-2 flex items-center gap-1.5 text-[10px] text-[#9B9590]">
            <Clock size={10} />
            Dernière note : {lastNote.updatedAt.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="px-4 py-3 space-y-2 flex-shrink-0 border-b border-[#E8E4DF]">
        {displaySubject && (
          <button
            onClick={() => onAskTutor(displaySubject)}
            className="w-full flex items-center gap-2 px-3 py-2.5 bg-[#F4A236] text-white rounded-xl text-xs font-semibold hover:bg-[#EAA240] active:scale-[0.98] transition-all"
          >
            <Sparkles size={13} />
            Interroger Cake sur{nodeType === 'subject' ? ' cette matière' : ' ce sujet'}
          </button>
        )}
        {nodeType === 'subject' && (
          <button
            onClick={() => onCreateNote(nodeId)}
            className="w-full flex items-center gap-2 px-3 py-2.5 bg-white border border-[#E8E4DF] text-[#1A1A1A] rounded-xl text-xs font-medium hover:bg-[#F5F3EF] active:scale-[0.98] transition-all"
          >
            <Plus size={13} />
            Ajouter une note ici
          </button>
        )}
      </div>

      {/* Notes liées */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        <p className="text-[10px] font-semibold text-[#9B9590] uppercase tracking-wider mb-1">
          Notes ({filteredNotes.length || relatedNotes.length})
        </p>
        {(filteredNotes.length > 0 ? filteredNotes : relatedNotes).map((note, i) => (
          <NoteCard key={note.id} note={note} onOpen={() => {}} index={i} />
        ))}
        {relatedNotes.length === 0 && (
          <p className="text-xs text-[#9B9590] text-center py-6">Aucune note liée</p>
        )}
      </div>
    </motion.div>
  );
}

// ─── Vue d'ensemble (panel par défaut) ────────────────────────────────────────

function OverviewPanel({
  notes, onSelectSubject,
}: {
  notes: Note[];
  onSelectSubject: (subject: string) => void;
}) {
  const subjectCounts = notes.reduce<Record<string, number>>((acc, n) => {
    acc[n.subject] = (acc[n.subject] ?? 0) + 1;
    return acc;
  }, {});
  const totalWords = notes.reduce((s, n) => s + n.wordCount, 0);
  const totalTags  = new Set(notes.flatMap((n) => n.tags.map((t) => t.label))).size;

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-[#E8E4DF] flex-shrink-0">
        <p className="text-xs font-semibold text-[#9B9590] uppercase tracking-wider">Vue d'ensemble</p>
      </div>

      {/* Stats globales */}
      <div className="px-4 py-3 border-b border-[#E8E4DF] flex-shrink-0">
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: 'Notes',    value: notes.length,   icon: FileText  },
            { label: 'Matières', value: Object.keys(subjectCounts).length, icon: BookOpen },
            { label: 'Tags',     value: totalTags,       icon: Hash      },
          ].map(({ label, value, icon: Icon }) => (
            <div key={label} className="bg-[#F5F3EF] rounded-xl p-2.5 text-center">
              <p className="text-base font-bold text-[#1A1A1A]">{value}</p>
              <p className="text-[10px] text-[#9B9590]">{label}</p>
            </div>
          ))}
        </div>
        <div className="mt-2 flex items-center gap-1.5 text-[10px] text-[#9B9590]">
          <TrendingUp size={10} />
          {totalWords > 999 ? `${(totalWords / 1000).toFixed(1)}k` : totalWords} mots au total
        </div>
      </div>

      {/* Liste matières cliquables */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
        <p className="text-[10px] font-semibold text-[#9B9590] uppercase tracking-wider mb-2">
          Matières — clique pour explorer
        </p>
        {Object.entries(subjectCounts)
          .sort((a, b) => b[1] - a[1])
          .map(([subject, count]) => {
            const config = SUBJECT_CONFIG[subject as Subject];
            if (!config) return null;
            const pct = Math.round((count / notes.length) * 100);
            return (
              <button
                key={subject}
                onClick={() => onSelectSubject(subject)}
                className="w-full flex items-center gap-3 px-3 py-2.5 bg-[#FAF8F5] rounded-xl hover:bg-white hover:border-[#F4A236] border border-transparent transition-all text-left"
              >
                <span className="text-base flex-shrink-0">{config.emoji}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-[#1A1A1A] truncate">{subject}</span>
                    <span className="text-[10px] font-semibold text-[#9B9590] flex-shrink-0">{count}</span>
                  </div>
                  {/* Barre de progression */}
                  <div className="mt-1 h-1 bg-[#E8E4DF] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${pct}%`, background: config.color }}
                    />
                  </div>
                </div>
              </button>
            );
          })}
      </div>
    </div>
  );
}

// ─── Page principale ──────────────────────────────────────────────────────────

export default function GraphPage() {
  const router = useRouter();
  const { notes, graphFilterNodeId, setGraphFilter, openEditor } = useStore();

  const [selectedNode, setSelectedNode] = useState<{
    id: string; label: string; type: string;
  } | null>(null);
  const [showAllNotes, setShowAllNotes] = useState(true);
  const [viewNote, setViewNote] = useState<Note | null>(null);

  const handleNodeClick = useCallback((nodeId: string, label: string, type: string) => {
    if (graphFilterNodeId === nodeId) {
      setSelectedNode(null);
      setGraphFilter(null);
    } else {
      setSelectedNode({ id: nodeId, label, type });
    }
  }, [graphFilterNodeId, setGraphFilter]);

  const handleAskTutor = useCallback((subject: string) => {
    // Encode le sujet en query param pour pré-remplir le chat
    router.push(`/tutor?subject=${encodeURIComponent(subject)}`);
  }, [router]);

  const handleCreateNote = useCallback((subject?: string) => {
    openEditor(undefined);
    // Le sujet sera pré-sélectionné via le store si on le set ici
    if (subject) {
      useStore.setState({ filterSubject: subject as Subject });
    }
  }, [openEditor]);

  const handleSelectSubject = useCallback((subject: string) => {
    setGraphFilter(subject);
    setSelectedNode({ id: subject, label: subject, type: 'subject' });
  }, [setGraphFilter]);

  const handleClose = useCallback(() => {
    setSelectedNode(null);
    setGraphFilter(null);
  }, [setGraphFilter]);

  return (
    <Shell>
      <div className="flex flex-col h-screen overflow-hidden">

        {/* Header */}
        <div className="px-5 md:px-8 py-4 border-b border-[#E8E4DF] bg-[#FAF8F5] flex-shrink-0">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-2xl font-bold text-[#1A1A1A] flex items-center gap-2">
                <Network size={22} className="text-[#F4A236]" />
                Carte des connaissances
              </h1>
              <p className="text-xs text-[#9B9590] mt-0.5">
                Explore les connexions entre tes matières, notes et concepts
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Légende nœuds */}
              <div className="hidden sm:flex items-center gap-3 bg-white rounded-xl px-3 py-2 border border-[#E8E4DF] text-xs text-[#9B9590]">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#F4A236]" /> Matières
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#1A1A1A]" /> Concepts
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#9B9590]" /> Notes
                </span>
                <span className="flex items-center gap-1.5 opacity-60">
                  <span className="w-5 h-px border-t border-dashed border-[#9B9590]" /> Connexions
                </span>
              </div>

              {/* Légende maîtrise */}
              <div className="hidden md:flex items-center gap-2 bg-white rounded-xl px-3 py-2 border border-[#E8E4DF] text-xs text-[#9B9590]">
                <span className="text-[10px] font-semibold uppercase tracking-wider mr-1">Maîtrise</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-[#22C55E]" /> OK</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-[#F59E0B]" /> Fragile</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-[#EF4444]" /> Lacune</span>
              </div>

              {/* Toggle toutes les notes */}
              <button
                onClick={() => setShowAllNotes((v) => !v)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-medium transition-all',
                  showAllNotes
                    ? 'bg-[#1A1A1A] text-white border-[#1A1A1A]'
                    : 'bg-white text-[#9B9590] border-[#E8E4DF] hover:border-[#1A1A1A]'
                )}
              >
                {showAllNotes ? <Eye size={13} /> : <EyeOff size={13} />}
                {showAllNotes ? 'Toutes les notes' : 'Épinglées seulement'}
              </button>
            </div>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">

          {/* Canvas graphe */}
          <div className="flex-1 relative bg-[#FAFAFA] min-w-0">
            {notes.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center px-8">
                <div className="w-16 h-16 rounded-3xl bg-[#F5F3EF] flex items-center justify-center mb-4">
                  <Network size={24} className="text-[#C8C4BE]" />
                </div>
                <h3 className="text-[#1A1A1A] font-semibold mb-1">Aucune carte pour l'instant</h3>
                <p className="text-[#9B9590] text-sm max-w-xs">
                  Ajoute des notes avec des matières et des tags pour voir ta carte des connaissances se construire.
                </p>
              </div>
            ) : (
              <KnowledgeGraph
                onNodeClick={handleNodeClick}
                showAllNotes={showAllNotes}
              />
            )}

            {/* Badge filtre actif */}
            {graphFilterNodeId && selectedNode && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-[#1A1A1A] text-white text-xs px-3 py-1.5 rounded-full shadow-lg"
              >
                <span>Filtre : <strong>{selectedNode.label}</strong></span>
                <button onClick={handleClose} className="hover:text-[#F4A236] transition-colors">
                  <X size={12} />
                </button>
              </motion.div>
            )}

            {/* Hint bas */}
            <div className="absolute bottom-4 left-4 flex items-center gap-1.5 text-[10px] text-[#9B9590] bg-white/80 backdrop-blur-sm rounded-xl px-2.5 py-1.5 border border-[#E8E4DF]">
              <Info size={10} />
              Clique sur un nœud · Glisse pour déplacer · Molette pour zoomer
            </div>
          </div>

          {/* Panel latéral */}
          <div className="hidden lg:flex flex-col w-72 border-l border-[#E8E4DF] bg-white overflow-hidden">
            <AnimatePresence mode="wait">
              {selectedNode ? (
                <NodePanel
                  key={selectedNode.id}
                  nodeId={selectedNode.id}
                  nodeLabel={selectedNode.label}
                  nodeType={selectedNode.type}
                  onClose={handleClose}
                  onAskTutor={handleAskTutor}
                  onCreateNote={handleCreateNote}
                />
              ) : (
                <motion.div
                  key="overview"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="h-full"
                >
                  <OverviewPanel notes={notes} onSelectSubject={handleSelectSubject} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

        </div>
      </div>

      <NoteEditor />
      <PinLockModal />
    </Shell>
  );
}
