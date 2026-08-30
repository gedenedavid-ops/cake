import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { auth } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { User } from '@/models/User';
import { Note } from '@/models/Note';
import { ChatSessionModel } from '@/models/ChatSession';

const QDRANT_URL        = process.env.QDRANT_URL ?? '';
const QDRANT_API_KEY    = process.env.QDRANT_API_KEY ?? '';
const QDRANT_COLLECTION = process.env.QDRANT_COLLECTION ?? 'binlinpad_notes';

function qdrantHeaders() {
  return { 'Content-Type': 'application/json', 'api-key': QDRANT_API_KEY };
}

// ─── DELETE /api/user/account — supprime toutes les données d'un utilisateur ──
// Supprime dans l'ordre : vecteurs Qdrant → notes MongoDB → sessions → user.
// Si Qdrant échoue, on continue quand même (non bloquant).

export async function DELETE() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
  }

  const uid = session.user.id;

  // ── 1. Supprimer tous les vecteurs de l'utilisateur dans Qdrant ──────────────
  if (QDRANT_URL && QDRANT_API_KEY) {
    try {
      await fetch(`${QDRANT_URL}/collections/${QDRANT_COLLECTION}/points/delete`, {
        method: 'POST',
        headers: qdrantHeaders(),
        body: JSON.stringify({
          filter: { must: [{ key: 'userId', match: { value: uid } }] },
        }),
      });
    } catch {
      // Non bloquant — les vecteurs orphelins seront purgés par le cron
    }
  }

  // ── 2. Supprimer les données MongoDB ─────────────────────────────────────────
  await connectDB();
  const oid = new mongoose.Types.ObjectId(uid);

  await Promise.all([
    Note.deleteMany({ userId: oid }),
    ChatSessionModel.deleteMany({ userId: oid }),
    // SpeakRequests — collection inline dans wellbeing/speak-request/route.ts
    mongoose.models.SpeakRequest?.deleteMany({ userId: oid }),
    User.findByIdAndDelete(oid),
  ]);

  return NextResponse.json({ success: true });
}
