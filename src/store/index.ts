import { create } from 'zustand';
import { useMemo } from 'react';
import type { Note, NoteFormData, ChatMessage, ChatSession, NavRoute, Toast, Subject, Mood, SearchResult, UserType, LearningProfile } from '@/types';
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
  sessionsLoaded: boolean;
  createSession: () => ChatSession;
  sendMessage: (content: string) => Promise<void>;
  setActiveSession: (id: string | null) => void;
  loadSessions: () => Promise<void>;
  deleteSession: (id: string) => Promise<void>;
};

// ─── User Profile Slice ───────────────────────────────────────────────────────

type UserProfileSlice = {
  userType: UserType;
  learningProfile: LearningProfile;
  profileLoaded: boolean;
  loadUserProfile: () => Promise<void>;
  setUserType: (t: UserType) => Promise<void>;
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

type AppStore = NotesSlice & ChatSlice & UserProfileSlice & UISlice;

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
  sessionsLoaded: false,

  // Charge les sessions depuis MongoDB (appelé au montage de la page Tutor)
  loadSessions: async () => {
    try {
      const res = await fetch('/api/chat/sessions');
      if (!res.ok) return;
      const data = await res.json();
      const sessions: ChatSession[] = (data.sessions ?? []).map((s: Record<string, unknown>) => ({
        ...(s as ChatSession),
        id: (s._id ?? s.id) as string,
        createdAt: new Date(s.createdAt as string),
        updatedAt: new Date(s.updatedAt as string),
        messages: ((s.messages ?? []) as Record<string, unknown>[]).map((m) => ({
          ...(m as ChatMessage),
          timestamp: new Date(m.timestamp as string),
        })),
      }));
      set({ sessions, sessionsLoaded: true, activeSessionId: sessions[0]?.id ?? null });
    } catch {
      set({ sessionsLoaded: true });
    }
  },

  createSession: () => {
    const session: ChatSession = {
      id: generateId(),
      title: 'Nouvelle conversation',
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    set((s) => ({ sessions: [session, ...s.sessions], activeSessionId: session.id }));
    // Persister en base (fire-and-forget)
    fetch('/api/chat/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: session.title, messages: [] }),
    }).then(async (res) => {
      if (!res.ok) return;
      const data = await res.json();
      const dbId = data.session?._id ?? data.session?.id;
      if (dbId && dbId !== session.id) {
        // Remplacer l'id temporaire par l'id MongoDB
        set((s) => ({
          sessions: s.sessions.map((se) =>
            se.id === session.id ? { ...se, id: dbId } : se
          ),
          activeSessionId: s.activeSessionId === session.id ? dbId : s.activeSessionId,
        }));
      }
    }).catch(() => {/* silencieux */});
    return session;
  },

  deleteSession: async (id: string) => {
    set((s) => ({
      sessions: s.sessions.filter((se) => se.id !== id),
      activeSessionId: s.activeSessionId === id
        ? (s.sessions.find((se) => se.id !== id)?.id ?? null)
        : s.activeSessionId,
    }));
    try {
      await fetch('/api/chat/sessions', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: id }),
      });
    } catch {/* silencieux */}
  },

  sendMessage: async (content: string) => {
    const { activeSessionId } = get();
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
      let ragResults: SearchResult[] = await searchSimilarNotes(content);

      // ── Fallback : scoring local par pertinence si RAG non configuré ──────
      if (ragResults.length === 0 && get().notes.length > 0) {
        const query = content.toLowerCase();
        const words = query.split(/\s+/).filter((w) => w.length > 2);
        const scored = get().notes.map((n) => {
          const haystack = `${n.title} ${n.content} ${n.subject} ${n.tags.map((t) => t.label).join(' ')}`.toLowerCase();
          let score = 0;
          for (const w of words) {
            const re = new RegExp(w, 'g');
            const matches = (haystack.match(re) ?? []).length;
            score += matches;
            if (n.title.toLowerCase().includes(w)) score += 3;
          }
          const daysSince = (Date.now() - n.updatedAt.getTime()) / 86_400_000;
          if (daysSince < 14) score += (14 - daysSince) / 14;
          return { note: n, score };
        });
        ragResults = scored
          .filter((s) => s.score > 0)
          .sort((a, b) => b.score - a.score)
          .slice(0, 5)
          .map((s) => ({
            id: s.note.id,
            score: s.score,
            payload: {
              noteId: s.note.id,
              title: s.note.title,
              content: s.note.content.slice(0, 400),
              subject: s.note.subject,
            },
          }));
        if (ragResults.length === 0) {
          ragResults = [...get().notes]
            .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
            .slice(0, 5)
            .map((n) => ({
              id: n.id,
              score: 0,
              payload: { noteId: n.id, title: n.title, content: n.content.slice(0, 400), subject: n.subject },
            }));
        }
      }

      // ── Step 2: call DeepSeek avec contexte + profil utilisateur ─────────
      const { userType, learningProfile } = get();
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: history,
          query: content,
          context: ragResults,
          userType,
          learningProfile,
        }),
      });

      const data = await res.json();

      const sources = ragResults.slice(0, 3).map((r) => ({
        noteId: r.payload.noteId,
        title: r.payload.title,
        excerpt: r.payload.content.slice(0, 100) + '…',
        score: r.score,
      }));

      const assistantMsg: ChatMessage = {
        id: loadingMsg.id,
        role: 'assistant',
        content: data.message ?? 'Désolé, je n\'ai pas pu répondre.',
        timestamp: new Date(),
        sources: sources.length > 0 ? sources : data.sources,
        isLoading: false,
      };

      const updatedSession = get().sessions.find((s) => s.id === sessionId);
      const newMessages = (updatedSession?.messages ?? []).map((m) =>
        m.id === loadingMsg.id ? assistantMsg : m
      );
      const newTitle = (updatedSession?.messages.length === 1)
        ? content.slice(0, 40)
        : updatedSession?.title ?? 'Nouvelle conversation';

      set((s) => ({
        sessions: s.sessions.map((sess) =>
          sess.id === sessionId
            ? { ...sess, messages: newMessages, title: newTitle, updatedAt: new Date() }
            : sess
        ),
        isAILoading: false,
      }));

      // ── Sauvegarde persistante (fire-and-forget) ──────────────────────────
      // N'envoyer sessionId que si c'est déjà un vrai id MongoDB (24 hex chars)
      const isMongoId = typeof sessionId === 'string' && /^[0-9a-f]{24}$/i.test(sessionId);
      fetch('/api/chat/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(isMongoId ? { sessionId } : {}),
          title: newTitle,
          messages: newMessages,
        }),
      }).then(async (res) => {
        if (!res.ok) return;
        const data = await res.json();
        // Si on vient de créer une session (id temporaire → id MongoDB), mettre à jour le store
        const dbId = data.session?._id ?? data.session?.id;
        if (!isMongoId && dbId) {
          set((s) => ({
            sessions: s.sessions.map((se) =>
              se.id === sessionId ? { ...se, id: dbId } : se
            ),
            activeSessionId: s.activeSessionId === sessionId ? dbId : s.activeSessionId,
          }));
        }
      }).catch(() => {/* silencieux */});

    } catch {
      const errMsg: ChatMessage = {
        id: loadingMsg.id,
        role: 'assistant',
        content: 'Erreur de connexion. Vérifie ta configuration API.',
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

  // ── User Profile ────────────────────────────────────────────────────────────
  userType: 'eleve',
  learningProfile: { weakSubjects: [], studiedTopics: [], totalSessions: 0 },
  profileLoaded: false,

  loadUserProfile: async () => {
    try {
      const res = await fetch('/api/user/profile');
      if (!res.ok) return;
      const data = await res.json();
      set({
        userType: data.user?.userType ?? 'eleve',
        learningProfile: data.user?.learningProfile ?? { weakSubjects: [], studiedTopics: [], totalSessions: 0 },
        profileLoaded: true,
      });
    } catch {
      set({ profileLoaded: true });
    }
  },

  setUserType: async (t: UserType) => {
    set({ userType: t });
    try {
      await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userType: t }),
      });
    } catch {/* silencieux */}
  },

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
