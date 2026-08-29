# BinlinPad — Documentation technique & données personnelles

> Version : 0.1.0 — Dernière mise à jour : juin 2025  
> Ce document sert de base à la rédaction des Conditions Générales d'Utilisation (CGU) et de la Politique de Confidentialité.

---

## 1. Présentation de l'application

**BinlinPad** est une application web d'aide aux études destinée aux élèves du système scolaire ivoirien (primaire, collège, lycée) et aux étudiants du supérieur. Elle permet de :

- Prendre et organiser des notes par matière
- Visualiser ses connaissances sous forme de graphe interactif
- Interroger un tuteur IA (BinlinPad) basé sur ses propres notes, avec **mémoire longue durée**
- **Analyser, corriger et compléter ses notes directement dans l'éditeur grâce à l'IA**
- Tenir un journal d'humeur privé lié aux sessions d'étude
- Demander volontairement à parler à un conseiller

L'application est accessible via navigateur web (progressive web app). Il n'existe pas d'application mobile native à ce stade.

---

## 2. Stack technique

| Couche | Technologie | Version | Rôle |
|--------|-------------|---------|------|
| Framework web | Next.js (App Router) | 16.3.1 | Rendu SSR/CSR + API Routes |
| Langage | TypeScript | ^5 | Typage statique |
| UI | React | 19.2.8 | Composants interface |
| State management | Zustand | ^5.0.15 | État global côté client |
| Base de données | MongoDB via Mongoose | ^9.9.3 | Persistance données utilisateur |
| Authentification | NextAuth v5 (beta) | ^5.0.0-beta.32 | Sessions JWT + OAuth Google |
| Chiffrement mots de passe | bcryptjs | ^3.0.3 | Hash côté serveur uniquement |
| IA tuteur | DeepSeek API (`deepseek-chat`) | externe | Génération des réponses |
| Embeddings | Voyage AI (`voyage-3`) | externe | Vectorisation notes + questions + historique |
| Base vectorielle | Qdrant | externe | Recherche sémantique (RAG triple) |
| Animations | Framer Motion | ^13.1.0 | Transitions UI |
| Graphe | D3 + react-force-graph-2d | ^7.9.0 | Visualisation réseau de connaissances |
| Analytics | @vercel/analytics | ^2.0.1 | Métriques de navigation anonymes |
| Hébergement | Vercel (recommandé) | — | Déploiement Next.js + Cron jobs |

---

## 3. Fonctionnalités détaillées

### 3.1 Authentification (`/auth/connexion`)

**Ce que ça fait :**
- Création de compte avec email + mot de passe
- Connexion via Google OAuth
- Sélection du profil à l'inscription : **élève** ou **étudiant**
- Sessions JWT (JSON Web Token) stockées côté client

**Données collectées à l'inscription :**
| Donnée | Obligatoire | Stockage | Envoyée à des tiers |
|--------|-------------|----------|---------------------|
| Nom affiché | Oui | MongoDB (User) | Non |
| Adresse email | Oui | MongoDB (User) | Google (si OAuth) |
| Mot de passe (hashé bcrypt) | Oui (si credentials) | MongoDB — hash uniquement, jamais le mot de passe en clair | Non |
| Avatar Google | Non | MongoDB (User) | Non |
| Type de profil (élève/étudiant) | Oui | MongoDB (User) | Non |

**Durée de conservation :** Jusqu'à suppression du compte par l'utilisateur.

---

### 3.2 Notes (`/journal`, `/api/notes`)

**Ce que ça fait :**
- Création, modification, suppression de notes de cours
- Organisation par matière, tags, couleur, favori, épingle
- Verrouillage d'une note par code PIN (hash SHA-256 stocké localement)
- Indicateur d'humeur optionnel sur chaque note (voir §3.5)
- Comptage automatique des mots et estimation du temps de lecture

**Données stockées par note :**
| Champ | Type | Usage |
|-------|------|-------|
| `userId` | Référence | Associe la note à son propriétaire |
| `title` | Texte | Titre de la note |
| `content` | Texte long | Contenu rédigé par l'élève |
| `subject` | Enum (13 matières + "Autre") | Matière scolaire |
| `tags` | Tableau | Mots-clés libres |
| `mood` | Enum optionnel | Humeur au moment de la prise de note (voir §3.5) |
| `attachments` | Tableau | Liens vers pièces jointes (image, PDF, lien) |
| `isLocked`, `isPinned`, `isFavorite` | Booléens | Préférences d'affichage |
| `wordCount`, `readTime` | Nombres | Calculés automatiquement, jamais envoyés à l'IA |
| `createdAt`, `updatedAt` | Dates | Horodatage automatique |

**Partage avec des tiers :**
- Les notes (titre + contenu + matière) sont envoyées à **DeepSeek** et **Voyage AI** uniquement lorsque l'utilisateur pose une question au tuteur BinlinPad — et uniquement les notes pertinentes à cette question (recherche sémantique).
- Les notes ne sont **jamais** envoyées automatiquement, en masse, ou sans action explicite de l'utilisateur.

---

### 3.3 Tuteur IA BinlinPad avec mémoire longue durée (`/tutor`, `/api/chat`)

**Ce que ça fait :**
- Interface de conversation avec un tuteur IA
- À chaque question, triple recherche sémantique en parallèle :
  1. Notes personnelles pertinentes (Qdrant `binlinpad_notes`, `type=note`)
  2. Échanges passés pertinents sur toute l'histoire de l'élève (Qdrant `binlinpad_notes`, `type=chat`)
  3. Extraits du programme officiel ivoirien — élèves uniquement (Qdrant `cours_ivoiriens`)
- Fenêtre glissante sur les 20 derniers messages de la session active
- Génération automatique d'un résumé de session après plus de 12 échanges
- Chaque échange (question + réponse) est vectorisé et indexé immédiatement après la réponse

#### Conscience temporelle

L'IA sait **quand** elle parle à l'apprenant et depuis combien de temps il était absent :

| Situation | Comportement de l'IA |
|-----------|----------------------|
| Même journée | Accueil neutre, continuité normale |
| Absence 1–6 jours | Mentionne le délai, reprend naturellement |
| Absence 1–4 semaines | Accueil chaleureux + proposition d'un point de révision |
| Absence 1+ mois | Accueil chaleureux + demande comment il va + proposition de reprendre depuis les notes |

La date/heure courante est toujours injectée dans le système prompt. La date de dernière visite est stockée dans `localStorage` (`binlinpad_last_seen`) côté client et transmise à l'API à chaque message.

#### Minuteur d'exercice

Quand l'IA donne un exercice avec un temps imparti, un chronomètre interactif s'affiche directement dans la bulle de réponse :

- L'IA émet un marqueur interne `%%TIMER:NNN%%` (NNN = secondes) à la fin de sa réponse — ce marqueur est retiré du texte affiché
- Un arc SVG animé décompte le temps en temps réel : couleur **verte** (>50 %), **orange** (20–50 %), **rouge** (<20 % / expiré)
- Bouton ↺ pour relancer le chrono
- À l'expiration, un message automatique est envoyé à l'IA (`[TIMER_EXPIRED]`) qui réagit naturellement : félicite l'élève, demande sa réponse ou sa démarche, et propose la correction

**Ce que DeepSeek reçoit — liste exhaustive :**
| Donnée | Source | Condition |
|--------|--------|-----------|
| System prompt (instructions de comportement) | Code BinlinPad | Toujours |
| `userType` (élève ou étudiant) | Profil utilisateur | Toujours |
| Date et heure actuelles | Serveur | Toujours |
| Délai depuis la dernière visite | `localStorage` client | Si disponible |
| 20 derniers messages de la session active | Session en cours | Toujours |
| Notes personnelles pertinentes (titre + matière + contenu) | RAG Qdrant sur la question | Si l'utilisateur a des notes |
| Échanges passés pertinents (question + réponse, datés) | RAG Qdrant historique | Si score ≥ 0.55 |
| Extraits du programme officiel (≤ 600 car.) | Qdrant `cours_ivoiriens` | Élèves uniquement |
| Alerte lacune récurrente | RAG historique (≥ 3 échanges similaires) | Si concept répété |

**Ce que DeepSeek ne reçoit PAS (décision de conception) :**
- L'humeur de l'utilisateur ou ses notes marquées "confus"
- Le profil d'apprentissage (matières faibles, sujets étudiés)
- Des données personnelles identifiantes (nom, email, âge)
- Les notes verrouillées par PIN
- L'intégralité de l'historique de conversation (fenêtre limitée à 20 messages)

**Services tiers sollicités lors d'une question :**
1. **Voyage AI** — vectorise la question → recherche dans notes, historique et curriculum
2. **Qdrant** — base vectorielle (`binlinpad_notes` + `cours_ivoiriens`)
3. **DeepSeek** — génère la réponse

---

### 3.4 IA dans l'éditeur de notes (`/api/notes/[id]/analyze`)

**Ce que ça fait :**
Cinq actions IA + une dictée vocale accessibles depuis la barre de l'éditeur, sur toute note déjà sauvegardée :

| Action | Bouton | Ce que l'IA produit |
|--------|--------|---------------------|
| **Comparer** | `⇄ Comparer` | Compare la note avec le curriculum officiel — ✅ correct, ⚠️ incomplet, ❌ manquant, 💡 conseil |
| **Corriger** | `✏️ Corriger` | Corrige fautes d'orthographe, grammaire, syntaxe — corrections expliquées + version corrigée |
| **Compléter** | `📖 Compléter` | Génère les paragraphes manquants + plan structuré — bouton "Ajouter à ma note" pour injection directe |
| **Flashcards** | `🃏 Flashcards` | Génère 5–12 cartes Q/R depuis la note — modal de révision avec flip animé, suivi des cartes maîtrisées, et bouton reset |
| **Examen blanc** | `📄 Examen blanc` | Crée un devoir complet (3 parties, barème /20) basé sur la note + curriculum — corrigé indicatif inclus |
| **Dictée vocale** | `🎤 Dicter` | Web Speech API (natif, sans API externe) — transcription en français directement dans le contenu de la note |
| **Scanner OCR** | `📷` (toolbar) | Photo ou galerie → Gemini Vision (`gemini-2.0-flash`) transcrit le manuscrit et l'injecte dans la note ; fonctionne sur nouvelle note vierge aussi |

**Comportement UI :**
- La barre IA n'apparaît que sur les notes **déjà sauvegardées** (pas sur une nouvelle note vierge)
- Pendant le chargement, le bouton actif affiche un spinner et les autres sont désactivés
- Le résultat s'affiche dans un panneau animé entre le textarea et les tags
- Modifier le contenu ferme automatiquement le panneau (évite la confusion entre version originale et corrigée)
- En mode "Compléter", un bouton **"Ajouter à ma note"** injecte les compléments en bas du contenu

**Ce que DeepSeek reçoit lors d'une analyse :**
| Donnée | Mode | Condition |
|--------|------|-----------|
| Titre + matière + contenu de la note | Tous | Toujours |
| Extraits du programme officiel (≤ 700 car., top 4) | `compare`, `complete` | Si Qdrant configuré |
| Instructions système spécifiques au mode | Tous | Toujours |

**Ce que DeepSeek ne reçoit PAS :**
- L'humeur associée à la note
- Les autres notes de l'utilisateur
- Le nom, email ou toute donnée personnelle identifiante

---

### 3.5 Mémoire longue durée — Historique chat vectorisé (`/api/chat/history`)

**Ce que ça fait :**
- Après chaque réponse, l'échange (question + réponse) est vectorisé et stocké dans Qdrant avec `type=chat`
- À la prochaine question, les échanges sémantiquement proches sont retrouvés et injectés en contexte
- L'IA peut ainsi faire référence à des conversations vieilles de plusieurs mois
- Quand l'utilisateur supprime une conversation, ses vecteurs sont supprimés en même temps

**Protection contre l'accumulation :**
| Mécanisme | Détail |
|-----------|--------|
| Plafond par utilisateur | 2 000 échanges max — les plus vieux (> 6 mois) sont purgés automatiquement si dépassé |
| Purge hebdomadaire globale | Cron Vercel tous les dimanches 3h — supprime les échanges > 12 mois de tous les utilisateurs |
| Suppression à la demande | Bouton "Nouvelle conversation" → suppression MongoDB + Qdrant simultanément |

**Données stockées dans Qdrant par échange :**
| Champ payload | Usage |
|---------------|-------|
| `type: "chat"` | Distingue les échanges des notes dans la collection |
| `userId` | Isolation multitenancy — un utilisateur ne voit jamais les échanges d'un autre |
| `sessionId` | Permet la suppression par session |
| `userMessage` (≤ 500 car.) | Question posée |
| `assistantMessage` (≤ 500 car.) | Réponse reçue |
| `timestamp` | Date de l'échange — utilisé pour la purge TTL |

---

### 3.6 Sessions de conversation (`/api/chat/sessions`)

**Ce que ça fait :**
- Persistance des conversations dans MongoDB
- Chargement des 20 dernières sessions au démarrage
- Suppression complète d'une session (MongoDB + vecteurs Qdrant) par l'utilisateur
- Compteur `totalSessions` et `lastActiveAt` mis à jour à chaque nouvelle session

**Données stockées :**
| Champ | Usage |
|-------|-------|
| `userId` | Lien avec l'utilisateur |
| `title` | Titre affiché dans la liste |
| `messages[]` | Contenu complet de la conversation |
| `summary` | Résumé IA généré automatiquement après une longue session |
| `createdAt`, `updatedAt` | Horodatage |

---

### 3.7 Journal d'humeur (`/journal`)

**Ce que ça fait :**
- L'élève peut associer une humeur à chaque note : `focused`, `confused`, `tired`, `motivated`, `anxious`, `calm`
- Le journal affiche une barre de répartition et une courbe des 7 derniers jours
- C'est un **outil purement descriptif et privé** — aucun seuil, aucune alerte, aucun score calculé
- L'humeur n'est **jamais** envoyée à l'IA ni à un tiers quelconque

**Règle absolue :**
> L'humeur est un journal personnel. BinlinPad ne la lit pas, ne la juge pas, et ne la transmet à personne sans action explicite de l'utilisateur (voir §3.8).

---

### 3.8 Bouton "Je veux en parler" (`/api/wellbeing/speak-request`)

**Ce que ça fait :**
- Bouton volontaire, visible dans les Paramètres et en bas du chat
- Lorsque l'élève clique dessus, une demande de contact est enregistrée
- Un conseiller peut alors voir la demande et prendre contact

**Données enregistrées lors d'un clic :**
| Donnée | Usage |
|--------|-------|
| `userId` | Pour permettre au conseiller d'identifier et contacter l'élève |
| `requestedAt` | Date et heure de la demande |
| `handled` | Booléen : demande traitée ou non |

**Ce qui n'est PAS enregistré :** aucun contenu de note, aucune humeur, aucun motif, aucune conversation.

**Déclenchement :** uniquement par action volontaire de l'élève. L'application ne déclenche jamais cette demande automatiquement.

**Lien SOS affiché en permanence :** SOS Amitié Côte d'Ivoire — `+225 27 22 22 63`

---

### 3.9 Graphe de connaissances (`/graph`)

**Ce que ça fait :**
- Visualisation D3 de toutes les notes et leurs liens (matières communes, tags communs)
- Panel de détail au clic sur un nœud : stats de la note, bouton "Interroger BinlinPad"
- Vue d'ensemble avec barres de progression par matière
- Filtrage par nœud sélectionné

**Données utilisées :** uniquement les notes déjà chargées en mémoire côté client. Aucune requête réseau supplémentaire, aucun envoi vers un tiers.

---

### 3.10 Paramètres & préférences (`/settings`)

**Ce que ça fait :**
- Changement du nom affiché
- Choix du layout des notes (masonry / grille / liste)
- Choix de la couleur d'accent
- Changement du code PIN (hash SHA-256 stocké localement dans `localStorage`)
- Activation/désactivation des fonctionnalités IA
- Sélecteur de profil élève/étudiant
- Lien SOS Amitié CI permanent
- Export JSON des notes

**Données stockées localement (localStorage, jamais en base) :**
- `binlinpad_prefs` : layout, couleur, displayName, hash PIN, langue, activation IA

---

## 4. Données personnelles — tableau de synthèse

| Donnée | Où stockée | Envoyée à des tiers | Tiers | Condition |
|--------|-----------|---------------------|-------|-----------|
| Email | MongoDB | Non (sauf OAuth) | Google (OAuth uniquement) | À l'inscription Google |
| Nom | MongoDB | Non | — | — |
| Hash mot de passe (bcrypt) | MongoDB | Non | — | — |
| Avatar | MongoDB | Non | — | — |
| Type profil (élève/étudiant) | MongoDB | Oui | DeepSeek | À chaque message |
| Notes (titre + contenu + matière) | MongoDB + Qdrant (vecteurs) | Oui | Voyage AI, Qdrant, DeepSeek | À chaque question posée |
| Humeur par note | MongoDB | **Non** | — | Jamais |
| Conversations (messages) | MongoDB | Oui | DeepSeek | À chaque message (20 derniers) |
| Historique chat vectorisé | Qdrant (vecteurs) | Oui | Voyage AI, Qdrant | Indexé après chaque réponse |
| Résumés de session | MongoDB | **Non** | — | Jamais |
| Profil apprentissage (totalSessions, lastActiveAt) | MongoDB | **Non** | — | Jamais |
| Demande conseiller (userId + date) | MongoDB | **Non** | — | Traitement interne uniquement |
| Préférences UI (layout, PIN hash…) | localStorage | **Non** | — | Jamais |
| Métriques navigation (pages vues) | Vercel Analytics | Oui | Vercel | Anonymisées |

---

## 5. Services tiers et flux de données

### 5.1 DeepSeek (IA tuteur)
- **URL :** `https://api.deepseek.com/chat/completions`
- **Modèle :** `deepseek-chat`
- **Ce qui est envoyé :** system prompt + 20 derniers messages + notes pertinentes + échanges passés pertinents + type de profil
- **Ce qui n'est jamais envoyé :** email, nom, humeur, profil d'apprentissage, notes non pertinentes
- **Politique de confidentialité DeepSeek :** à consulter sur leur site avant déploiement en production

### 5.2 Voyage AI (embeddings)
- **URL :** `https://api.voyageai.com/v1/embeddings`
- **Modèle :** `voyage-3`
- **Ce qui est envoyé :** texte des notes (création/modification) + texte de chaque question + texte de chaque échange (question + réponse) pour l'indexation mémoire
- **Usage :** transforme le texte en vecteurs numériques 1024 dimensions pour la recherche sémantique

### 5.3 Qdrant (base vectorielle)
- **Collections :**
  - `binlinpad_notes` : embeddings des notes (`type=note`) ET de l'historique chat (`type=chat`) — filtrés par `userId`
  - `cours_ivoiriens` : embeddings du programme officiel ivoirien (100 448 points, données publiques)
- **Rétention historique chat :** 12 mois maximum, plafond 2 000 échanges par utilisateur
- **Accès :** lecture lors d'une question ; écriture lors d'une création de note ou d'un échange

### 5.4 Google OAuth
- **Usage :** connexion optionnelle sans mot de passe
- **Données reçues de Google :** nom, email, avatar
- **Si l'utilisateur utilise email/mot de passe :** aucune donnée ne transite par Google

### 5.5 Google Gemini (OCR manuscrit)
- **URL :** `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent`
- **Modèle :** `gemini-2.0-flash`
- **Ce qui est envoyé :** l'image (JPEG/PNG/WEBP) encodée en base64, accompagnée d'un prompt d'instruction OCR
- **Ce qui n'est jamais envoyé :** le contenu textuel des notes, l'identité de l'utilisateur, l'historique de session
- **Déclenchement :** uniquement sur action explicite de l'utilisateur (clic sur `📷 Scanner`)
- **Quota gratuit :** 1 500 requêtes/jour sur le tier gratuit Google AI Studio
- **Clé requise :** `GEMINI_API_KEY` (variable d'environnement serveur uniquement)

### 5.6 Vercel Analytics
- **Usage :** mesure du trafic (pages vues, pays)
- **Anonymisation :** pas d'identifiant persistant ni de cookie de tracking
- **Données :** métriques agrégées de navigation

### 5.6 Vercel Cron
- **Fréquence :** tous les dimanches à 3h du matin
- **Action :** appelle `/api/cron/purge-history` — purge les échanges chat vectorisés > 12 mois
- **Protégé par :** `CRON_SECRET` (variable d'env serveur)

---

## 6. Sécurité

| Mesure | Détail |
|--------|--------|
| Authentification | JWT signé (NextAuth v5), expiré automatiquement |
| Mots de passe | Jamais stockés en clair — bcrypt avec sel |
| PIN notes | Hash SHA-256 stocké uniquement dans `localStorage` (jamais en base ni sur le réseau) |
| Isolation des données | Toutes les requêtes MongoDB et Qdrant filtrent par `userId` issu du JWT |
| Guard ObjectId | Les ids temporaires locaux sont rejetés avant toute requête MongoDB (`/^[0-9a-f]{24}$/i`) |
| HTTPS | Assuré par Vercel en production |
| Variables d'environnement | Clés API stockées côté serveur uniquement, jamais exposées au client |
| Cron protégé | Route purge accessible uniquement avec `CRON_SECRET` dans le header Authorization |

---

## 7. Droits des utilisateurs (base pour les CGU)

À mentionner explicitement dans les CGU :

- **Droit d'accès :** l'utilisateur peut consulter toutes ses données via l'application
- **Droit de suppression :** suppression des notes et conversations disponibles depuis l'UI ; suppression complète du compte à implémenter
- **Droit de rectification :** modification de toutes les notes et du profil depuis l'UI
- **Portabilité :** export JSON des notes disponible dans les Paramètres
- **Retrait du consentement IA :** l'utilisateur peut désactiver les fonctionnalités IA dans les Paramètres — dans ce cas, aucune donnée n'est envoyée à DeepSeek ni à Voyage AI
- **Journal d'humeur :** données purement privées, jamais partagées, supprimées avec la note
- **Mémoire conversationnelle :** l'utilisateur peut supprimer tout ou partie de son historique depuis l'interface

---

## 8. Historique des fonctionnalités récentes

### v0.3.0 — Tuteur enrichi & éditeur augmenté (juin 2025)

- [x] **Streak de travail 🔥** — compteur de jours consécutifs d'activité (notes + chat) affiché dans les headers Journal et Tuteur ; stocké dans `localStorage` (`binlinpad_streak`) ; meilleur streak conservé ; couleur orange si ≥ 7 jours
- [x] **Rapport hebdomadaire** — carte automatique en haut du journal : notes créées, mots écrits, jours actifs, top matière, comparaison semaine précédente ; calculé côté client sans requête réseau
- [x] **Résumé de session affiché** — carte pliable `📋 Résumé de session` en bas du fil de discussion, affichée dès qu'un résumé IA est généré (après >12 échanges) ; le résumé est maintenant stocké dans le state Zustand
- [x] **Flashcards depuis une note** — bouton `🃏 Flashcards` dans la barre IA de l'éditeur → modal avec flip animé, suivi des cartes maîtrisées (bouton "Su !"), barre de progression, écran de félicitations, reset
- [x] **Examen blanc** — bouton `📄 Examen blanc` → devoir 3 parties (/20 pts) avec durée recommandée + corrigé indicatif ; enrichi par le curriculum officiel via RAG
- [x] **Dictée vocale** — bouton `🎤 Dicter` dans la barre de l'éditeur → transcription Web Speech API (natif, aucune clé API) en français, insertion en temps réel dans le contenu de la note ; fonctionne sur Chrome/Edge/Safari
- [x] **Détection de lacune récurrente** — si ≥ 3 échanges passés portent sur le même concept, le system prompt signale à l'IA une lacune probable et l'invite à proposer une approche pédagogique différente
- [x] **Scanner OCR manuscrit** — bouton `📷` dans la toolbar de l'éditeur → l'élève prend une photo de sa feuille (ou importe depuis sa galerie) → Gemini Vision `gemini-2.0-flash` transcrit le texte et l'injecte dans la note ; fonctionne même sur une nouvelle note vierge ; gratuit jusqu'à 1500 req/jour

### v0.2.0 — Tuteur IA : conscience temporelle & minuteur (juin 2025)

- [x] **Conscience temporelle** — l'IA connaît la date/heure courante et le délai depuis la dernière visite de l'élève ; son accueil s'adapte automatiquement (neutre / chaleureux / point de révision)
- [x] **Minuteur d'exercice** — quand l'IA donne un exercice chronométré, un arc SVG animé décompte le temps dans la bulle de réponse (vert → orange → rouge) ; à l'expiration un message automatique est envoyé et l'IA réagit naturellement

---

## 9. Ce qui reste à implémenter avant mise en production complète

- [ ] Créer la collection Qdrant `binlinpad_notes` (dim 1024, Cosine) — action manuelle
- [ ] Route de suppression de compte (supprime User + Notes + ChatSessions + SpeakRequests + vecteurs Qdrant)
- [ ] Page CGU / Politique de confidentialité dans l'app
- [ ] Consentement explicite aux cookies analytics à l'inscription
- [ ] Mention légale du traitement des données mineurs (élèves du secondaire)
- [ ] Durée de rétention explicite des sessions MongoDB (purge automatique à prévoir)
- [ ] Registre des traitements (RGPD article 30) si applicable
- [ ] Rate limiting sur `/api/chat` pour limiter les coûts API
