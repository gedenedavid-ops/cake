'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Network, BookOpen, Info, X } from 'lucide-react';
import { Shell } from '@/components/layout/Shell';
import { KnowledgeGraph } from '@/components/graph/KnowledgeGraph';
import { useStore, useFilteredNotes } from '@/store';
import { NoteCard } from '@/components/journal/NoteCard';
import { NoteEditor } from '@/components/journal/NoteEditor';
import { PinLockModal } from '@/components/journal/PinLock';
import { SUBJECT_CONFIG } from '@/lib/utils';
import type { Note } from '@/types';

export default function GraphPage() {
  const { notes, graphFilterNodeId, setGraphFilter } = useStore();
  const filteredNotes = useFilteredNotes();
  const [selectedNodeLabel, setSelectedNodeLabel] = useState<string | null>(null);
  const [viewNote, setViewNote] = useState<Note | null>(null);

  const subjectCounts = notes.reduce<Record<string, number>>((acc, n) => {
    acc[n.subject] = (acc[n.subject] ?? 0) + 1;
    return acc;
  }, {});

  const handleNodeClick = (nodeId: string, label: string) => {
    setSelectedNodeLabel(graphFilterNodeId === nodeId ? null : label);
  };

  return (
    <Shell>
      <div className="flex flex-col h-screen overflow-hidden">
        {/* Header */}
        <div className="px-5 md:px-8 py-4 border-b border-[#E8E4DF] bg-[#FAF8F5] flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
                  <h1 className="text-2xl font-bold text-[#1A1A1A] flex items-center gap-2">
                    <Network size={22} className="text-[#F4A236]" />
                    Carte des connaissances
                  </h1>
                  <p className="text-xs text-[#9B9590] mt-0.5">
                    Explore les connexions entre tes matières, notes et concepts
                  </p>
                </div>
            <div className="flex items-center gap-2 text-xs text-[#9B9590]">
              <div className="hidden sm:flex items-center gap-3 bg-white rounded-xl px-3 py-2 border border-[#E8E4DF]">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#F4A236]" /> Matières
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#1A1A1A]" /> Concepts
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#9B9590]" /> Notes
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Graph Canvas */}
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
              <KnowledgeGraph onNodeClick={handleNodeClick} />
            )}

            {/* Active filter badge */}
            {graphFilterNodeId && selectedNodeLabel && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-[#1A1A1A] text-white text-xs px-3 py-1.5 rounded-full shadow-lg"
              >
                <span>Filtre actif : <strong>{selectedNodeLabel}</strong></span>
                <button onClick={() => { setGraphFilter(null); setSelectedNodeLabel(null); }} className="hover:text-[#F4A236]">
                  <X size={12} />
                </button>
              </motion.div>
            )}

            {/* Hint */}
            <div className="absolute bottom-4 left-4 flex items-center gap-1.5 text-[10px] text-[#9B9590] bg-white/80 backdrop-blur-sm rounded-xl px-2.5 py-1.5 border border-[#E8E4DF]">
              <Info size={10} />
              Clique sur un nœud pour filtrer · Glisse pour déplacer · Molette pour zoomer
            </div>
          </div>

          {/* Side Panel */}
          <div className="hidden lg:flex flex-col w-72 border-l border-[#E8E4DF] bg-white overflow-hidden">
            <div className="px-4 py-3 border-b border-[#E8E4DF]">
              <p className="text-xs font-semibold text-[#9B9590] uppercase tracking-wider">
                {graphFilterNodeId ? `Notes filtrées (${filteredNotes.length})` : 'Vue d\'ensemble'}
              </p>
            </div>

            <div className="flex-1 overflow-y-auto p-3">
              {!graphFilterNodeId ? (
                // Subjects list
                <div className="space-y-2">
                  {Object.entries(subjectCounts).map(([subject, count]) => {
                    const config = SUBJECT_CONFIG[subject as keyof typeof SUBJECT_CONFIG];
                    if (!config) return null;
                    return (
                      <div key={subject} className="flex items-center justify-between px-3 py-2.5 bg-[#FAF8F5] rounded-xl">
                        <div className="flex items-center gap-2">
                          <span className="text-sm">{config.emoji}</span>
                          <span className="text-xs font-medium text-[#1A1A1A]">{subject}</span>
                        </div>
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-white border border-[#E8E4DF] text-[#9B9590]">
                          {count}
                        </span>
                      </div>
                    );
                  })}
                  {Object.keys(subjectCounts).length === 0 && (
                    <p className="text-xs text-[#9B9590] text-center py-8">Aucune matière pour l'instant</p>
                  )}
                </div>
              ) : (
                // Filtered notes
                <div className="space-y-2">
                  {filteredNotes.length === 0 ? (
                    <p className="text-xs text-[#9B9590] text-center py-8">Aucune note pour ce filtre</p>
                  ) : (
                    filteredNotes.map((note, i) => (
                      <NoteCard key={note.id} note={note} onOpen={setViewNote} index={i} />
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <NoteEditor />
      <PinLockModal />
    </Shell>
  );
}
