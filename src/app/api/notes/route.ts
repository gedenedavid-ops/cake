import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { Note } from '@/models/Note';
import { countWords, estimateReadTime } from '@/lib/utils';

// ─── GET /api/notes — liste toutes les notes de l'utilisateur connecté ────────
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
  }

  await connectDB();

  const notes = await Note.find({ userId: session.user.id })
    .sort({ isPinned: -1, updatedAt: -1 })
    .lean();

  return NextResponse.json({ notes });
}

// ─── POST /api/notes — créer une nouvelle note ────────────────────────────────
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { title, content = '', subject, tags = [], mood, attachments = [],
            isLocked = false, isPinned = false, isFavorite = false, color = 'default' } = body;

    if (!title?.trim() || !subject) {
      return NextResponse.json({ error: 'Titre et matière requis' }, { status: 400 });
    }

    await connectDB();

    const note = await Note.create({
      userId:     session.user.id,
      title:      title.trim(),
      content,
      subject,
      tags,
      mood,
      attachments,
      isLocked,
      isPinned,
      isFavorite,
      color,
      wordCount:  countWords(content),
      readTime:   estimateReadTime(content),
    });

    return NextResponse.json({ note }, { status: 201 });
  } catch (error) {
    console.error('POST /api/notes error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
