import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

const QDRANT_URL       = process.env.QDRANT_URL ?? 'http://localhost:6333';
const QDRANT_API_KEY   = process.env.QDRANT_API_KEY;
const NOTES_COLL       = process.env.QDRANT_COLLECTION ?? 'binlinpad_notes';
const VOYAGE_API_URL   = 'https://api.voyageai.com/v1/embeddings';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function qdrantHeaders(): HeadersInit {
  const h: HeadersInit = { 'Content-Type': 'application/json' };
  if (QDRANT_API_KEY) h['api-key'] = QDRANT_API_KEY;
  return h;
}

function isConfigured(): boolean {
  return !!(process.env.VOYAGE_API_KEY && QDRANT_API_KEY);
}

async function getEmbedding(text: string, inputType: 'query' | 'document' = 'document'): Promise<number[]> {
  const res = await fetch(VOYAGE_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.VOYAGE_API_KEY}`,
    },
    body: JSON.stringify({ input: [text], model: 'voyage-3', input_type: inputType }),
  });
  if (!res.ok) throw new Error(`Voyage AI error: ${res.status}`);
  const data = await res.json();
  return data.data[0].embedding as number[];
}

// Plafond par utilisateur : au-delà, on purge les plus vieux avant d'indexer
const MAX_EXCHANGES_PER_USER = 2000;

// ─── POST /api/chat/history — indexer un échange (question + réponse) ─────────
// Corps : { sessionId, exchangeId, userMessage, assistantMessage, timestamp }
// Appelé côté client après chaque réponse reçue.

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
  }

  if (!isConfigured()) {
    return NextResponse.json({ success: false, message: 'RAG non configuré' });
  }

  try {
    const { sessionId, exchangeId, userMessage, assistantMessage, timestamp } = await request.json();

    if (!sessionId || !exchangeId || !userMessage || !assistantMessage) {
      return NextResponse.json({ error: 'Paramètres manquants' }, { status: 400 });
    }

    // ── Vérification du plafond par utilisateur ───────────────────────────
    // On compte les points existants pour cet utilisateur (type=chat)
    const countRes = await fetch(
      `${QDRANT_URL}/collections/${NOTES_COLL}/points/count`,
      {
        method: 'POST',
        headers: qdrantHeaders(),
        body: JSON.stringify({
          filter: {
            must: [
              { key: 'type',   match: { value: 'chat' } },
              { key: 'userId', match: { value: session.user.id } },
            ],
          },
          exact: false,   // estimation rapide, pas besoin d'être exact
        }),
      }
    );
    if (countRes.ok) {
      const countData = await countRes.json();
      const total = countData.result?.count ?? 0;
      if (total >= MAX_EXCHANGES_PER_USER) {
        // Supprimer le plus vieux paquet (100 échanges) pour faire de la place
        await fetch(
          `${QDRANT_URL}/collections/${NOTES_COLL}/points/delete`,
          {
            method: 'POST',
            headers: qdrantHeaders(),
            body: JSON.stringify({
              filter: {
                must: [
                  { key: 'type',   match: { value: 'chat' } },
                  { key: 'userId', match: { value: session.user.id } },
                  // Supprime les échanges les plus anciens (timestamp < il y a 6 mois)
                  {
                    key: 'timestamp',
                    range: {
                      lt: new Date(Date.now() - 180 * 86_400_000).toISOString(),
                    },
                  },
                ],
              },
            }),
          }
        );
      }
    }

    // On vectorise la question + réponse ensemble pour une bonne représentation sémantique
    const text = `Question : ${userMessage}\nRéponse : ${assistantMessage}`;
    const embedding = await getEmbedding(text, 'document');

    const res = await fetch(
      `${QDRANT_URL}/collections/${NOTES_COLL}/points`,
      {
        method: 'PUT',
        headers: qdrantHeaders(),
        body: JSON.stringify({
          points: [{
            // id Qdrant : on utilise l'exchangeId (UUID) converti en entier via hash
            // Qdrant accepte aussi les UUIDs comme id string — on l'utilise directement
            id: exchangeId,
            vector: embedding,
            payload: {
              type: 'chat',                    // distingue notes et historique chat
              userId: session.user.id,
              sessionId,
              exchangeId,
              userMessage: userMessage.slice(0, 500),
              assistantMessage: assistantMessage.slice(0, 500),
              timestamp: timestamp ?? new Date().toISOString(),
            },
          }],
        }),
      }
    );

    if (!res.ok) {
      const err = await res.text();
      console.error('Qdrant chat history upsert error:', err);
      return NextResponse.json({ success: false }, { status: 502 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Chat history index error:', error);
    return NextResponse.json({ success: false, error: 'Indexation échouée' }, { status: 500 });
  }
}

// ─── GET /api/chat/history?query=...&topK=5 — chercher dans l'historique ──────
// Retourne les échanges passés les plus proches sémantiquement de la question.

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
  }

  if (!isConfigured()) {
    return NextResponse.json({ results: [] });
  }

  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query') ?? '';
    const topK  = Math.min(parseInt(searchParams.get('topK') ?? '5', 10), 10);

    if (!query.trim()) return NextResponse.json({ results: [] });

    const embedding = await getEmbedding(query, 'query');

    const res = await fetch(
      `${QDRANT_URL}/collections/${NOTES_COLL}/points/search`,
      {
        method: 'POST',
        headers: qdrantHeaders(),
        body: JSON.stringify({
          vector: embedding,
          limit: topK,
          with_payload: true,
          score_threshold: 0.55,   // ignorer les échanges trop peu pertinents
          filter: {
            must: [
              { key: 'type',   match: { value: 'chat' } },
              { key: 'userId', match: { value: session.user.id } },
            ],
          },
        }),
      }
    );

    if (!res.ok) return NextResponse.json({ results: [] });

    const data = await res.json();
    return NextResponse.json({ results: data.result ?? [] });
  } catch (error) {
    console.error('Chat history search error:', error);
    return NextResponse.json({ results: [] });
  }
}

// ─── DELETE /api/chat/history — supprimer l'historique d'une session ──────────
// Corps : { sessionId }
// Appelé quand l'utilisateur supprime une session de conversation.

export async function DELETE(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
  }

  if (!isConfigured()) {
    return NextResponse.json({ success: true }); // rien à supprimer
  }

  try {
    const { sessionId } = await request.json();

    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId requis' }, { status: 400 });
    }

    const res = await fetch(
      `${QDRANT_URL}/collections/${NOTES_COLL}/points/delete`,
      {
        method: 'POST',
        headers: qdrantHeaders(),
        body: JSON.stringify({
          filter: {
            must: [
              { key: 'type',      match: { value: 'chat' } },
              { key: 'userId',    match: { value: session.user.id } },
              { key: 'sessionId', match: { value: sessionId } },
            ],
          },
        }),
      }
    );

    if (!res.ok) return NextResponse.json({ success: false }, { status: 502 });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Chat history delete error:', error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
