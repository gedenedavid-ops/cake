'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Plus, Hash, Lock, Unlock, Pin, Image as ImageIcon,
  AlignLeft, Tag, Smile, Palette, ChevronDown,
} from 'lucide-react';
import { useStore } from '@/store';
import { SUBJECT_CONFIG, MOOD_CONFIG, generateId, countWords, estimateReadTime, cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import type { Subject, Mood, NoteFormData, NoteTag } from '@/types';

const SUBJECTS = Object.keys(SUBJECT_CONFIG) as Subject[];
const MOODS = Object.keys(MOOD_CONFIG) as Mood[];
const COLORS: Array<{ key: 'default' | 'ochre' | 'dark'; label: string; preview: string }> = [
  { key: 'default', label: 'Défaut', preview: '#FFFFFF' },
  { key: 'ochre',   label: 'Ocre',   preview: '#F4A236' },
  { key: 'dark',    label: 'Sombre', preview: '#1A1A1A' },
];

export function NoteEditor() {
  const { editorOpen, editingNoteId, closeEditor, notes, addNote, updateNote, addToast } = useStore();

  const existingNote = editingNoteId ? notes.find((n) => n.id === editingNoteId) : null;

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [subject, setSubject] = useState<Subject>('Autre');
  const [mood, setMood] = useState<Mood | undefined>(undefined);
  const [tags, setTags] = useState<NoteTag[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [isLocked, setIsLocked] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const [color, setColor] = useState<'default' | 'ochre' | 'dark'>('default');
  const [focusMode, setFocusMode] = useState(false);
  const [showSubjectMenu, setShowSubjectMenu] = useState(false);
  const [showMoodMenu, setShowMoodMenu] = useState(false);
  const [showColorMenu, setShowColorMenu] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Populate fields when editing
  useEffect(() => {
    if (existingNote) {
      setTitle(existingNote.title);
      setContent(existingNote.content);
      setSubject(existingNote.subject);
      setMood(existingNote.mood);
      setTags(existingNote.tags);
      setIsLocked(existingNote.isLocked);
      setIsPinned(existingNote.isPinned);
      setColor(existingNote.color ?? 'default');
    } else {
      setTitle(''); setContent(''); setSubject('Autre');
      setMood(undefined); setTags([]); setIsLocked(false);
      setIsPinned(false); setColor('default');
    }
  }, [existingNote, editorOpen]);

  useEffect(() => {
    if (editorOpen) setTimeout(() => textareaRef.current?.focus(), 100);
  }, [editorOpen]);

  const wordCount = countWords(content);
  const readTime = estimateReadTime(content);

  const addTag = useCallback(() => {
    const label = tagInput.trim().replace(/^#/, '').toLowerCase();
    if (!label || tags.some((t) => t.label === label)) return;
    setTags((prev) => [...prev, { id: generateId(), label, color: '#F5F3EF' }]);
    setTagInput('');
  }, [tagInput, tags]);

  const handleSave = () => {
    if (!title.trim() && !content.trim()) {
      addToast({ type: 'warning', message: 'Ajoute un titre ou du contenu d\'abord.' });
      return;
    }
    const data: NoteFormData = {
      title: title.trim() || 'Untitled',
      content,
      subject,
      tags,
      mood,
      attachments: existingNote?.attachments ?? [],
      isLocked,
      isPinned,
      isFavorite: existingNote?.isFavorite ?? false,
      color,
    };
    if (existingNote) {
      updateNote(existingNote.id, data);
      addToast({ type: 'success', message: 'Note mise à jour ✓' });
    } else {
      addNote(data);
      addToast({ type: 'success', message: 'Note enregistrée ✓' });
    }
    closeEditor();
  };

  if (!editorOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className={cn(
            'absolute inset-0 backdrop-blur-sm transition-colors',
            focusMode ? 'bg-black/70' : 'bg-black/30'
          )}
          onClick={closeEditor}
        />

        {/* Editor Panel */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 40 }}
          transition={{ type: 'spring', stiffness: 350, damping: 32 }}
          className={cn(
            'relative w-full bg-white rounded-t-3xl md:rounded-3xl shadow-2xl flex flex-col overflow-hidden',
            focusMode ? 'h-[95vh] md:max-w-3xl' : 'h-[85vh] md:max-w-2xl md:h-auto md:max-h-[90vh]'
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Toolbar */}
          <div className="flex items-center gap-2 px-4 py-3 border-b border-[#E8E4DF] flex-shrink-0">
            {/* Subject Picker */}
            <div className="relative">
              <button
                onClick={() => { setShowSubjectMenu(!showSubjectMenu); setShowMoodMenu(false); setShowColorMenu(false); }}
                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[#F5F3EF] rounded-xl text-xs font-medium text-[#1A1A1A] hover:bg-[#EDE9E3] transition-colors"
              >
                <span>{SUBJECT_CONFIG[subject].emoji}</span>
                <span className="hidden sm:inline max-w-[80px] truncate">{subject}</span>
                <ChevronDown size={12} />
              </button>
              {showSubjectMenu && (
                <div className="absolute top-9 left-0 z-10 bg-white border border-[#E8E4DF] rounded-2xl shadow-lg p-2 grid grid-cols-2 gap-1 w-56 max-h-52 overflow-y-auto">
                  {SUBJECTS.map((s) => (
                    <button
                      key={s}
                      onClick={() => { setSubject(s); setShowSubjectMenu(false); }}
                      className={cn(
                        'flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs text-left transition-colors',
                        subject === s ? 'bg-[#FDF0DC] text-[#F4A236]' : 'hover:bg-[#F5F3EF] text-[#1A1A1A]'
                      )}
                    >
                      <span>{SUBJECT_CONFIG[s].emoji}</span>
                      <span className="truncate">{s}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Mood Picker */}
            <div className="relative">
              <button
                onClick={() => { setShowMoodMenu(!showMoodMenu); setShowSubjectMenu(false); setShowColorMenu(false); }}
                className="flex items-center gap-1 px-2.5 py-1.5 bg-[#F5F3EF] rounded-xl text-xs hover:bg-[#EDE9E3] transition-colors"
                title="Set mood"
              >
                {mood ? <span>{MOOD_CONFIG[mood].emoji}</span> : <Smile size={13} className="text-[#9B9590]" />}
                <ChevronDown size={12} className="text-[#9B9590]" />
              </button>
              {showMoodMenu && (
                <div className="absolute top-9 left-0 z-10 bg-white border border-[#E8E4DF] rounded-2xl shadow-lg p-2 flex flex-wrap gap-1 w-48">
                  {MOODS.map((m) => (
                    <button
                      key={m}
                      onClick={() => { setMood(mood === m ? undefined : m); setShowMoodMenu(false); }}
                      className={cn(
                        'flex items-center gap-1 px-2 py-1 rounded-xl text-xs transition-colors',
                        mood === m ? 'bg-[#FDF0DC]' : 'hover:bg-[#F5F3EF]'
                      )}
                    >
                      <span>{MOOD_CONFIG[m].emoji}</span>
                      <span className="text-[#1A1A1A]">{MOOD_CONFIG[m].label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Color Picker */}
            <div className="relative">
              <button
                onClick={() => { setShowColorMenu(!showColorMenu); setShowSubjectMenu(false); setShowMoodMenu(false); }}
                className="p-1.5 bg-[#F5F3EF] rounded-xl hover:bg-[#EDE9E3] transition-colors"
                title="Card color"
              >
                <Palette size={13} className="text-[#9B9590]" />
              </button>
              {showColorMenu && (
                <div className="absolute top-9 left-0 z-10 bg-white border border-[#E8E4DF] rounded-2xl shadow-lg p-2 flex gap-2">
                  {COLORS.map((c) => (
                    <button
                      key={c.key}
                      onClick={() => { setColor(c.key); setShowColorMenu(false); }}
                      className={cn('w-7 h-7 rounded-full border-2 transition-transform hover:scale-110', color === c.key ? 'border-[#F4A236]' : 'border-transparent')}
                      style={{ backgroundColor: c.preview }}
                      title={c.label}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Lock toggle */}
            <button
              onClick={() => setIsLocked(!isLocked)}
              className={cn(
                'p-1.5 rounded-xl transition-colors',
                isLocked ? 'bg-[#1A1A1A] text-white' : 'bg-[#F5F3EF] text-[#9B9590] hover:bg-[#EDE9E3]'
              )}
              title={isLocked ? 'Unlock' : 'Lock note'}
            >
              {isLocked ? <Lock size={13} /> : <Unlock size={13} />}
            </button>

            {/* Pin toggle */}
            <button
              onClick={() => setIsPinned(!isPinned)}
              className={cn(
                'p-1.5 rounded-xl transition-colors',
                isPinned ? 'bg-[#FDF0DC] text-[#F4A236]' : 'bg-[#F5F3EF] text-[#9B9590] hover:bg-[#EDE9E3]'
              )}
              title={isPinned ? 'Unpin' : 'Pin note'}
            >
              <Pin size={13} />
            </button>

            {/* Focus mode */}
            <button
              onClick={() => setFocusMode(!focusMode)}
              className={cn(
                'p-1.5 rounded-xl transition-colors ml-auto',
                focusMode ? 'bg-[#1A1A1A] text-white' : 'bg-[#F5F3EF] text-[#9B9590] hover:bg-[#EDE9E3]'
              )}
              title={focusMode ? 'Exit focus mode' : 'Focus mode'}
            >
              <AlignLeft size={13} />
            </button>

            <button
              onClick={closeEditor}
              className="p-1.5 rounded-xl bg-[#F5F3EF] text-[#9B9590] hover:bg-[#EDE9E3] hover:text-[#1A1A1A] transition-colors"
            >
              <X size={13} />
            </button>
          </div>

          {/* Title */}
          <div className="px-5 pt-4">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Note title…"
              className="w-full text-xl font-bold text-[#1A1A1A] placeholder-[#C8C4BE] bg-transparent border-none focus:outline-none"
            />
          </div>

          {/* Content */}
          <div className="flex-1 px-5 py-2 overflow-y-auto min-h-0">
            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Start writing… Use this space to capture your thoughts, lessons, questions, or ideas. There's no wrong way to take notes."
              className="w-full h-full min-h-[200px] resize-none text-[#1A1A1A] placeholder-[#C8C4BE] bg-transparent text-sm leading-relaxed focus:outline-none note-content"
            />
          </div>

          {/* Tags row */}
          <div className="px-5 py-2 border-t border-[#F5F3EF] flex flex-wrap items-center gap-1.5">
            <Tag size={12} className="text-[#9B9590]" />
            {tags.map((tag) => (
              <span
                key={tag.id}
                className="flex items-center gap-1 text-[11px] px-2 py-0.5 bg-[#F5F3EF] text-[#9B9590] rounded-full"
              >
                #{tag.label}
                <button
                  onClick={() => setTags((prev) => prev.filter((t) => t.id !== tag.id))}
                  className="hover:text-red-500 transition-colors"
                >
                  <X size={9} />
                </button>
              </span>
            ))}
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag(); }
              }}
              onBlur={addTag}
              placeholder="Add tag…"
              className="text-[11px] text-[#9B9590] placeholder-[#C8C4BE] bg-transparent w-20 focus:outline-none"
            />
          </div>

          {/* Footer */}
          <div className="px-5 py-3 border-t border-[#E8E4DF] flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-3 text-[11px] text-[#9B9590]">
              <span>{wordCount} words</span>
              <span>~{readTime} min read</span>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="secondary" size="sm" onClick={closeEditor}>
                Cancel
              </Button>
              <Button variant="dark" size="sm" onClick={handleSave}>
                {existingNote ? 'Update' : 'Save note'}
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
