import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import mongoose, { Schema, model, models } from 'mongoose';

// ─── Schéma minimal — aucune donnée sensible, aucun contenu de note ───────────
// On stocke uniquement : l'id utilisateur (pour que le conseiller puisse le contacter)
// et la date de la demande. Rien d'autre.

const SpeakRequestSchema = new Schema(
  {
    userId:      { type: Schema.Types.ObjectId, ref: 'User', required: true },
    requestedAt: { type: Date, default: Date.now },
    handled:     { type: Boolean, default: false },
  },
  { versionKey: false }
);

const SpeakRequest =
  models.SpeakRequest ?? model('SpeakRequest', SpeakRequestSchema);

// ─── POST /api/wellbeing/speak-request ────────────────────────────────────────
// Déclenché uniquement par l'élève lui-même. L'app ne décide rien.
// Transmet une demande explicite de contact — c'est tout.

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
  }

  await connectDB();

  // Éviter les doublons : si une demande non traitée existe déjà, ne pas créer
  const existing = await SpeakRequest.findOne({
    userId: new mongoose.Types.ObjectId(session.user.id),
    handled: false,
  }).lean();

  if (!existing) {
    await SpeakRequest.create({
      userId: new mongoose.Types.ObjectId(session.user.id),
    });
  }

  return NextResponse.json({ success: true });
}
