'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Lock, Pin, Heart, MoreHorizontal, Clock, BookOpen, Eye,
} from 'lucide-react';
import { useStore } from '@/store';
import { SUBJECT_CONFIG, MOOD_CONFIG, NOTE_COLORS, formatNoteDate, truncate, cn } from '@/lib/utils';
import { SubjectBadge, Badge } from '@/components/ui/Badge';
import type { Note } from '@/types';

interface NoteCardProps {
  note: Note;
  onOpen: (note: Note) => void;
  index?: number;
  /** Renders a compact horizontal row (list layout) */
  listMode?: boolean;
}

export function NoteCard({ note, onOpen, index = 0, listMode = false }: NoteCardProps) {
  const { pinNote, toggleFavorite, deleteNote, openEditor, openPinModal, addToast } = useStore();
  const isUnlocked = useStore((s) => s.unlockedNoteIds.includes(note.id));
  const [menuOpen, setMenuOpen] = useState(false);
  const subjectConfig = SUBJECT_CONFIG[note.subject];
  const moodConfig = note.mood ? MOOD_CONFIG[note.mood] : null;
  const colors = NOTE_COLORS[note.color ?? 'default'];

  const isLocked = note.isLocked && !isUnlocked;

  const handleCardClick = () => {
    if (isLocked) {
      openPinModal(note.id);
    } else {
      onOpen(note);
    }
  };

  // ── List mode : compact horizontal row ──────────────────────────────────────
  if (listMode) {
    return (
      <motion.article
        initial={{ opacity: 0, x: -8 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: index * 0.03, type: 'spring', stiffness: 300, damping: 28 }}
        className="relative group flex items-center gap-3 px-4 py-3 rounded-2xl overflow-hidden cursor-pointer hover:shadow-sm transition-shadow"
        style={{ backgroundColor: colors.bg, border: `1px solid ${colors.border}` }}
        onClick={handleCardClick}
      >
        {/* Subject emoji */}
        <span className="text-xl flex-shrink-0">{subjectConfig.emoji}</span>

        {/* Main content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <h3 className={cn(
              'font-semibold text-sm truncate',
              note.color === 'dark' || note.color === 'ochre' ? 'text-white' : 'text-[#1A1A1A]'
            )}>
              {note.title || 'Note sans titre'}
            </h3>
            {note.isPinned && <Pin size={10} fill="#F4A236" className="text-[#F4A236] flex-shrink-0" />}
            {note.isLocked && <Lock size={10} className="text-[#9B9590] flex-shrink-0" />}
            {moodConfig && <span className="text-xs flex-shrink-0">{moodConfig.emoji}</span>}
          </div>
          {!isLocked && (
            <p className={cn(
              'text-xs truncate',
              note.color === 'dark' || note.color === 'ochre' ? 'text-white/70' : 'text-[#9B9590]'
            )}>
              {truncate(note.content, 80)}
            </p>
          )}
        </div>

        {/* Right: meta + actions */}
        <div className="flex items-center gap-3 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
          <span className={cn(
            'text-[10px] hidden sm:block',
            note.color === 'dark' || note.color === 'ochre' ? 'text-white/50' : 'text-[#9B9590]'
          )}>
            {formatNoteDate(note.updatedAt)}
          </span>
          <button
            onClick={() => toggleFavorite(note.id)}
            className={cn(
              'p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all',
              note.color === 'dark' || note.color === 'ochre'
                ? 'hover:bg-white/10 text-white/70 hover:text-white'
                : 'hover:bg-[#F5F3EF] text-[#9B9590] hover:text-[#F4A236]'
            )}
          >
            <Heart size={13} fill={note.isFavorite ? 'currentColor' : 'none'} />
          </button>
          <button
            onClick={() => { openEditor(note.id); }}
            className={cn(
              'p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all text-[10px] font-medium',
              note.color === 'dark' || note.color === 'ochre'
                ? 'hover:bg-white/10 text-white/70'
                : 'hover:bg-[#F5F3EF] text-[#9B9590] hover:text-[#1A1A1A]'
            )}
          >
            <BookOpen size={13} />
          </button>
        </div>
      </motion.article>
    );
  }

  // ── Card mode (masonry / grid) ───────────────────────────────────────────────
  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, type: 'spring', stiffness: 300, damping: 28 }}
      className="relative group rounded-2xl overflow-hidden cursor-pointer"
      style={{ backgroundColor: colors.bg, border: `1px solid ${colors.border}` }}
      onClick={handleCardClick}
    >
      {/* Pinned indicator */}
      {note.isPinned && (
        <div className="absolute top-3 right-3 z-10">
          <div className="w-5 h-5 rounded-full bg-[#F4A236] flex items-center justify-center">
            <Pin size={10} fill="white" className="text-white" />
          </div>
        </div>
      )}

      <div className="p-4">
        {/* Header row */}
        <div className="flex items-start justify-between gap-2 mb-2.5">
          <div className="flex items-center gap-1.5 flex-wrap flex-1 min-w-0">
            <SubjectBadge
              emoji={subjectConfig.emoji}
              label={note.subject}
              color={note.color === 'dark' || note.color === 'ochre' ? 'rgba(255,255,255,0.8)' : subjectConfig.color}
              bg={note.color === 'dark' || note.color === 'ochre' ? 'rgba(255,255,255,0.15)' : subjectConfig.bg}
            />
            {moodConfig && (
              <span className="text-sm" title={moodConfig.label}>{moodConfig.emoji}</span>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => toggleFavorite(note.id)}
              className={cn(
                'p-1.5 rounded-lg transition-colors',
                note.color === 'dark' || note.color === 'ochre'
                  ? 'hover:bg-white/10 text-white/70 hover:text-white'
                  : 'hover:bg-[#F5F3EF] text-[#9B9590] hover:text-[#F4A236]'
              )}
              aria-label="Favorite"
            >
              <Heart size={14} fill={note.isFavorite ? 'currentColor' : 'none'} />
            </button>
            <div className="relative">
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className={cn(
                  'p-1.5 rounded-lg transition-colors',
                  note.color === 'dark' || note.color === 'ochre'
                    ? 'hover:bg-white/10 text-white/70 hover:text-white'
                    : 'hover:bg-[#F5F3EF] text-[#9B9590] hover:text-[#1A1A1A]'
                )}
                aria-label="More options"
              >
                <MoreHorizontal size={14} />
              </button>
              {menuOpen && (
                <div
                  className="absolute right-0 top-8 z-20 bg-white border border-[#E8E4DF] rounded-xl shadow-lg py-1 min-w-[140px]"
                  onMouseLeave={() => setMenuOpen(false)}
                >
                  {[
                    { label: 'Modifier', action: () => { openEditor(note.id); setMenuOpen(false); } },
                                    { label: note.isPinned ? 'Désépingler' : 'Épingler', action: () => { pinNote(note.id); setMenuOpen(false); } },
                                    { label: 'Supprimer', action: () => { deleteNote(note.id); addToast({ type: 'success', message: 'Note supprimée' }); setMenuOpen(false); }, danger: true },
                  ].map((item) => (
                    <button
                      key={item.label}
                      onClick={item.action}
                      className={cn(
                        'w-full text-left px-3 py-1.5 text-sm transition-colors',
                        item.danger
                          ? 'text-red-500 hover:bg-red-50'
                          : 'text-[#1A1A1A] hover:bg-[#F5F3EF]'
                      )}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Title */}
        <h3 className={cn(
          'font-semibold text-sm leading-snug mb-1.5',
          note.color === 'dark' || note.color === 'ochre' ? 'text-white' : 'text-[#1A1A1A]'
        )}>
          {note.title || 'Untitled note'}
        </h3>

        {/* Content preview or lock screen */}
        {isLocked ? (
          <div className="flex items-center gap-2 mt-3">
            <Lock size={14} className={note.color === 'dark' ? 'text-white/60' : 'text-[#9B9590]'} />
            <span className={cn('text-xs', note.color === 'dark' ? 'text-white/60' : 'text-[#9B9590]')}>
                  Note protégée
                </span>
          </div>
        ) : (
          <p className={cn(
            'text-xs leading-relaxed line-clamp-3',
            note.color === 'dark' || note.color === 'ochre' ? 'text-white/70' : 'text-[#9B9590]'
          )}>
            {truncate(note.content, 140)}
          </p>
        )}

        {/* Tags */}
        {note.tags.length > 0 && !isLocked && (
          <div className="flex flex-wrap gap-1 mt-2.5">
            {note.tags.slice(0, 3).map((tag) => (
              <span
                key={tag.id}
                className={cn(
                  'text-[10px] px-1.5 py-0.5 rounded-full',
                  note.color === 'dark' || note.color === 'ochre'
                    ? 'bg-white/15 text-white/80'
                    : 'bg-[#F5F3EF] text-[#9B9590]'
                )}
              >
                #{tag.label}
              </span>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className={cn(
          'flex items-center gap-3 mt-3 text-[10px]',
          note.color === 'dark' || note.color === 'ochre' ? 'text-white/50' : 'text-[#9B9590]'
        )}>
          <span className="flex items-center gap-1">
            <Clock size={10} />
            {formatNoteDate(note.updatedAt)}
          </span>
          {!isLocked && (
            <>
              <span className="flex items-center gap-1">
                <BookOpen size={10} />
                {note.wordCount} words
              </span>
              <span className="flex items-center gap-1">
                <Eye size={10} />
                {note.readTime} min
              </span>
            </>
          )}
          {note.isLocked && (
            <Lock size={10} />
          )}
        </div>
      </div>
    </motion.article>
  );
}
