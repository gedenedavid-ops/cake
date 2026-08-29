import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

// Gemini 2.0 Flash — rapide, multimodal, gratuit jusqu'à 1500 req/jour
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

// ─── POST /api/ocr ─────────────────────────────────────────────────────────────
// Corps : { imageBase64: string, mimeType: 'image/jpeg' | 'image/png' | 'image/webp' }
// Retourne : { text: string }
//
// L'image est envoyée directement à Gemini Vision en inline data.
// Aucune donnée n'est stockée — traitement à la volée uniquement.

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'GEMINI_API_KEY non configuré — ajoute-la dans .env.local' },
      { status: 503 }
    );
  }

  let imageBase64: string;
  let mimeType: string;

  try {
    const body = await request.json();
    imageBase64 = body.imageBase64;
    mimeType    = body.mimeType ?? 'image/jpeg';

    if (!imageBase64) {
      return NextResponse.json({ error: 'imageBase64 requis' }, { status: 400 });
    }

    // Taille max : ~4 Mo en base64 ≈ ~3 Mo en binaire
    if (imageBase64.length > 5_500_000) {
      return NextResponse.json({ error: 'Image trop grande (max ~4 Mo)' }, { status: 413 });
    }
  } catch {
    return NextResponse.json({ error: 'Corps invalide' }, { status: 400 });
  }

  const prompt = `Tu es un assistant OCR spécialisé dans les notes manuscrites scolaires en français.

Transcris EXACTEMENT le texte écrit sur cette image, en :
- Respectant les sauts de ligne et la structure (titres, listes, numérotations)
- Conservant les formules mathématiques telles quelles
- Signalant les passages illisibles par [illisible]
- NE rajoutant AUCUN texte qui n'est pas dans l'image
- NE faisant AUCUN commentaire, retourne uniquement le texte transcrit`;

  try {
    const res = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: prompt },
            {
              inline_data: {
                mime_type: mimeType,
                data: imageBase64,
              },
            },
          ],
        }],
        generationConfig: {
          temperature: 0.1,   // basse température = fidélité maximale
          maxOutputTokens: 2048,
        },
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error('[OCR] Gemini error:', err);

      // Quota dépassé → message explicite
      if (res.status === 429) {
        return NextResponse.json(
          { error: 'Quota Gemini dépassé — réessaie dans quelques secondes.' },
          { status: 429 }
        );
      }
      return NextResponse.json({ error: 'Gemini Vision indisponible' }, { status: 502 });
    }

    const data = await res.json();
    const text: string =
      data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

    if (!text.trim()) {
      return NextResponse.json(
        { error: 'Aucun texte détecté dans l\'image.' },
        { status: 422 }
      );
    }

    return NextResponse.json({ text: text.trim() });

  } catch (error) {
    console.error('[OCR] error:', error);
    return NextResponse.json({ error: 'Erreur OCR' }, { status: 500 });
  }
}
