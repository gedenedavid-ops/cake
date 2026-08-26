# BinlinPad — AI Study Companion for West African Students

> **Hack for Humanity 2026 submission** · Mental Health Track · Best Use of AI/ML · Responsible AI

BinlinPad is a privacy-first AI study companion built for high school and university students in Côte d'Ivoire and West Africa. It combines intelligent note-taking, a private mood journal, an interactive knowledge graph, and a RAG-powered AI tutor — all designed around a single principle: **the student stays in control of their data**.

---

## The Problem

Students in West Africa face a unique combination of challenges:

- **Academic pressure** with limited access to quality tutoring resources
- **Mental health stigma** — anxiety, burnout, and confusion go unspoken
- **No localized AI tools** — existing tools ignore the Ivorian national curriculum
- **Privacy concerns** — students are reluctant to share personal struggles with cloud services

BinlinPad addresses all four with a single, cohesive tool.

---

## What It Does

| Feature | Description |
|---|---|
| 📝 **Smart Note Journal** | Masonry/grid/list layouts, subject tags (13 Ivorian subjects), color themes, full-text search |
| 😶 **Private Mood Journal** | Attach an emotion to every note — 28-day history, streak tracking, trend insights — **never sent to AI** |
| 🔐 **PIN Lock** | Protect sensitive notes with a 4-digit PIN hashed locally in SHA-256 — never stored in plaintext |
| 🕸️ **Knowledge Graph** | D3.js force-directed graph: subjects → notes → concepts, interactive zoom/drag, mastery indicators |
| 🤖 **Triple-RAG AI Tutor** | Chat grounded in personal notes + past conversations + Ivorian national curriculum |
| 🧠 **Long-Term Memory** | Every conversation is vectorized — the AI remembers exchanges from months ago |
| ✏️ **In-Editor AI** | Compare note to curriculum · Correct writing · Complete missing paragraphs |
| 🤝 **"I want to talk" button** | One-tap voluntary request to speak with a counselor — zero personal data transmitted |
| 📱 **PWA-Ready** | Installable on mobile, works offline for note-taking |

---

## Mental Health Design Philosophy

BinlinPad treats emotional data with the highest respect:

1. **The mood journal is 100% local** — emotions are stored only on-device, never sent to any AI model or external server
2. **No passive detection** — BinlinPad never infers or diagnoses emotional states. The student explicitly chooses to log their mood
3. **No thresholds, no alerts** — the dashboard is purely descriptive (charts, counts, trends). The app never says "you seem anxious"
4. **Human support is always visible** — the SOS Amitié CI hotline (27 22 22 63) and the "I want to talk" button are permanently accessible, never triggered by the app
5. **AI is opt-out** — students can disable all AI features in Settings for a fully offline experience

---

## Responsible AI Architecture

```
User question
      │
      ▼
Voyage AI (voyage-3)          → 1024-dim embedding of the question
      │
      ├─────────────────────┬──────────────────────────────────┐
      ▼                     ▼                                   ▼
Qdrant [type=note]     Qdrant [type=chat]              Qdrant cours_ivoiriens
userId-scoped          userId-scoped                   (public — students only)
Personal notes         Past conversations              Official Ivorian curriculum
      │                     │                                   │
      └─────────────────────┴───────────────────────────────────┘
                            ▼
              Enriched system prompt
              + last 20 messages (sliding window)
                            │
                            ▼
DeepSeek (deepseek-chat)    → personalized French response
                            │
              ┌─────────────┴─────────────┐
              ▼                           ▼
         MongoDB                      Qdrant
      (ChatSession)               (exchange indexed)
```

### Privacy guarantees

| Guarantee | Implementation |
|---|---|
| **API keys server-side only** | DeepSeek, Voyage AI, Qdrant keys never reach the client |
| **Passwords hashed with bcrypt** | 12 rounds — plaintext never stored |
| **PIN hashed locally** | SHA-256 in the browser — hash stored in localStorage, never transmitted |
| **Mood data never leaves device** | `mood` field filtered out before any API call |
| **Strict userId isolation** | Every Qdrant query includes a mandatory `userId` filter — users can never access each other's data |
| **AI sends only excerpts** | The RAG pipeline sends the 5 most relevant note excerpts — never the full notebook |
| **AI is disableable** | Toggle in Settings → full offline mode |
| **Auto-purge** | Chat history vectors older than 12 months are automatically deleted (weekly cron) |
| **Security headers** | `X-Content-Type-Options`, `X-Frame-Options: DENY`, `Referrer-Policy` on all routes |

---

## Tech Stack

### Frontend
- **Next.js 16** · App Router · React 19 · TypeScript
- **Tailwind CSS v4** — warm minimalist design system
- **Framer Motion** — micro-animations on every interaction
- **Zustand** — global state (notes, chat, UI, preferences)
- **D3.js** — interactive knowledge graph with force simulation

### Backend
- **Next.js API Routes** — notes CRUD, auth, RAG pipeline
- **MongoDB Atlas** + **Mongoose** — users, notes, chat sessions
- **NextAuth v5** — JWT, Credentials, Google OAuth

### AI / Vector
- **DeepSeek** (`deepseek-chat`) — LLM for tutoring
- **Voyage AI** (`voyage-3`) — 1024-dim embeddings
- **Qdrant Cloud** — vector store (notes + chat history + Ivorian curriculum)

---

## Project Structure

```
src/
├── app/
│   ├── auth/connexion/         # Sign in / sign up page
│   ├── journal/                # Note dashboard (masonry/grid/list)
│   ├── graph/                  # D3 knowledge graph
│   ├── tutor/                  # AI chat with RAG
│   ├── settings/               # User preferences
│   └── api/
│       ├── auth/[...nextauth]  # NextAuth v5 handler
│       ├── auth/inscription    # POST — create account (bcrypt)
│       ├── notes/              # GET / POST notes
│       ├── notes/[id]          # GET / PUT / DELETE (userId-scoped)
│       ├── notes/[id]/analyze  # POST — AI: compare / correct / complete
│       ├── chat/               # POST — DeepSeek + triple RAG
│       ├── chat/sessions/      # Chat session persistence
│       ├── chat/history/       # Qdrant vector history
│       ├── user/profile/       # GET / PATCH userType + learningProfile
│       ├── embed/              # POST — Voyage AI embeddings
│       ├── search/             # POST search / PUT upsert / DELETE
│       ├── cron/purge-history/ # Weekly auto-purge (> 12 months)
│       └── wellbeing/
│           └── speak-request/  # POST — voluntary counselor contact request
│
├── components/
│   ├── layout/                 # Shell, Sidebar (desktop), BottomNav (mobile)
│   ├── journal/                # NoteCard, NoteEditor, PinLock, MoodDashboard
│   ├── graph/                  # KnowledgeGraph (D3 force simulation)
│   ├── tutor/                  # ChatPanel (sessions, RAG sources, history)
│   └── ui/                     # Button, Badge, Modal, Toast
│
├── lib/
│   ├── auth.ts                 # NextAuth config (Google + Credentials)
│   ├── db.ts                   # Mongoose singleton connection
│   └── utils.ts                # cn(), dates, SUBJECT_CONFIG, MOOD_CONFIG
│
├── models/
│   ├── User.ts                 # MongoDB schema (userType, learningProfile)
│   ├── Note.ts                 # MongoDB schema (userId-indexed)
│   └── ChatSession.ts          # Persistent chat sessions
│
├── store/index.ts              # Zustand store
├── types/index.ts              # Global TypeScript types
└── proxy.ts                    # Next.js middleware (route protection)
```

---

## Getting Started

### 1. Clone & install

```bash
git clone https://github.com/your-username/binlinpad
cd binlinpad
npm install
```

### 2. Environment variables

Create `.env.local`:

```env
# MongoDB Atlas
MONGODB_URI=mongodb+srv://user:password@cluster0.xxxxx.mongodb.net/binlinpad

# NextAuth
NEXTAUTH_SECRET=your_32_char_secret   # openssl rand -base64 32
NEXTAUTH_URL=http://localhost:3000

# Google OAuth (optional — currently shows "coming soon" in UI)
GOOGLE_CLIENT_ID=xxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxx

# DeepSeek
DEEPSEEK_API_KEY=sk-...

# Voyage AI
VOYAGE_API_KEY=pa-...

# Qdrant Cloud
QDRANT_URL=https://your-cluster.qdrant.io
QDRANT_API_KEY=your_qdrant_key
QDRANT_COLLECTION=binlinpad_notes
QDRANT_CURRICULUM_COLLECTION=cours_ivoiriens

# Cron job secret
CRON_SECRET=your_32_char_cron_secret
```

### 3. Create Qdrant collection

In Qdrant Cloud, create **one collection** for notes + chat history:

| Parameter | Value |
|---|---|
| Collection name | `binlinpad_notes` |
| Vector dimension | `1024` |
| Distance | `Cosine` |

> The `cours_ivoiriens` collection (100,448 points — Ivorian national curriculum) must be imported separately.

### 4. Run

```bash
npm run dev
# → http://localhost:3000
```

The app works **without API keys** in degraded mode: local notes, no AI features.

---

## Demo Walkthrough

1. **Create an account** (email/password) and select your profile: 🎒 Élève or 🎓 Étudiant
2. **Write a note** — pick a subject, add a mood emoji, tag it
3. **Mood Dashboard** — after 2+ mood notes, the 28-day mood chart appears on the journal page
4. **Knowledge Graph** — navigate to "Carte" to see your notes visualized as a force graph
5. **AI Tutor** — ask "Interroge-moi sur mes dernières notes" and watch the RAG pull your own notes as context
6. **In-Editor AI** — open a note, click "Comparer au programme" to see how it aligns with the Ivorian curriculum
7. **PIN Lock** — lock a sensitive note with a 4-digit PIN; it shows as locked to anyone without the code
8. **Settings** — disable AI entirely for offline mode; export all notes as JSON

---

## Hackathon Tracks

| Track | Why BinlinPad qualifies |
|---|---|
| **Best Mental Health Tool** | Private mood journal with 28-day history, streak tracking, insights + permanent access to mental health resources |
| **Best Use of AI/ML** | Triple-RAG pipeline (personal notes + conversation memory + national curriculum), in-editor AI, long-term memory via Qdrant |
| **Responsible AI** | Mood data never sent to AI, userId isolation, AI disableable, bcrypt + SHA-256, auto-purge, strict server-side key handling |
| **Best Design** | Apple-inspired minimal UI, Framer Motion animations, mobile-first PWA, animated mood graph |
| **Best Innovation & Creativity** | First AI tutor grounded in the Ivorian national curriculum + student's own notes — not a generic chatbot |

---

## Deployment on Render

BinlinPad is configured to deploy on [Render](https://render.com) with a single `render.yaml` at the root.

### Steps

**1. Push to GitHub**
```bash
git add .
git commit -m "feat: add Render deployment config"
git push origin main
```

**2. Create a new Blueprint on Render**
- Go to [dashboard.render.com](https://dashboard.render.com) → **New** → **Blueprint**
- Connect your GitHub repo — Render auto-detects `render.yaml`

**3. Set environment variables**

In the Render dashboard, add these secret variables for the `binlinpad` service:

| Variable | Where to get it |
|---|---|
| `NEXTAUTH_URL` | Your Render URL e.g. `https://binlinpad.onrender.com` |
| `NEXTAUTH_SECRET` | `openssl rand -base64 32` |
| `MONGODB_URI` | [cloud.mongodb.com](https://cloud.mongodb.com) |
| `DEEPSEEK_API_KEY` | [platform.deepseek.com](https://platform.deepseek.com) |
| `VOYAGE_API_KEY` | [dash.voyageai.com](https://dash.voyageai.com) |
| `QDRANT_URL` | [cloud.qdrant.io](https://cloud.qdrant.io) |
| `QDRANT_API_KEY` | Qdrant Cloud dashboard |
| `CRON_SECRET` | `openssl rand -base64 32` |

For the cron service, also set:

| Variable | Value |
|---|---|
| `APP_URL` | Same as `NEXTAUTH_URL` |
| `CRON_SECRET` | Same secret as above |

**4. Update Google OAuth redirect URI**

In [Google Cloud Console](https://console.cloud.google.com) → APIs & Services → Credentials:
```
https://binlinpad.onrender.com/api/auth/callback/google
```

**5. Deploy**

Click **Apply** in Render — the build runs `npm install && npm run build` and starts with `npm start`.

> **Free tier note:** Render free services spin down after 15 minutes of inactivity. For a hackathon demo, use the `starter` plan ($7/mo) to avoid cold starts.

---

## License

MIT
