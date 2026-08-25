# 📚 BinlinPad — Compagnon d'études IA

> Application web PWA-ready destinée aux élèves du système scolaire ivoirien et aux étudiants du supérieur. Prise de notes, carte des connaissances interactive, tuteur IA personnel avec **mémoire longue durée** et **IA directement dans l'éditeur** — propulsé par DeepSeek + RAG triple (notes perso + curriculum ivoirien officiel + historique de conversations).

---

## ✨ Fonctionnalités

| Fonctionnalité | Description |
|---|---|
| 📝 **Journal de notes** | Grille masonry, cartes colorées, recherche, filtres par matière et humeur |
| ✏️ **Éditeur focus** | Mode plein-écran, sélecteur de matière (13), humeur (6), tags, verrouillage PIN, couleur de carte |
| 🔐 **Verrouillage PIN** | Notes protégées par code PIN 4 chiffres, haché en SHA-256 — jamais en clair |
| 🕸️ **Carte des connaissances** | Graphe D3.js force-directed : nœuds matières / notes, zoom, drag, panel de détail, stats |
| 🤖 **Tuteur IA (RAG triple)** | Chat contextuel : notes perso + curriculum ivoirien + **mémoire des conversations passées** |
| 🧠 **Mémoire longue durée** | Chaque échange est vectorisé — l'IA se souvient de conversations vieilles de plusieurs mois |
| 🔍 **Comparer au programme** | Compare une note avec le curriculum officiel : ✅ correct / ⚠️ incomplet / ❌ manquant |
| ✏️ **Correction de l'écrit** | Correction orthographique, grammaticale et stylistique directement dans l'éditeur |
| 📖 **Compléter la note** | L'IA génère les paragraphes manquants dans le style de l'élève — injection en un clic |
| 😶 **Journal d'humeur privé** | Associer une humeur à chaque note — purement local, jamais envoyé à l'IA |
| 🤝 **Bouton "Je veux en parler"** | Demande volontaire de contact avec un conseiller — aucune donnée sensible transmise |
| 👤 **Authentification** | Email/mot de passe · Google OAuth (NextAuth v5) |
| ☁️ **Stockage cloud** | Notes et sessions persistées dans MongoDB par utilisateur |
| ⚙️ **Paramètres** | Profil élève/étudiant, couleur d'accent, disposition des notes, PIN, export JSON |

---

## 🛠️ Stack technique

### Frontend
- **Next.js 16** (App Router, React 19, TypeScript)
- **Tailwind CSS v4** — design system warm Apple-esque
- **Framer Motion** — micro-animations sur toutes les interactions
- **Zustand** — état global (notes, chat, UI, préférences)
- **D3.js** — graphe de connaissances interactif
- **Lucide React** — icônes

### Backend
- **Next.js API Routes** — CRUD notes, auth, RAG pipeline
- **MongoDB Atlas** + **Mongoose** — utilisateurs, notes, sessions chat
- **NextAuth v5** — JWT, Credentials, Google OAuth

### Pipeline IA / RAG triple
```
Question utilisateur
       │
       ▼
Voyage AI (voyage-3)                → embedding de la question
       │
       ├──────────────────┬──────────────────────────────────┐
       ▼                  ▼                                   ▼
Qdrant binlinpad_notes   Qdrant binlinpad_notes          Qdrant cours_ivoiriens
[type=note, userId]      [type=chat, userId]             (programme officiel)
Notes personnelles       Échanges passés pertinents      Élèves uniquement
       │                  │                                   │
       └──────────────────┴───────────────────────────────────┘
                          ▼
              System prompt enrichi
              + 20 derniers messages (fenêtre glissante)
                          │
                          ▼
DeepSeek (deepseek-chat)            → réponse personnalisée en français
                          │
              ┌───────────┴───────────┐
              ▼                       ▼
         MongoDB                  Qdrant
      (ChatSession)           (échange indexé)
```
> Élèves : RAG triple (notes + historique + curriculum). Étudiants : notes + historique.

---

## 🚀 Démarrage rapide

### 1. Cloner et installer

```bash
git clone <repo>
cd cake
npm install
```

### 2. Variables d'environnement

Crée un fichier `.env.local` avec ces clés :

```env
# MongoDB Atlas (cloud.mongodb.com)
MONGODB_URI=mongodb+srv://user:password@cluster0.xxxxx.mongodb.net/binlinpad

# NextAuth (générer avec : openssl rand -base64 32)
NEXTAUTH_SECRET=ta_cle_secrete_32_chars
NEXTAUTH_URL=http://localhost:3000

# Google OAuth (console.cloud.google.com)
GOOGLE_CLIENT_ID=xxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxx

# DeepSeek (platform.deepseek.com)
DEEPSEEK_API_KEY=sk-...

# Voyage AI (dash.voyageai.com)
VOYAGE_API_KEY=pa-...

# Qdrant (cloud.qdrant.io)
QDRANT_URL=https://ton-cluster.qdrant.io
QDRANT_API_KEY=ta_cle_qdrant
QDRANT_COLLECTION=binlinpad_notes

# Collection curriculum officiel (partagée, données publiques)
QDRANT_CURRICULUM_COLLECTION=cours_ivoiriens

# Cron job (purge historique — générer avec : openssl rand -base64 32)
CRON_SECRET=ta_cle_cron_32_chars
```

### 3. Configurer Qdrant

Dans Qdrant Cloud, créer **une seule collection** pour les notes ET l'historique chat :

| Paramètre | Valeur |
|---|---|
| Collection name | `binlinpad_notes` |
| Dimension des vecteurs | `1024` |
| Distance | `Cosine` |

> La collection `cours_ivoiriens` (curriculum ivoirien, 100 448 points) doit être importée séparément.

### 4. Lancer

```bash
npm run dev
# → http://localhost:3000
```

L'app redirige automatiquement vers la page de connexion. Sans clés API, elle fonctionne en mode dégradé (notes locales, pas d'IA).

---

## 📁 Architecture du projet

```
src/
├── app/
│   ├── auth/connexion/         # Page connexion / inscription (Google, email)
│   ├── journal/                # Dashboard notes (bento masonry)
│   ├── graph/                  # Carte des connaissances D3
│   ├── tutor/                  # Tuteur IA (chat RAG)
│   ├── settings/               # Paramètres utilisateur
│   └── api/
│       ├── auth/[...nextauth]  # Handler NextAuth v5
│       ├── auth/inscription    # POST — créer un compte
│       ├── notes/              # GET liste / POST créer
│       ├── notes/[id]          # GET / PUT / DELETE (protégé par userId)
│       ├── notes/[id]/analyze  # POST — IA éditeur : compare / correct / complete
│       ├── chat/               # POST — DeepSeek avec RAG triple
│       ├── chat/sessions/      # GET / POST / DELETE — persistance sessions MongoDB
│       ├── chat/history/       # POST index / GET search / DELETE — historique Qdrant
│       ├── user/profile/       # GET / PATCH — userType + learningProfile
│       ├── cron/purge-history/ # GET — purge hebdo des échanges > 12 mois (Vercel Cron)
│       ├── embed/              # POST — Voyage AI embeddings
│       ├── search/             # POST search / PUT upsert / DELETE — Qdrant notes
│       └── wellbeing/
│           └── speak-request/  # POST — demande volontaire de contact conseiller
│
├── components/
│   ├── layout/                 # Shell, Sidebar (desktop), BottomNav (mobile)
│   ├── journal/                # NoteCard, NoteEditor, PinLock
│   ├── graph/                  # KnowledgeGraph (D3 force simulation)
│   ├── tutor/                  # ChatPanel (sessions, sources RAG, historique)
│   └── ui/                     # Button, Badge, Modal, Toast
│
├── lib/
│   ├── auth.ts                 # Config NextAuth (Google, Credentials)
│   ├── db.ts                   # Connexion Mongoose singleton
│   └── utils.ts                # cn(), dates, SUBJECT_CONFIG, MOOD_CONFIG
│
├── models/
│   ├── User.ts                 # Schéma MongoDB (userType, learningProfile)
│   ├── Note.ts                 # Schéma MongoDB note (indexé par userId)
│   └── ChatSession.ts          # Schéma MongoDB sessions chat persistantes
│
├── store/index.ts              # Zustand (notes, chat, userId, UI, préférences)
├── types/index.ts              # Types TypeScript globaux
└── proxy.ts                    # Middleware Next.js (protection des routes)
```

---

## 🔐 Sécurité & vie privée

- Les clés API (DeepSeek, Voyage, Qdrant) restent **exclusivement côté serveur**
- Les mots de passe sont hachés avec **bcrypt** (12 rounds)
- Les codes PIN sont hachés en **SHA-256** localement — jamais transmis
- Chaque requête Qdrant filtre **obligatoirement par `userId`** — isolation totale
- **L'humeur n'est jamais envoyée à DeepSeek** — journal 100 % privé
- DeepSeek reçoit uniquement : notes pertinentes à la question + type de profil + historique de session

---

## 🌐 Déploiement (Vercel)

```bash
npx vercel
```

Variables d'env à configurer dans le dashboard Vercel :
```
MONGODB_URI, NEXTAUTH_SECRET, NEXTAUTH_URL,
GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET,
DEEPSEEK_API_KEY, VOYAGE_API_KEY,
QDRANT_URL, QDRANT_API_KEY, QDRANT_COLLECTION,
QDRANT_CURRICULUM_COLLECTION, CRON_SECRET
```

**Cron job Vercel** (configuré dans `vercel.json`) :
- Purge automatique des échanges chat > 12 mois — tous les dimanches à 3h

**Redirect URI Google à mettre à jour :**
- `https://ton-domaine.vercel.app/api/auth/callback/google`

---

## 📄 Licence

MIT
