# 🎂 Cake — Compagnon d'études IA

> Application web PWA-ready destinée aux étudiants francophones. Capture de notes, carte des connaissances interactive, et tuteur IA personnel propulsé par DeepSeek + RAG (Voyage AI + Qdrant).

---

## ✨ Fonctionnalités

| Fonctionnalité | Description |
|---|---|
| 📝 **Journal de notes** | Grille masonry, cartes colorées (ocre / sombre / défaut), recherche, filtres par matière et humeur |
| ✏️ **Éditeur focus** | Mode plein-écran, sélecteur de matière (13), humeur (6), tags, verrouillage PIN, couleur de carte |
| 🔐 **Verrouillage PIN** | Notes protégées par code PIN 4 chiffres, haché en SHA-256 — jamais en clair |
| 🕸️ **Carte des connaissances** | Graphe D3.js force-directed : nœuds matières / concepts / notes, zoom, drag, clic pour filtrer |
| 🤖 **Tuteur IA (RAG)** | Chat contextuel : Voyage AI → Qdrant (multitenancy par userId) → DeepSeek — réponses en français |
| 👤 **Authentification** | Email/mot de passe · Google OAuth · Apple OAuth (NextAuth v5) |
| ☁️ **Stockage cloud** | Notes persistées dans MongoDB Atlas par utilisateur |
| ⚙️ **Paramètres** | Profil, couleur d'accent, disposition des notes, changement de PIN, export JSON |

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
- **MongoDB Atlas** + **Mongoose** — base de données utilisateurs et notes
- **NextAuth v5** — JWT, Credentials, Google, Apple

### Pipeline IA / RAG
```
Question utilisateur
       │
       ▼
Voyage AI (voyage-3)          → embedding de la question
       │
       ▼
Qdrant (multitenancy userId)  → top-5 passages similaires
       │
       ▼
DeepSeek (deepseek-chat)      → réponse contextualisée en français
```

---

## 🚀 Démarrage rapide

### 1. Cloner et installer

```bash
git clone <repo>
cd cake-1
npm install
```

### 2. Variables d'environnement

```bash
cp .env.local.example .env.local
```

Remplis `.env.local` avec tes clés :

```env
# MongoDB Atlas (gratuit sur cloud.mongodb.com)
MONGODB_URI=mongodb+srv://user:password@cluster0.xxxxx.mongodb.net/

# NextAuth (générer avec : openssl rand -base64 32)
AUTH_SECRET=ta_cle_secrete_32_chars
AUTH_URL=http://localhost:3000

# Google OAuth (console.cloud.google.com)
GOOGLE_CLIENT_ID=xxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxx

# Apple OAuth (developer.apple.com — optionnel, HTTPS requis)
APPLE_ID=com.ton.app
APPLE_SECRET=-----BEGIN PRIVATE KEY-----\n...

# DeepSeek (platform.deepseek.com)
DEEPSEEK_API_KEY=sk-...

# Voyage AI (dash.voyageai.com)
VOYAGE_API_KEY=pa-...

# Qdrant (cloud.qdrant.io)
QDRANT_URL=https://ton-cluster.qdrant.io
QDRANT_API_KEY=ta_cle_qdrant
QDRANT_COLLECTION=cake_notes
```

### 3. Configurer Qdrant

Dans Qdrant Cloud, créer la collection avec ces paramètres :

| Paramètre | Valeur |
|---|---|
| Collection name | `cake_notes` |
| Use case | **Multitenancy** |
| Tenant field | `userId` |
| Search type | **Simple Single embedding** |

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
│   ├── auth/connexion/         # Page connexion / inscription (Google, Apple, email)
│   ├── journal/                # Dashboard notes (bento masonry)
│   ├── graph/                  # Carte des connaissances D3
│   ├── tutor/                  # Tuteur IA (chat RAG)
│   ├── settings/               # Paramètres utilisateur
│   └── api/
│       ├── auth/[...nextauth]  # Handler NextAuth v5
│       ├── auth/inscription    # POST — créer un compte
│       ├── notes/              # GET liste / POST créer
│       ├── notes/[id]          # GET / PUT / DELETE (protégé par userId)
│       ├── chat/               # POST — DeepSeek avec contexte RAG
│       ├── embed/              # POST — Voyage AI embeddings
│       └── search/             # POST search / PUT upsert / DELETE — Qdrant
│
├── components/
│   ├── layout/                 # Shell, Sidebar (desktop), BottomNav (mobile)
│   ├── journal/                # NoteCard, NoteEditor, PinLock
│   ├── graph/                  # KnowledgeGraph (D3 force simulation)
│   ├── tutor/                  # ChatPanel (sessions, sources RAG)
│   └── ui/                     # Button, Badge, Modal, Toast
│
├── lib/
│   ├── auth.ts                 # Config NextAuth (Google, Apple, Credentials)
│   ├── db.ts                   # Connexion Mongoose singleton
│   └── utils.ts                # cn(), dates, SUBJECT_CONFIG, MOOD_CONFIG
│
├── models/
│   ├── User.ts                 # Schéma MongoDB utilisateur
│   └── Note.ts                 # Schéma MongoDB note (indexé par userId)
│
├── store/index.ts              # Zustand (notes async, chat, UI, préférences)
├── types/index.ts              # Types TypeScript globaux
└── proxy.ts                    # Protection des routes (Next.js 16)
```

---

## 🔐 Sécurité

- Les clés API (DeepSeek, Voyage, Qdrant) restent **exclusivement côté serveur** — jamais exposées au client
- Les mots de passe sont hachés avec **bcrypt** (12 rounds)
- Les codes PIN sont hachés en **SHA-256** localement — jamais stockés en clair
- Chaque requête Qdrant filtre **obligatoirement par `userId`** — isolation totale entre utilisateurs
- Les routes API vérifient la session NextAuth avant tout accès aux données

---

## 🌐 Déploiement (Vercel)

```bash
# Déployer
npx vercel

# Variables d'env à configurer dans le dashboard Vercel :
# MONGODB_URI, AUTH_SECRET, AUTH_URL, GOOGLE_CLIENT_ID,
# GOOGLE_CLIENT_SECRET, DEEPSEEK_API_KEY, VOYAGE_API_KEY,
# QDRANT_URL, QDRANT_API_KEY, QDRANT_COLLECTION
```

**Redirect URIs à mettre à jour après déploiement :**
- Google : `https://ton-domaine.vercel.app/api/auth/callback/google`
- Apple : `https://ton-domaine.vercel.app/api/auth/callback/apple`

---

## 📄 Licence

MIT
