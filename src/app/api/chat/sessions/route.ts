import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { ChatSessionModel } from '@/models/ChatSession';
import { User } from '@/models/User';

// ─── GET /api/chat/sessions — liste toutes les sessions de l'utilisateur ───────
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
  }

  await connectDB();

  const sessions = await ChatSessionModel.find({ userId: session.user.id })
    .sort({ updatedAt: -1 })
    .limit(20)   // on ne charge que les 20 dernières sessions
    .lean();

  return NextResponse.json({ sessions });
}

// ─── POST /api/chat/sessions — créer ou mettre à jour une session ──────────────
// Corps : { sessionId?, title?, messages[], summary? }
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
  }

  await connectDB();

  const body = await request.json();
  const { sessionId, title, messages, summary } = body;

  if (sessionId) {
    // Mise à jour d'une session existante (upsert)
    const updated = await ChatSessionModel.findOneAndUpdate(
      { _id: sessionId, userId: session.user.id },
      { $set: { title, messages, ...(summary ? { summary } : {}) } },
      { new: true, lean: true }
    );
    if (!updated) {
      return NextResponse.json({ error: 'Session introuvable' }, { status: 404 });
    }
    return NextResponse.json({ session: updated });
  }

  // Création d'une nouvelle session
  const created = await ChatSessionModel.create({
    userId:   session.user.id,
    title:    title ?? 'Nouvelle conversation',
    messages: messages ?? [],
  });

  // Incrémenter le compteur de sessions dans le profil d'apprentissage
  await User.updateOne(
    { _id: session.user.id },
    {
      $inc: { 'learningProfile.totalSessions': 1 },
      $set: { 'learningProfile.lastActiveAt': new Date() },
    }
  );

  return NextResponse.json({ session: created }, { status: 201 });
}

// ─── DELETE /api/chat/sessions — supprimer une session ───────────────────────
// Corps : { sessionId }
export async function DELETE(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
  }

  await connectDB();

  const { sessionId } = await request.json();
  await ChatSessionModel.deleteOne({ _id: sessionId, userId: session.user.id });
  return NextResponse.json({ success: true });
}
