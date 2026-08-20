import { NextResponse } from 'next/server';

const DEEPSEEK_API_URL = 'https://api.deepseek.com/chat/completions';

const SYSTEM_PROMPT = `Tu es Cake, un tuteur personnel bienveillant, patient et encourageant, conçu pour aider les étudiants francophones.
Ta mission : aider les élèves à comprendre leurs propres notes, simplifier les concepts académiques complexes, créer des quiz d'entraînement et réduire l'anxiété des examens.

Directives :
- Réponds TOUJOURS en français, quelle que soit la langue de la question
- Sois chaleureux, encourageant et patient — jamais condescendant
- Pour expliquer un concept, utilise des analogies, des exemples concrets et des étapes claires
- Pour un quiz, numérote les questions et cache les réponses jusqu'à ce qu'on te les demande
- Appuie-toi sur les notes de l'élève fournies en contexte quand elles sont disponibles
- Garde tes réponses concises et digestes — évite les murs de texte
- Félicite l'effort et les progrès, normalise la confusion comme une étape normale de l'apprentissage
- Ne fais jamais sentir à l'élève qu'il est nul ou incapable
- Termine tes réponses par une question de suivi douce ou un encouragement`;

export async function POST(request: Request) {
  try {
    const { messages, context, query } = await request.json();

    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      // Demo mode: return a helpful placeholder response
      return NextResponse.json({
        message: `Hi! I'm Cake, your personal study tutor 🎓\n\nI noticed you asked: "${query}"\n\nTo enable AI responses, add your **DEEPSEEK_API_KEY** to your .env.local file. Once configured, I'll be able to:\n\n• Answer questions about your notes\n• Create custom quizzes\n• Explain complex concepts simply\n• Help you build revision plans\n\nYou've got this! 💪`,
        sources: [],
      });
    }

    // Build context string from retrieved notes
    let contextBlock = '';
    if (context && context.length > 0) {
      contextBlock = '\n\n--- STUDENT\'S RELEVANT NOTES ---\n';
      contextBlock += context.map((item: { payload: { title: string; subject: string; content: string }; score: number }) =>
        `[${item.payload.subject}] ${item.payload.title}:\n${item.payload.content}`
      ).join('\n\n---\n');
      contextBlock += '\n--- END OF NOTES ---\n';
    }

    const systemMsg = {
      role: 'system',
      content: SYSTEM_PROMPT + contextBlock,
    };

    const response = await fetch(DEEPSEEK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [systemMsg, ...messages],
        temperature: 0.7,
        max_tokens: 1500,
        stream: false,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('DeepSeek error:', err);
      return NextResponse.json(
        { message: 'AI service temporarily unavailable. Please try again.' },
        { status: 502 }
      );
    }

    const data = await response.json();
    const message = data.choices?.[0]?.message?.content ?? 'No response generated.';

    return NextResponse.json({ message, sources: [] });
  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { message: 'An unexpected error occurred.' },
      { status: 500 }
    );
  }
}
