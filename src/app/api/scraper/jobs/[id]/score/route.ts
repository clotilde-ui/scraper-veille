import { NextRequest, NextResponse } from 'next/server';
import { scoreJobBatch } from '@/lib/aiScore';

// Laisse le temps au lot de s'exécuter (plusieurs appels LLM).
export const maxDuration = 60;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    let limit = 10;
    try {
      const body = await request.json();
      if (body?.limit) limit = Math.min(Math.max(Number(body.limit) || 10, 1), 25);
    } catch {
      // pas de corps : on garde la valeur par défaut
    }

    const result = await scoreJobBatch(id, limit);

    if (result.error) {
      return NextResponse.json(
        { error: result.error, scored: result.scored, remaining: result.remaining },
        { status: result.error.startsWith('CONFIG:') ? 400 : 502 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Erreur scoring IA:', error);
    return NextResponse.json({ error: (error as Error).message || 'Erreur serveur' }, { status: 500 });
  }
}
