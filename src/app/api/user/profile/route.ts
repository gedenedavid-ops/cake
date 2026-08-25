import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { User } from '@/models/User';

// ─── GET /api/user/profile — lit le profil complet (userType + learningProfile)
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
  }

  await connectDB();

  const user = await User.findById(session.user.id)
    .select('_id userType learningProfile name email image')
    .lean();

  if (!user) return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 });

  return NextResponse.json({ user });
}

// ─── PATCH /api/user/profile — met à jour userType ou learningProfile (partiel)
export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
  }

  await connectDB();

  const body = await request.json();
  const allowed: Record<string, unknown> = {};

  // Seuls ces champs sont patchables directement
  if (body.userType !== undefined) allowed.userType = body.userType;
  if (body.weakSubjects !== undefined) allowed['learningProfile.weakSubjects'] = body.weakSubjects;

  if (Object.keys(allowed).length === 0 && !body.studiedTopics) {
    return NextResponse.json({ error: 'Aucun champ valide fourni' }, { status: 400 });
  }

  // studiedTopics utilise $addToSet pour dédupliquer automatiquement
  const updateOp: Record<string, unknown> = {};
  if (Object.keys(allowed).length > 0) updateOp.$set = allowed;
  if (body.studiedTopics) {
    updateOp.$addToSet = {
      'learningProfile.studiedTopics': { $each: Array.isArray(body.studiedTopics) ? body.studiedTopics : [body.studiedTopics] },
    };
  }

  const updated = await User.findByIdAndUpdate(
    session.user.id,
    updateOp,
    { new: true, select: 'userType learningProfile', lean: true }
  );

  return NextResponse.json({ user: updated });
}
