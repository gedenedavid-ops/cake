import { NextResponse } from 'next/server';

const QDRANT_URL     = process.env.QDRANT_URL ?? 'http://localhost:6333';
const QDRANT_API_KEY = process.env.QDRANT_API_KEY;
const NOTES_COLL     = process.env.QDRANT_COLLECTION ?? 'binlinpad_notes';

// Durée de rétention de l'historique chat vectorisé : 12 mois
const RETENTION_MONTHS = 12;

function qdrantHeaders(): HeadersInit {
  const h: HeadersInit = { 'Content-Type': 'application/json' };
  if (QDRANT_API_KEY) h['api-key'] = QDRANT_API_KEY;
  return h;
}

// ─── GET /api/cron/purge-history ──────────────────────────────────────────────
// Appelé automatiquement par Vercel Cron (voir vercel.json).
// Supprime de Qdrant tous les échanges chat plus vieux que RETENTION_MONTHS.
// Protégé par CRON_SECRET pour éviter les appels non autorisés.

export async function GET(request: Request) {
  // Vérification du secret Vercel Cron
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  if (!QDRANT_API_KEY) {
    return NextResponse.json({ skipped: true, reason: 'Qdrant non configuré' });
  }

  // Calcul du seuil : timestamp ISO de la date limite
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - RETENTION_MONTHS);
  const cutoffIso = cutoff.toISOString();

  try {
    // Qdrant supporte le filtre sur les champs string avec range
    // On supprime tous les points de type "chat" dont le timestamp est antérieur au seuil
    const res = await fetch(
      `${QDRANT_URL}/collections/${NOTES_COLL}/points/delete`,
      {
        method: 'POST',
        headers: qdrantHeaders(),
        body: JSON.stringify({
          filter: {
            must: [
              { key: 'type', match: { value: 'chat' } },
              {
                key: 'timestamp',
                range: { lt: cutoffIso },   // lt = less than (plus vieux que)
              },
            ],
          },
        }),
      }
    );

    if (!res.ok) {
      const err = await res.text();
      console.error('Purge Qdrant error:', err);
      return NextResponse.json({ success: false, error: err }, { status: 502 });
    }

    const data = await res.json();
    const deleted = data.result?.operation_id ?? 'ok';

    console.log(`[cron/purge-history] Purge terminée — échanges > ${RETENTION_MONTHS} mois supprimés (op: ${deleted})`);

    return NextResponse.json({
      success: true,
      cutoff: cutoffIso,
      retentionMonths: RETENTION_MONTHS,
      operation: deleted,
    });
  } catch (error) {
    console.error('Purge cron error:', error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
