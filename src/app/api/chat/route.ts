import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

const DEEPSEEK_API_URL = 'https://api.deepseek.com/chat/completions';

const QDRANT_URL        = process.env.QDRANT_URL ?? 'http://localhost:6333';
const QDRANT_API_KEY    = process.env.QDRANT_API_KEY;
const CURRICULUM_COLL   = process.env.QDRANT_CURRICULUM_COLLECTION ?? 'cours_ivoiriens';
const VOYAGE_API_URL    = 'https://api.voyageai.com/v1/embeddings';

// ─── Prompts système ──────────────────────────────────────────────────────────

const BASE_PROMPT = `Tu es Cake, un tuteur personnel bienveillant, patient et encourageant.
Ta mission : aider les apprenants à comprendre leurs notes, simplifier les concepts, créer des quiz et réduire l'anxiété des examens.

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

async function searchCurriculum(
  embedding: number[],
  topK: number = 3
): Promise<{ title: string; content: string; subject: string; score: number }[]> {
  try {
    const res = await fetch(
      `${QDRANT_URL}/collections/${CURRICULUM_COLL}/points/search`,
      {
        method: 'POST',
        headers: qdrantHeaders(),
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
  const session = await auth();

  try {
    const {
      messages,
      context,       // notes perso (SearchResult[]) depuis le store
      query,
      userType = 'eleve',
      learningProfile,
      pastSummaries,  // résumés des sessions précédentes (optionnel)
      moodSignal,    // { recentConfused[], moodSummary{} }
    } = await request.json();

    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      return NextResponse.json({
        message: `Bonjour ! Je suis Cake, ton tuteur personnel 🎓\n\nPour activer les réponses IA, ajoute ta **DEEPSEEK_API_KEY** dans le fichier \`.env.local\`. Une fois configurée, je pourrai :\n\n• Répondre à tes questions sur tes notes\n• Créer des quiz personnalisés\n• Expliquer les concepts simplement\n\nTu peux le faire ! 💪`,
        sources: [],
      });
    }

    // ── 1. Construire le system prompt selon le profil ────────────────────────
    const addendum = userType === 'etudiant' ? ETUDIANT_ADDENDUM : ELEVE_ADDENDUM;
    let systemContent = BASE_PROMPT + addendum;

    // Injecter le profil d'apprentissage si disponible
    if (learningProfile?.weakSubjects?.length > 0 || learningProfile?.studiedTopics?.length > 0) {
      systemContent += `\n\n--- PROFIL DE L'APPRENANT ---`;
      if (learningProfile.weakSubjects?.length > 0) {
        systemContent += `\nMatières en difficulté : ${learningProfile.weakSubjects.join(', ')}`;
      }
      if (learningProfile.studiedTopics?.length > 0) {
        systemContent += `\nSujets déjà abordés : ${learningProfile.studiedTopics.slice(-10).join(', ')}`;
      }
      systemContent += `\n--- FIN DU PROFIL ---`;
    }

    // Injecter les signaux d'humeur
    if (moodSignal) {
      const { recentConfused, moodSummary } = moodSignal as {
        recentConfused: { title: string; subject: string; content: string }[];
        moodSummary: Record<string, number>;
      };

      const totalMoods = Object.values(moodSummary).reduce((s, v) => s + v, 0);
      if (totalMoods > 0) {
        const dominant = Object.entries(moodSummary).sort((a, b) => b[1] - a[1])[0];
        const confusedRatio = (moodSummary['confused'] ?? 0) / totalMoods;

        systemContent += `\n\n--- ÉTAT ÉMOTIONNEL RÉCENT DE L'APPRENANT (14 derniers jours) ---`;
        systemContent += `\nHumeur dominante : ${dominant[0]} (${dominant[1]} notes)`;
        if (confusedRatio > 0.4) {
          systemContent += `\n⚠️ L'apprenant est souvent CONFUS (${Math.round(confusedRatio * 100)}% des notes). Sois particulièrement patient, décompose tes explications en petites étapes, et valide chaque étape avant de continuer.`;
        } else if (moodSummary['motivated'] || moodSummary['focused']) {
          systemContent += `\nL'apprenant est en bonne forme (motivé/concentré). Tu peux aller plus loin dans les détails et les nuances.`;
        } else if (moodSummary['anxious'] || moodSummary['tired']) {
          systemContent += `\nL'apprenant semble fatigué ou anxieux. Privilégie les encouragements, les petites victoires et un rythme doux.`;
        }
        systemContent += `\n--- FIN DE L'ÉTAT ÉMOTIONNEL ---`;
      }

      if (recentConfused.length > 0) {
        systemContent += `\n\n--- NOTES MARQUÉES CONFUSES (priorité d'aide) ---\n`;
        systemContent += recentConfused.map((n) =>
          `[${n.subject}] ${n.title} : ${n.content}`
        ).join('\n---\n');
        systemContent += `\n--- FIN DES NOTES CONFUSES ---`;
      }
    }

    // Injecter les résumés des sessions passées (mémoire longue durée)
    if (pastSummaries?.length > 0) {
      systemContent += `\n\n--- RÉSUMÉS DES SESSIONS PRÉCÉDENTES ---\n`;
      systemContent += (pastSummaries as string[]).slice(-3).join('\n\n---\n');
      systemContent += `\n--- FIN DES RÉSUMÉS ---`;
    }

    // ── 2. Notes personnelles de l'élève ─────────────────────────────────────
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

    // ── 3. RAG curriculaire (élèves seulement, si Qdrant configuré) ──────────
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

    // ── 4. Appel DeepSeek ────────────────────────────────────────────────────
    const response = await fetch(DEEPSEEK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [systemMsg, ...messages],
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

    // ── 5. Résumé de session si beaucoup d'échanges (>12 messages) ───────────
    let sessionSummary: string | undefined;
    if (messages.length > 12 && messages.length % 8 === 0) {
      // Déclencher le résumé tous les 8 messages après le seuil de 12
      sessionSummary = await generateSessionSummary(messages, apiKey).catch(() => undefined);
    }

    // ── 6. Mettre à jour le profil si connecté (studiedTopics) ────────────────
    if (session?.user?.id && query) {
      // Extraire le sujet de la conversation depuis le contexte notes (best-effort)
      const topNote = context?.[0]?.payload;
      if (topNote?.subject) {
        fetch(`${process.env.NEXTAUTH_URL ?? ''}/api/user/profile`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            studiedTopics: [topNote.subject],   // l'API fera un $push côté serveur
          }),
        }).catch(() => {});
      }
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
