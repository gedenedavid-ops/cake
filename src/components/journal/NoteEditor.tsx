'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Lock, Unlock, Pin,
  AlignLeft, Tag, Smile, Palette, ChevronDown,
  GitCompare, Pencil, BookPlus, Loader2, ChevronUp,
  Layers, FileText, Mic, MicOff, ScanText,
} from 'lucide-react';
import { useStore } from '@/store';
import { SUBJECT_CONFIG, MOOD_CONFIG, generateId, countWords, estimateReadTime, cn } from '@/lib/utils';
import { renderMarkdown } from '@/lib/renderMarkdown';
import { Button } from '@/components/ui/Button';
import { FlashcardsModal, type Flashcard } from '@/components/journal/FlashcardsModal';
import type { Subject, Mood, NoteFormData, NoteTag } from '@/types';

// ─── Types IA ─────────────────────────────────────────────────────────────────

type AnalyzeMode = 'compare' | 'correct' | 'complete' | 'flashcards' | 'exam';
type AISuggestion = { mode: AnalyzeMode; result: string } | null;

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

  // ── IA inline ──────────────────────────────────────────────────────────────
  const [aiLoading, setAiLoading] = useState<AnalyzeMode | null>(null);
  const [aiSuggestion, setAiSuggestion] = useState<AISuggestion>(null);
  const [flashcards, setFlashcards] = useState<Flashcard[] | null>(null);

  // ── Dictée vocale ──────────────────────────────────────────────────────────
  const [isRecording, setIsRecording] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);

  // ── OCR ────────────────────────────────────────────────────────────────────
  const [isOcrLoading, setIsOcrLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // ── Dictée vocale ──────────────────────────────────────────────────────────
  const toggleRecording = useCallback(() => {
    if (typeof window === 'undefined') return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRecognitionAPI: any =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition || null;

    if (!SpeechRecognitionAPI) {
      addToast({ type: 'warning', message: 'La dictée vocale n\'est pas supportée par ce navigateur.' });
      return;
    }

    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
      return;
    }

    const recognition = new SpeechRecognitionAPI();
    recognition.lang = 'fr-FR';
    recognition.continuous = true;
    recognition.interimResults = false;

    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results as any[])
        .slice(event.resultIndex)
        .map((r: any) => r[0].transcript)
        .join(' ');
      setContent((c) => c + (c.endsWith(' ') || c === '' ? '' : ' ') + transcript);
    };

    recognition.onerror = () => { setIsRecording(false); };
    recognition.onend   = () => { setIsRecording(false); };

    recognitionRef.current = recognition;
    recognition.start();
    setIsRecording(true);
  }, [isRecording, addToast]);

  // ── OCR via Gemini Vision ───────────────────────────────────────────────────
  const handleOcrFile = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Réinitialise l'input pour permettre de re-sélectionner le même fichier
    e.target.value = '';

    if (!file.type.startsWith('image/')) {
      addToast({ type: 'warning', message: 'Sélectionne une image (JPEG, PNG, WEBP).' });
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      addToast({ type: 'warning', message: 'Image trop grande — max 4 Mo.' });
      return;
    }

    setIsOcrLoading(true);
    try {
      // Lire le fichier en base64
      const imageBase64: string = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          // Retirer le préfixe data:image/...;base64,
          resolve(result.split(',')[1]);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const res = await fetch('/api/ocr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64, mimeType: file.type }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error ?? 'Erreur OCR');

      // Injecter le texte reconnu à la suite du contenu existant
      setContent((c) => {
        const sep = c.trim() ? '\n\n' : '';
        return c + sep + data.text;
      });
      addToast({ type: 'success', message: '📷 Texte reconnu et injecté dans la note ✓' });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur OCR';
      addToast({ type: 'error', message: msg });
    } finally {
      setIsOcrLoading(false);
    }
  }, [addToast]);

  // ── Analyse IA ─────────────────────────────────────────────────────────────
  const handleAnalyze = useCallback(async (mode: AnalyzeMode) => {
    if (!existingNote?.id) {
      addToast({ type: 'warning', message: 'Sauvegarde la note d\'abord pour l\'analyser.' });
      return;
    }
    if (!content.trim()) {
      addToast({ type: 'warning', message: 'La note est vide, rien à analyser.' });
      return;
    }
    setAiLoading(mode);
    setAiSuggestion(null);
    try {
      const res = await fetch(`/api/notes/${existingNote.id}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Erreur');
      if (mode === 'flashcards' && data.flashcards?.length) {
        setFlashcards(data.flashcards);
      } else {
        setAiSuggestion({ mode, result: data.result });
      }
    } catch {
      addToast({ type: 'error', message: 'L\'analyse IA a échoué. Réessaie.' });
    } finally {
      setAiLoading(null);
    }
  }, [existingNote?.id, content, addToast]);

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

  // ── Rendu flashcards modal (hors du panel éditeur) ──────────────────────────
  if (flashcards) {
    return (
      <FlashcardsModal
        cards={flashcards}
        noteTitle={existingNote?.title ?? title}
        onClose={() => setFlashcards(null)}
      />
    );
  }

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
          <div className="flex items-center gap-2 px-4 py-3 border-b border-[#E8E4DF] flex-shrink-0 flex-wrap">
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
              title={isLocked ? 'Déverrouiller' : 'Verrouiller la note'}
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
              title={isPinned ? 'Désépingler' : 'Épingler la note'}
            >
              <Pin size={13} />
            </button>

            {/* Bouton OCR Scanner — toujours visible (fonctionne sur nouvelle note aussi) */}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isOcrLoading}
              className={cn(
                'p-1.5 rounded-xl transition-colors ml-auto',
                isOcrLoading
                  ? 'bg-[#F4A236] text-white'
                  : 'bg-[#F5F3EF] text-[#9B9590] hover:bg-[#EDE9E3] hover:text-[#1A1A1A]'
              )}
              title="Scanner une feuille manuscrite (OCR Gemini)"
            >
              {isOcrLoading ? <Loader2 size={13} className="animate-spin" /> : <ScanText size={13} />}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              capture="environment"
              className="hidden"
              onChange={handleOcrFile}
            />

            {/* Focus mode */}
            <button
              onClick={() => setFocusMode(!focusMode)}
              className={cn(
                'p-1.5 rounded-xl transition-colors',
                focusMode ? 'bg-[#1A1A1A] text-white' : 'bg-[#F5F3EF] text-[#9B9590] hover:bg-[#EDE9E3]'
              )}
              title={focusMode ? 'Quitter le mode focus' : 'Mode focus'}
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

          {/* Barre IA — visible uniquement en mode édition d'une note existante */}
          {existingNote && (
          <div className="flex items-center gap-1.5 px-4 py-2 bg-[#FDFAF5] border-b border-[#E8E4DF] flex-shrink-0 flex-wrap">
            <span className="text-[10px] font-semibold text-[#9B9590] mr-1">IA</span>
            {(
              [
                { mode: 'compare'    as AnalyzeMode, icon: GitCompare, label: 'Comparer'       },
                { mode: 'correct'    as AnalyzeMode, icon: Pencil,     label: 'Corriger'        },
                { mode: 'complete'   as AnalyzeMode, icon: BookPlus,   label: 'Compléter'       },
                { mode: 'flashcards' as AnalyzeMode, icon: Layers,     label: 'Flashcards'      },
                { mode: 'exam'       as AnalyzeMode, icon: FileText,   label: 'Examen blanc'    },
              ] as const
            ).map(({ mode, icon: Icon, label }) => (
              <button
                key={mode}
                onClick={() => handleAnalyze(mode)}
                disabled={!!aiLoading}
                className={cn(
                  'flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10px] font-medium transition-all',
                  aiLoading === mode
                    ? 'bg-[#F4A236] text-white'
                    : 'bg-white border border-[#E8E4DF] text-[#57514C] hover:border-[#F4A236] hover:text-[#F4A236]',
                  !!aiLoading && aiLoading !== mode && 'opacity-50 cursor-not-allowed'
                )}
              >
                {aiLoading === mode
                  ? <Loader2 size={10} className="animate-spin" />
                  : <Icon size={10} />
                }
                {label}
              </button>
            ))}

            {/* Bouton dictée vocale */}
            <button
              onClick={toggleRecording}
              className={cn(
                'flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10px] font-medium transition-all',
                isRecording
                  ? 'bg-red-500 text-white animate-pulse'
                  : 'bg-white border border-[#E8E4DF] text-[#57514C] hover:border-[#F4A236] hover:text-[#F4A236]'
              )}
              title={isRecording ? 'Arrêter la dictée' : 'Dicter une note'}
            >
              {isRecording ? <MicOff size={10} /> : <Mic size={10} />}
              {isRecording ? 'Arrêter' : 'Dicter'}
            </button>

          </div>
        )}

          {/* Title */}
          <div className="px-5 pt-4">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Titre de la note…"
              className="w-full text-xl font-bold text-[#1A1A1A] placeholder-[#C8C4BE] bg-transparent border-none focus:outline-none"
            />
          </div>

          {/* Content */}
          <div className="flex-1 px-5 py-2 overflow-y-auto min-h-0">
            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => { setContent(e.target.value); setAiSuggestion(null); }}
              placeholder="Commence à écrire… Cours, idées, questions, réflexions. Il n'y a pas de mauvaise façon de prendre des notes."
              className="w-full h-full min-h-[200px] resize-none text-[#1A1A1A] placeholder-[#C8C4BE] bg-transparent text-sm leading-relaxed focus:outline-none note-content"
            />
          </div>

          {/* Panneau résultat IA */}
          <AnimatePresence>
            {aiSuggestion && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="border-t border-[#E8E4DF] bg-[#FDFAF5] overflow-hidden flex-shrink-0"
              >
                <div className="px-5 py-3 max-h-64 overflow-y-auto">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-semibold text-[#F4A236] uppercase tracking-wider flex items-center gap-1">
                      {aiSuggestion.mode === 'compare'  && 'Comparaison au programme'}
                      {aiSuggestion.mode === 'correct'  && 'Correction de l\'écrit'}
                      {aiSuggestion.mode === 'complete' && 'Compléments suggérés'}
                    </span>
                    <button
                      onClick={() => setAiSuggestion(null)}
                      className="p-1 rounded-lg text-[#9B9590] hover:text-[#1A1A1A] hover:bg-[#EDE9E3] transition-colors"
                    >
                      <ChevronUp size={12} />
                    </button>
                  </div>
                  <div className="text-xs text-[#1A1A1A] leading-relaxed space-y-0.5">
                    {renderMarkdown(aiSuggestion.result)}
                  </div>
                  {aiSuggestion.mode === 'complete' && (
                    <button
                      onClick={() => {
                        const sep = '\n\n---\n';
                        setContent((c) => c + sep + aiSuggestion.result);
                        setAiSuggestion(null);
                        addToast({ type: 'success', message: 'Compléments ajoutés à la note ✓' });
                      }}
                      className="mt-3 flex items-center gap-1.5 px-3 py-1.5 bg-[#F4A236] text-white rounded-xl text-[11px] font-semibold hover:bg-[#EAA240] transition-colors"
                    >
                      <BookPlus size={11} />
                      Ajouter à ma note
                    </button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

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
              placeholder="Ajouter un tag…"
              className="text-[11px] text-[#9B9590] placeholder-[#C8C4BE] bg-transparent w-20 focus:outline-none"
            />
          </div>

          {/* Footer */}
          <div className="px-5 py-3 border-t border-[#E8E4DF] flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-3 text-[11px] text-[#9B9590]">
              <span>{wordCount} mot{wordCount > 1 ? 's' : ''}</span>
              <span>~{readTime} min lec.</span>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="secondary" size="sm" onClick={closeEditor}>
                Annuler
              </Button>
              <Button variant="dark" size="sm" onClick={handleSave}>
                {existingNote ? 'Mettre à jour' : 'Enregistrer'}
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
