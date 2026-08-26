import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

const QDRANT_URL        = process.env.QDRANT_URL ?? 'http://localhost:6333';
const QDRANT_API_KEY    = process.env.QDRANT_API_KEY;
const QDRANT_COLLECTION = process.env.QDRANT_COLLECTION ?? 'binlinpad_notes';
const VOYAGE_API_URL    = 'https://api.voyageai.com/v1/embeddings';

/**
 * Convertit un ObjectId MongoDB (24 hex chars) en UUID v4-like valide pour Qdrant.
 * Déterministe : le même noteId produit toujours le même UUID.
 * Format : xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
 */
function mongoIdToUUID(mongoId: string): string {
  // Pad ou tronque à 32 hex chars
  const hex = mongoId.replace(/-/g, '').padEnd(32, '0').slice(0, 32);
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    '4' + hex.slice(13, 16),          // version 4
    (parseInt(hex.slice(16, 17), 16) & 0x3 | 0x8).toString(16) + hex.slice(17, 20), // variant
    hex.slice(20, 32),
  ].join('-');
}

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
  const apiKey = process.env.VOYAGE_API_KEY;
  if (!apiKey) throw new Error('VOYAGE_API_KEY non configuré');

  const res = await fetch(VOYAGE_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({ input: [text], model: 'voyage-3', input_type: inputType }),
  });
  if (!res.ok) throw new Error(`Voyage AI error: ${res.status}`);
  const data = await res.json();
  return data.data[0].embedding as number[];
}

// ─── POST /api/search — recherche sémantique (filtrée par userId) ─────────────
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
  }

  if (!isConfigured()) {
    return NextResponse.json({ results: [], message: 'RAG non configuré' });
  }

  try {
    const { query, topK = 5 } = await request.json();

    const embedding = await getEmbedding(query, 'query');

    const res = await fetch(
      `${QDRANT_URL}/collections/${QDRANT_COLLECTION}/points/search`,
      {
        method: 'POST',
        headers: qdrantHeaders(),
        body: JSON.stringify({
          vector: embedding,
          limit: topK,
          with_payload: true,
          // Filtre multitenancy — seules les notes de cet utilisateur
          filter: {
            must: [{
              key: 'userId',
              match: { value: session.user.id },
            }],
          },
        }),
      }
    );

    if (!res.ok) {
      const err = await res.text();
      console.error('Qdrant search error:', err);
      return NextResponse.json({ results: [], error: 'Recherche vectorielle échouée' }, { status: 502 });
    }

    const data = await res.json();
    return NextResponse.json({ results: data.result ?? [] });
  } catch (error) {
    console.error('Search API error:', error);
    return NextResponse.json({ results: [], error: 'Erreur de recherche' }, { status: 500 });
  }
}

// ─── PUT /api/search — indexer une note dans Qdrant ───────────────────────────
export async function PUT(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
  }

  if (!isConfigured()) {
    return NextResponse.json({ success: false, message: 'RAG non configuré' });
  }

  try {
    const { noteId, title, content, subject } = await request.json();

    const text = `${title}\n${content}`;
    const embedding = await getEmbedding(text, 'document');

    // Qdrant n'accepte que UUID ou entier — on dérive un UUID v5 depuis l'ObjectId
    const qdrantId = mongoIdToUUID(noteId);

    const res = await fetch(
      `${QDRANT_URL}/collections/${QDRANT_COLLECTION}/points`,
      {
        method: 'PUT',
        headers: qdrantHeaders(),
        body: JSON.stringify({
          points: [{
            id: qdrantId,
            vector: embedding,
            payload: {
              noteId,
              userId: session.user.id,   // champ tenant Qdrant
              title,
              content: content.slice(0, 500),
              subject,
            },
          }],
        }),
      }
    );

    if (!res.ok) {
      const err = await res.text();
      console.error('Qdrant upsert error:', err);
      return NextResponse.json({ success: false }, { status: 502 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Upsert error:', error);
    return NextResponse.json({ success: false, error: 'Indexation échouée' }, { status: 500 });
  }
}

// ─── DELETE /api/search — supprimer le vecteur d'une note ─────────────────────
export async function DELETE(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
  }

  if (!isConfigured()) {
    return NextResponse.json({ success: false, message: 'RAG non configuré' });
  }

  try {
    const { noteId } = await request.json();

    // Sécurité : vérifier que le point appartient bien à cet utilisateur
    // avant de le supprimer (filtre sur userId dans le payload)
    const res = await fetch(
      `${QDRANT_URL}/collections/${QDRANT_COLLECTION}/points/delete`,
      {
        method: 'POST',
        headers: qdrantHeaders(),
        body: JSON.stringify({
          filter: {
            must: [
              { key: 'noteId', match: { value: noteId } },
              { key: 'userId', match: { value: session.user.id } },
            ],
          },
        }),
      }
    );

    if (!res.ok) return NextResponse.json({ success: false }, { status: 502 });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete embedding error:', error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
