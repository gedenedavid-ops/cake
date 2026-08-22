import { create } from 'zustand';
import { useMemo } from 'react';
import type { Note, NoteFormData, ChatMessage, ChatSession, NavRoute, Toast, Subject, Mood, SearchResult } from '@/types';
import {
  generateId,
  countWords,
  estimateReadTime,
  getFromStorage,
  setToStorage,
  reviveNote,
} from '@/lib/utils';

// ─── Notes Slice ──────────────────────────────────────────────────────────────

type NotesSlice = {
  notes: Note[];
  activeNoteId: string | null;
  searchQuery: string;
  filterSubject: Subject | null;
  filterMood: Mood | null;
  // Actions — async car elles passent par l'API MongoDB
  addNote: (data: NoteFormData) => Promise<Note>;
  updateNote: (id: string, data: Partial<NoteFormData>) => Promise<void>;
  deleteNote: (id: string) => Promise<void>;
  pinNote: (id: string) => Promise<void>;
  toggleFavorite: (id: string) => Promise<void>;
  setActiveNote: (id: string | null) => void;
  setSearchQuery: (q: string) => void;
  setFilterSubject: (s: Subject | null) => void;
  setFilterMood: (m: Mood | null) => void;
  loadNotes: () => Promise<void>;
};

// ─── Chat Slice ───────────────────────────────────────────────────────────────

type ChatSlice = {
  sessions: ChatSession[];
  activeSessionId: string | null;
  isAILoading: boolean;
  createSession: () => ChatSession;
  sendMessage: (content: string) => Promise<void>;
  setActiveSession: (id: string | null) => void;
};

// ─── Preferences Slice ────────────────────────────────────────────────────────

export type NoteLayout = 'masonry' | 'grid' | 'list';
export type AccentColor = '#F4A236' | '#3B82F6' | '#10B981' | '#8B5CF6' | '#EC4899';

export type UserPreferences = {
  displayName: string;
  noteLayout: NoteLayout;
  accentColor: AccentColor;
  pinHash: string;          // SHA-256 hex of PIN, never the raw PIN
  aiEnabled: boolean;       // user can opt-out of AI features
  language: 'en' | 'fr';
};

const PREFS_KEY = 'cake_prefs';

const DEFAULT_PREFS: UserPreferences = {
  displayName: '',
  noteLayout: 'masonry',
  accentColor: '#F4A236',
  pinHash: '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4', // SHA-256("1234")
  aiEnabled: true,
  language: 'fr',
};

// ─── UI Slice ─────────────────────────────────────────────────────────────────

type UISlice = {
  activeRoute: NavRoute;
  sidebarCollapsed: boolean;
  editorOpen: boolean;
  editingNoteId: string | null;
  pinModalNoteId: string | null;
  unlockedNoteIds: string[];
  toasts: Toast[];
  graphFilterNodeId: string | null;
  prefs: UserPreferences;
  setActiveRoute: (r: NavRoute) => void;
  setSidebarCollapsed: (v: boolean) => void;
  openEditor: (noteId?: string) => void;
  closeEditor: () => void;
  openPinModal: (noteId: string) => void;
  closePinModal: () => void;
  unlockNote: (noteId: string) => void;
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
  setGraphFilter: (nodeId: string | null) => void;
  updatePrefs: (patch: Partial<UserPreferences>) => void;
};

// ─── Combined Store ───────────────────────────────────────────────────────────

type AppStore = NotesSlice & ChatSlice & UISlice;

const NOTES_KEY = 'binlinpad_notes';

// ─── RAG helpers (fire-and-forget, never block the UI) ────────────────────────

async function upsertNoteEmbedding(note: Note): Promise<void> {
  try {
    await fetch('/api/search', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        noteId: note.id,
        title: note.title,
        content: note.content,
        subject: note.subject,
      }),
    });
  } catch {
    // Non-blocking — RAG fails silently if Qdrant/Voyage not configured
  }
}

async function deleteNoteEmbedding(noteId: string): Promise<void> {
  try {
    await fetch('/api/search', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ noteId }),
    });
  } catch {
    // Non-blocking
  }
}

async function searchSimilarNotes(query: string): Promise<SearchResult[]> {
  try {
    const res = await fetch('/api/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, topK: 5 }),
    });
    const data = await res.json();
    return data.results ?? [];
  } catch {
    return [];
  }
}

export const useStore = create<AppStore>((set, get) => ({
  // ── Notes ──────────────────────────────────────────────────────────────────
  notes: [],
  activeNoteId: null,
  searchQuery: '',
  filterSubject: null,
  filterMood: null,

  // Charge les notes depuis MongoDB (appelé au montage de la page Journal)
  loadNotes: async () => {
    try {
      const res = await fetch('/api/notes');
      if (!res.ok) return;
      const data = await res.json();
      const notes: Note[] = (data.notes ?? []).map((n: Record<string, unknown>) => ({
        ...(n as Note),
        id:        (n._id ?? n.id) as string,
        createdAt: new Date(n.createdAt as string),
        updatedAt: new Date(n.updatedAt as string),
      }));
      set({ notes });
    } catch {
      // Fallback localStorage si hors ligne
      const raw = getFromStorage<Record<string, unknown>[]>(NOTES_KEY, []);
      set({ notes: raw.map(reviveNote) });
    }
  },

  addNote: async (data) => {
    const res = await fetch('/api/notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    const note: Note = {
      ...(json.note as Note),
      id: (json.note._id ?? json.note.id) as string,
      createdAt: new Date(json.note.createdAt),
      updatedAt: new Date(json.note.updatedAt),
    };
    set((s) => ({ notes: [note, ...s.notes] }));
    upsertNoteEmbedding(note);
    return note;
  },

  updateNote: async (id, data) => {
    const res = await fetch(`/api/notes/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    const updated: Note = {
      ...(json.note as Note),
      id: (json.note._id ?? json.note.id) as string,
      createdAt: new Date(json.note.createdAt),
      updatedAt: new Date(json.note.updatedAt),
    };
    set((s) => ({ notes: s.notes.map((n) => n.id === id ? updated : n) }));
    upsertNoteEmbedding(updated);
  },

  deleteNote: async (id) => {
    await fetch(`/api/notes/${id}`, { method: 'DELETE' });
    set((s) => ({ notes: s.notes.filter((n) => n.id !== id) }));
    deleteNoteEmbedding(id);
  },

  pinNote: async (id) => {
    const note = get().notes.find((n) => n.id === id);
    if (!note) return;
    const isPinned = !note.isPinned;
    set((s) => ({ notes: s.notes.map((n) => n.id === id ? { ...n, isPinned } : n) }));
    await fetch(`/api/notes/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isPinned }),
    });
  },

  toggleFavorite: async (id) => {
    const note = get().notes.find((n) => n.id === id);
    if (!note) return;
    const isFavorite = !note.isFavorite;
    set((s) => ({ notes: s.notes.map((n) => n.id === id ? { ...n, isFavorite } : n) }));
    await fetch(`/api/notes/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isFavorite }),
    });
  },

  setActiveNote: (id) => set({ activeNoteId: id }),
  setSearchQuery: (q) => set({ searchQuery: q }),
  setFilterSubject: (s) => set({ filterSubject: s }),
  setFilterMood: (m) => set({ filterMood: m }),

  // ── Chat ───────────────────────────────────────────────────────────────────
  sessions: [],
  activeSessionId: null,
  isAILoading: false,

  createSession: () => {
    const session: ChatSession = {
      id: generateId(),
      title: 'New Conversation',
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    set((s) => ({ sessions: [session, ...s.sessions], activeSessionId: session.id }));
    return session;
  },

  sendMessage: async (content: string) => {
    const { sessions, activeSessionId } = get();
    let sessionId = activeSessionId;

    if (!sessionId) {
      const session = get().createSession();
      sessionId = session.id;
    }

    const userMsg: ChatMessage = {
      id: generateId(),
      role: 'user',
      content,
      timestamp: new Date(),
    };
    const loadingMsg: ChatMessage = {
      id: generateId(),
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isLoading: true,
    };

    set((s) => ({
      sessions: s.sessions.map((sess) =>
        sess.id === sessionId
          ? { ...sess, messages: [...sess.messages, userMsg, loadingMsg] }
          : sess
      ),
      isAILoading: true,
    }));

    try {
      const session = get().sessions.find((s) => s.id === sessionId);
      const history = (session?.messages ?? [])
        .filter((m) => !m.isLoading)
        .map((m) => ({ role: m.role, content: m.content }));

      // ── Step 1: semantic search in Qdrant for relevant notes ──────────────
      const ragResults: SearchResult[] = await searchSimilarNotes(content);

      // ── Step 2: call DeepSeek with retrieved context ──────────────────────
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: history,
          query: content,
          context: ragResults,   // injected into the system prompt
        }),
      });

      const data = await res.json();

      // Map Qdrant results → NoteSource for display in the UI
      const sources = ragResults.slice(0, 3).map((r) => ({
        noteId: r.payload.noteId,
        title: r.payload.title,
        excerpt: r.payload.content.slice(0, 100) + '…',
        score: r.score,
      }));

      const assistantMsg: ChatMessage = {
        id: loadingMsg.id,
        role: 'assistant',
        content: data.message ?? 'Sorry, I could not respond right now.',
        timestamp: new Date(),
        sources: sources.length > 0 ? sources : data.sources,
        isLoading: false,
      };

      set((s) => ({
        sessions: s.sessions.map((sess) =>
          sess.id === sessionId
            ? {
                ...sess,
                messages: sess.messages.map((m) => (m.id === loadingMsg.id ? assistantMsg : m)),
                title: sess.messages.length === 1 ? content.slice(0, 40) : sess.title,
              }
            : sess
        ),
        isAILoading: false,
      }));
    } catch {
      const errMsg: ChatMessage = {
        id: loadingMsg.id,
        role: 'assistant',
        content: 'Connection error. Please check your API configuration.',
        timestamp: new Date(),
        isLoading: false,
      };
      set((s) => ({
        sessions: s.sessions.map((sess) =>
          sess.id === sessionId
            ? { ...sess, messages: sess.messages.map((m) => (m.id === loadingMsg.id ? errMsg : m)) }
            : sess
        ),
        isAILoading: false,
      }));
    }
  },

  setActiveSession: (id) => set({ activeSessionId: id }),

  // ── UI ─────────────────────────────────────────────────────────────────────
  activeRoute: 'journal',
  sidebarCollapsed: false,
  editorOpen: false,
  editingNoteId: null,
  pinModalNoteId: null,
  unlockedNoteIds: [],
  toasts: [],
  graphFilterNodeId: null,
  prefs: getFromStorage<UserPreferences>(PREFS_KEY, DEFAULT_PREFS),

  setActiveRoute: (r) => set({ activeRoute: r }),
  setSidebarCollapsed: (v) => set({ sidebarCollapsed: v }),

  openEditor: (noteId) => set({ editorOpen: true, editingNoteId: noteId ?? null }),
  closeEditor: () => set({ editorOpen: false, editingNoteId: null }),

  openPinModal: (noteId) => set({ pinModalNoteId: noteId }),
  closePinModal: () => set({ pinModalNoteId: null }),

  unlockNote: (noteId) =>
    set((s) => ({
      unlockedNoteIds: s.unlockedNoteIds.includes(noteId)
        ? s.unlockedNoteIds
        : [...s.unlockedNoteIds, noteId],
    })),

  addToast: (toast) => {
    const id = generateId();
    set((s) => ({ toasts: [...s.toasts, { ...toast, id }] }));
    setTimeout(() => get().removeToast(id), toast.duration ?? 3500);
  },
  removeToast: (id) =>
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

  updatePrefs: (patch) =>
    set((s) => {
      const next = { ...s.prefs, ...patch };
      setToStorage(PREFS_KEY, next);
      return { prefs: next };
    }),

  setGraphFilter: (nodeId) => set({ graphFilterNodeId: nodeId }),
}));

// ─── Selectors ─────────────────────────────────────────────────────────────────
// Each selector reads only stable primitives so Zustand's reference-equality
// check never sees a new object on every render (avoids the infinite-loop
// getServerSnapshot warning with React 19 + useSyncExternalStore).

export const useFilteredNotes = (): Note[] => {
  const notes           = useStore((s) => s.notes);
  const filterSubject   = useStore((s) => s.filterSubject);
  const filterMood      = useStore((s) => s.filterMood);
  const graphFilterNode = useStore((s) => s.graphFilterNodeId);
  const searchQuery     = useStore((s) => s.searchQuery);

  return useMemo(() => {
    let result = notes;

    if (filterSubject)   result = result.filter((n) => n.subject === filterSubject);
    if (filterMood)      result = result.filter((n) => n.mood === filterMood);
    if (graphFilterNode) result = result.filter(
      (n) => n.subject === graphFilterNode || n.tags.some((t) => t.label === graphFilterNode)
    );
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (n) =>
          n.title.toLowerCase().includes(q) ||
          n.content.toLowerCase().includes(q) ||
          n.subject.toLowerCase().includes(q) ||
          n.tags.some((t) => t.label.toLowerCase().includes(q))
      );
    }

    return [...result].sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return b.updatedAt.getTime() - a.updatedAt.getTime();
    });
  }, [notes, filterSubject, filterMood, graphFilterNode, searchQuery]);
};

export const useActiveSession = () =>
  useStore((s) => s.sessions.find((sess) => sess.id === s.activeSessionId) ?? null);
