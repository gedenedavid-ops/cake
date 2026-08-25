import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { Note } from '@/models/Note';

const DEEPSEEK_API_URL  = 'https://api.deepseek.com/chat/completions';
const QDRANT_URL             = process.env.QDRANT_URL ?? 'http://localhost:6333';
const QDRANT_API_KEY         = process.env.QDRANT_API_KEY;
// Curriculum ivoirien — compte Qdrant séparé
const CURRICULUM_URL         = process.env.QDRANT_CURRICULUM_URL ?? process.env.QDRANT_URL ?? 'http://localhost:6333';
const CURRICULUM_API_KEY     = process.env.QDRANT_CURRICULUM_API_KEY ?? process.env.QDRANT_API_KEY;
const CURRICULUM_COLL        = process.env.QDRANT_CURRICULUM_COLLECTION ?? 'cours_ivoiriens';
const VOYAGE_API_URL    = 'https://api.voyageai.com/v1/embeddings';

type AnalyzeMode = 'compare' | 'correct' | 'complete';

type Params = { params: Promise<{ id: string }> };

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
  topK = 4
): Promise<{ title: string; content: string; subject: string }[]> {
  try {
    const res = await fetch(
      `${CURRICULUM_URL}/collections/${CURRICULUM_COLL}/points/search`,
      {
        method: 'POST',
        headers: curriculumHeaders(),
        body: JSON.stringify({ vector: embedding, limit: topK, with_payload: true }),
      }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return (data.result ?? []).map((r: {
      payload: { title?: string; titre?: string; content?: string; texte?: string; subject?: string; matiere?: string };
    }) => ({
      title:   r.payload.title   ?? r.payload.titre   ?? 'Cours',
      content: r.payload.content ?? r.payload.texte   ?? '',
      subject: r.payload.subject ?? r.payload.matiere ?? '',
    }));
  } catch {
    return [];
  }
}

async function callDeepSeek(systemPrompt: string, userContent: string, apiKey: string): Promise<string> {
  const res = await fetch(DEEPSEEK_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: userContent   },
      ],
      temperature: 0.4,
      max_tokens: 1200,
      stream: false,
    }),
  });
  if (!res.ok) throw new Error(`DeepSeek error: ${res.status}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? '';
}

// ─── POST /api/notes/[id]/analyze ─────────────────────────────────────────────
// Corps : { mode: 'compare' | 'correct' | 'complete' }
//
// compare  → compare la note avec le programme officiel : ce qui manque, ce qui est faux,
//             ce qui est bien
// correct  → correction orthographique, grammaticale et stylistique de la note
// complete → complète la note avec les notions manquantes du curriculum

export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
  }

  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'DEEPSEEK_API_KEY non configuré' }, { status: 503 });
  }

  const { mode }: { mode: AnalyzeMode } = await request.json();
  if (!['compare', 'correct', 'complete'].includes(mode)) {
    return NextResponse.json({ error: 'Mode invalide' }, { status: 400 });
  }

  await connectDB();

  const note = await Note.findOne({ _id: id, userId: session.user.id }).lean();
  if (!note) return NextResponse.json({ error: 'Note introuvable' }, { status: 404 });

  const noteText = `Titre : ${note.title}\nMatière : ${note.subject}\n\n${note.content}`;

  try {
    let result = '';

    if (mode === 'correct') {
      // ── Mode correction — pas besoin de RAG, juste DeepSeek ────────────────
      const systemPrompt = `Tu es un correcteur bienveillant pour un élève ivoirien.
Corrige le texte suivant en signalant :
1. Les fautes d'orthographe (surligne avec ~~mot~~ → **correction**)
2. Les fautes de grammaire ou de syntaxe
3. Les formulations maladroites (propose une version améliorée)
4. Un bilan final en 2-3 phrases

Format de réponse :
## ✏️ Corrections
[liste des corrections avec explication courte]

## 💬 Version corrigée
[le texte entièrement corrigé, prêt à recopier]

## 🏆 Bilan
[encouragement + points forts du texte]`;

      result = await callDeepSeek(systemPrompt, noteText, apiKey);

    } else {
      // ── Modes compare et complete — RAG curriculum requis ──────────────────
      const ragConfigured = !!(process.env.VOYAGE_API_KEY && QDRANT_API_KEY);
      let curriculumContext = '';

      if (ragConfigured) {
        const embedding = await getEmbedding(`${note.subject} ${note.title} ${note.content.slice(0, 300)}`);
        const sources = await searchCurriculum(embedding, 4);
        if (sources.length > 0) {
          curriculumContext = sources.map((s) =>
            `[${s.subject}] ${s.title}:\n${s.content.slice(0, 700)}`
          ).join('\n\n---\n');
        }
      }

      if (mode === 'compare') {
        const systemPrompt = `Tu es un tuteur qui compare les notes d'un élève avec le programme officiel ivoirien.
${curriculumContext ? `Programme officiel de référence :\n${curriculumContext}\n\n` : ''}
Analyse la note et réponds avec ce format exact :

## ✅ Ce qui est correct
[points bien couverts dans la note, avec correspondance au programme]

## ⚠️ Ce qui est incomplet ou imprécis
[notions présentes mais mal expliquées ou trop courtes]

## ❌ Ce qui manque
[notions importantes du programme absentes de la note]

## 💡 Conseil
[1 conseil pratique pour améliorer cette note avant l'examen]

Sois précis, factuel, et bienveillant.${!curriculumContext ? '\n(Programme officiel non disponible — base-toi sur tes connaissances générales du curriculum ivoirien)' : ''}`;

        result = await callDeepSeek(systemPrompt, `Note à analyser :\n${noteText}`, apiKey);

      } else {
        // mode === 'complete'
        const systemPrompt = `Tu es un tuteur qui complète les notes d'un élève avec les notions manquantes du programme officiel ivoirien.
${curriculumContext ? `Programme officiel de référence :\n${curriculumContext}\n\n` : ''}
À partir des lacunes détectées dans la note, génère des compléments à ajouter directement.

Format de réponse :

## 📝 Compléments à ajouter à ta note

[Rédige les paragraphes manquants, dans le même style que la note de l'élève — comme si c'était l'élève qui les avait écrits lui-même. Concis, clair, adapté au niveau collège/lycée.]

## 🗂️ Plan suggéré pour la note complète
[Propose un plan structuré intégrant la note actuelle + les compléments]

Reste dans le cadre du curriculum ivoirien.${!curriculumContext ? '\n(Programme officiel non disponible — base-toi sur tes connaissances générales du curriculum ivoirien)' : ''}`;

        result = await callDeepSeek(systemPrompt, `Note à compléter :\n${noteText}`, apiKey);
      }
    }

    return NextResponse.json({ result, mode });

  } catch (error) {
    console.error(`[analyze/${mode}] error:`, error);
    return NextResponse.json({ error: 'Analyse échouée' }, { status: 500 });
  }
}
