import { NextResponse } from 'next/server';

const DEEPSEEK_API_URL = 'https://api.deepseek.com/chat/completions';

const QDRANT_URL             = process.env.QDRANT_URL ?? 'http://localhost:6333';
const QDRANT_API_KEY         = process.env.QDRANT_API_KEY;
// Curriculum ivoirien — compte Qdrant séparé
const CURRICULUM_URL         = process.env.QDRANT_CURRICULUM_URL ?? process.env.QDRANT_URL ?? 'http://localhost:6333';
const CURRICULUM_API_KEY     = process.env.QDRANT_CURRICULUM_API_KEY ?? process.env.QDRANT_API_KEY;
const CURRICULUM_COLL        = process.env.QDRANT_CURRICULUM_COLLECTION ?? 'cours_ivoiriens';
const VOYAGE_API_URL         = 'https://api.voyageai.com/v1/embeddings';

// ─── Prompts système ──────────────────────────────────────────────────────────

const BASE_PROMPT = `Tu es BinlinPad, un tuteur personnel bienveillant, patient et encourageant.
Ta mission : aider les apprenants à comprendre leurs notes, simplifier les concepts, créer des quiz et réduire l'anxiété des examens.

Ce que tu PEUX faire (tes vraies capacités) :
- Lire et utiliser les notes personnelles de l'apprenant — elles te sont transmises en contexte quand elles sont pertinentes à la question posée
- Te souvenir d'échanges passés — tu as accès à des extraits de conversations précédentes retrouvés par similarité sémantique
- Créer des quiz personnalisés basés sur les notes fournies
- Expliquer, reformuler, simplifier n'importe quel concept présent dans les notes
- Pour les élèves : t'appuyer sur le programme officiel ivoirien (BEPC, BAC) en plus des notes

Ce que tu NE PEUX PAS faire (tes limites réelles) :
- Tu ne vois pas TOUTES les notes en permanence — seulement celles qui correspondent à la question posée (recherche sémantique). Si une note n'est pas remontée, dis-le et invite l'apprenant à reformuler ou préciser
- Tu ne te souviens pas de tout dans les moindres détails — ta mémoire est basée sur des extraits pertinents, pas un replay intégral
- Tu ne peux pas accéder à internet, générer des images ou exécuter du code
- Tu ne poses pas de diagnostic médical, psychologique ou émotionnel

Règles de transparence :
- Si on te demande "tu peux voir mes notes ?", réponds OUI et explique que tu vois les notes liées à la question posée
- Si une note spécifique n'est pas dans le contexte fourni, dis-le honnêtement : "Cette note ne m'a pas été transmise pour cette question — reformule ou donne-moi le titre exact"
- Ne prétends jamais avoir des capacités que tu n'as pas, et ne nie jamais celles que tu as

Directives générales :
- Réponds TOUJOURS en français, quelle que soit la langue de la question
- Sois chaleureux, encourageant et patient — jamais condescendant
- Pour expliquer un concept, utilise des analogies, des exemples concrets et des étapes claires
- Pour un quiz, numérote les questions et cache les réponses jusqu'à ce qu'on te les demande
- Garde tes réponses concises et digestes — évite les murs de texte
- Félicite l'effort et les progrès, normalise la confusion comme une étape normale
- Ne fais jamais sentir à l'apprenant qu'il est nul ou incapable
- Termine tes réponses par une question de suivi douce ou un encouragement`;

const ELEVE_ADDENDUM = `
Tu t'adresses à un ÉLÈVE du système scolaire ivoirien (primaire / collège / lycée).
- Appuie-toi en priorité sur ses notes personnelles ET sur les extraits du programme officiel fournis en contexte
- Si ses notes sont incomplètes ou manquantes, complète avec le programme officiel
- Adapte ton niveau de langage à un jeune élève : simple, concret, sans jargon inutile
- Aide-le à préparer ses examens (BEPC, BAC) en lien avec le curriculum ivoirien`;

const ETUDIANT_ADDENDUM = `
Tu t'adresses à un ÉTUDIANT du supérieur (université, BTS, grandes écoles…).
- Tu as accès à toutes ses notes et tu peux t'appuyer dessus librement
- Pas de restriction de curriculum : traite n'importe quel sujet académique ou professionnel
- Tu peux aller dans la profondeur, utiliser la terminologie spécialisée et les notions avancées
- Aide-le à structurer sa pensée, rédiger des synthèses et préparer ses soutenances`;

// ─── Helpers Qdrant ───────────────────────────────────────────────────────────

function qdrantHeaders(): HeadersInit {
  const h: HeadersInit = { 'Content-Type': 'application/json' };
  if (QDRANT_API_KEY) h['api-key'] = QDRANT_API_KEY;
  return h;
}

function curriculumHeaders(): HeadersInit {
  const h: HeadersInit = { 'Content-Type': 'application/json' };
  if (CURRICULUM_API_KEY) h['api-key'] = CURRICULUM_API_KEY;
  return h;
}

function ragConfigured(): boolean {
  return !!(process.env.VOYAGE_API_KEY && QDRANT_API_KEY);
}

async function getEmbedding(text: string): Promise<number[]> {
  const res = await fetch(VOYAGE_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.VOYAGE_API_KEY}`,
    },
    body: JSON.stringify({ input: [text], model: 'voyage-3', input_type: 'query' }),
  });
  if (!res.ok) throw new Error(`Voyage AI error: ${res.status}`);
  const data = await res.json();
  return data.data[0].embedding as number[];
}

async function searchChatHistory(
  embedding: number[],
  userId: string,
  topK: number = 5
): Promise<{ userMessage: string; assistantMessage: string; timestamp: string; score: number }[]> {
  const NOTES_COLL = process.env.QDRANT_COLLECTION ?? 'binlinpad_notes';
  try {
    const res = await fetch(
      `${QDRANT_URL}/collections/${NOTES_COLL}/points/search`,
      {
        method: 'POST',
        headers: qdrantHeaders(),
        body: JSON.stringify({
          vector: embedding,
          limit: topK,
          with_payload: true,
          score_threshold: 0.55,
          filter: {
            must: [
              { key: 'type',   match: { value: 'chat' } },
              { key: 'userId', match: { value: userId } },
            ],
          },
        }),
      }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return (data.result ?? []).map((r: {
      payload: { userMessage: string; assistantMessage: string; timestamp: string };
      score: number;
    }) => ({
      userMessage:      r.payload.userMessage,
      assistantMessage: r.payload.assistantMessage,
      timestamp:        r.payload.timestamp,
      score:            r.score,
    }));
  } catch {
    return [];
  }
}

async function searchCurriculum(
  embedding: number[],
  topK: number = 3
): Promise<{ title: string; content: string; subject: string; score: number }[]> {
  try {
    const res = await fetch(
      `${CURRICULUM_URL}/collections/${CURRICULUM_COLL}/points/search`,
      {
        method: 'POST',
        headers: curriculumHeaders(),
        body: JSON.stringify({
          vector: embedding,
          limit: topK,
          with_payload: true,
        }),
      }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return (data.result ?? []).map((r: {
      payload: { title?: string; content?: string; subject?: string; texte?: string; titre?: string; matiere?: string };
      score: number;
    }) => ({
      title:   r.payload.title   ?? r.payload.titre   ?? 'Cours',
      content: r.payload.content ?? r.payload.texte   ?? '',
      subject: r.payload.subject ?? r.payload.matiere ?? '',
      score:   r.score,
    }));
  } catch {
    return [];
  }
}

// ─── Résumé de session (déclencheur : >12 échanges) ──────────────────────────

async function generateSessionSummary(
  messages: { role: string; content: string }[],
  apiKey: string
): Promise<string> {
  const prompt = `Résume cette session de tutorat en 4-5 points courts :
1. Ce que l'apprenant a étudié
2. Les concepts qu'il a bien compris
3. Les points de confusion ou d'erreur récurrents
4. Les questions restées ouvertes
Sois factuel, bref, et utile pour la prochaine session.`;

  const res = await fetch(DEEPSEEK_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: prompt },
        ...messages.slice(-16),  // derniers 16 messages pour le résumé
      ],
      temperature: 0.3,
      max_tokens: 400,
      stream: false,
    }),
  });
  if (!res.ok) return '';
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? '';
}

// ─── POST /api/chat ───────────────────────────────────────────────────────────

export async function POST(request: Request) {
  try {
    const {
      messages,
      context,       // notes perso (SearchResult[]) depuis le store
      query,
      userType = 'eleve',
      userId,        // id MongoDB de l'utilisateur (pour RAG historique)
    } = await request.json();

    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      return NextResponse.json({
        message: `Bonjour ! Je suis BinlinPad, ton tuteur personnel 🎓\n\nPour activer les réponses IA, ajoute ta **DEEPSEEK_API_KEY** dans le fichier \`.env.local\`. Une fois configurée, je pourrai :\n\n• Répondre à tes questions sur tes notes\n• Créer des quiz personnalisés\n• Expliquer les concepts simplement\n\nTu peux le faire ! 💪`,
        sources: [],
      });
    }

    // ── 1. Construire le system prompt selon le profil ────────────────────────
    const addendum = userType === 'etudiant' ? ETUDIANT_ADDENDUM : ELEVE_ADDENDUM;
    let systemContent = BASE_PROMPT + addendum;

    // ── 2. RAG historique — échanges passés pertinents à la question ─────────
    if (userId && ragConfigured()) {
      try {
        const embedding = await getEmbedding(query ?? '');
        const pastExchanges = await searchChatHistory(embedding, userId, 5);
        if (pastExchanges.length > 0) {
          systemContent += `\n\n--- ÉCHANGES PASSÉS PERTINENTS (mémoire longue durée) ---\n`;
          systemContent += `Ces échanges proviennent de conversations précédentes avec cet apprenant. Utilise-les pour assurer la continuité pédagogique.\n\n`;
          systemContent += pastExchanges.map((e) =>
            `[${new Date(e.timestamp).toLocaleDateString('fr-FR')}]\nÉlève : ${e.userMessage}\nBinlinPad : ${e.assistantMessage}`
          ).join('\n\n---\n');
          systemContent += `\n--- FIN DES ÉCHANGES PASSÉS ---`;
        }
      } catch {
        // RAG historique échoue silencieusement
      }
    }

    // ── 3. Notes personnelles de l'élève ─────────────────────────────────────
    if (context && context.length > 0) {
      systemContent += `\n\n--- NOTES PERSONNELLES DE L'APPRENANT ---\n`;
      systemContent += context.map((item: {
        payload: { title: string; subject: string; content: string };
        score: number;
      }) =>
        `[${item.payload.subject}] ${item.payload.title}:\n${item.payload.content}`
      ).join('\n\n---\n');
      systemContent += `\n--- FIN DES NOTES ---`;
    }

    // ── 4. RAG curriculaire (élèves seulement, si Qdrant configuré) ──────────
    let curriculumSources: { title: string; content: string; subject: string; score: number }[] = [];
    if (userType === 'eleve' && ragConfigured()) {
      try {
        const embedding = await getEmbedding(query ?? '');
        curriculumSources = await searchCurriculum(embedding, 3);
        if (curriculumSources.length > 0) {
          systemContent += `\n\n--- EXTRAITS DU PROGRAMME OFFICIEL (cours_ivoiriens) ---\n`;
          systemContent += curriculumSources.map((c) =>
            `[${c.subject}] ${c.title}:\n${c.content.slice(0, 600)}`
          ).join('\n\n---\n');
          systemContent += `\n--- FIN DU PROGRAMME ---`;
        }
      } catch {
        // RAG curriculum échoue silencieusement — l'IA continue sans
      }
    }

    const systemMsg = { role: 'system', content: systemContent };

    // ── 5. Appel DeepSeek — fenêtre glissante sur les 20 derniers messages ────
    // Le RAG historique compense la troncature : l'IA retrouve les échanges
    // anciens par similarité sémantique, pas par scrollback brut.
    const recentMessages = messages.slice(-20);

    const response = await fetch(DEEPSEEK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [systemMsg, ...recentMessages],
        temperature: 0.7,
        max_tokens: 1500,
        stream: false,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('DeepSeek error:', err);
      return NextResponse.json(
        { message: 'Service IA temporairement indisponible. Réessaie dans un instant.' },
        { status: 502 }
      );
    }

    const data = await response.json();
    const message = data.choices?.[0]?.message?.content ?? 'Aucune réponse générée.';

    // ── 6. Résumé de session si beaucoup d'échanges (>12 messages) ───────────
    let sessionSummary: string | undefined;
    if (messages.length > 12 && messages.length % 8 === 0) {
      sessionSummary = await generateSessionSummary(messages, apiKey).catch(() => undefined);
    }

    return NextResponse.json({
      message,
      sources: [],
      sessionSummary,
      curriculumUsed: curriculumSources.length > 0,
    });

  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { message: 'Une erreur inattendue s\'est produite.' },
      { status: 500 }
    );
  }
}
