import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { appSettings } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { DEFAULT_AI_MODEL } from '@/lib/aiModels';

const SETTINGS_ID = 'global';

// La clé API n'est jamais renvoyée au client, seule sa présence l'est.
export async function GET() {
  try {
    const [row] = await db.select().from(appSettings).where(eq(appSettings.id, SETTINGS_ID));
    return NextResponse.json({
      hasApiKey: Boolean(row?.openrouterApiKey),
      aiModel: row?.aiModel || DEFAULT_AI_MODEL,
    });
  } catch (error) {
    console.error('Error fetching settings:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const now = new Date().toISOString();

    const [existing] = await db.select().from(appSettings).where(eq(appSettings.id, SETTINGS_ID));

    let openrouterApiKey = existing?.openrouterApiKey ?? null;
    if (body.clearApiKey) {
      openrouterApiKey = null;
    } else if (typeof body.apiKey === 'string' && body.apiKey.trim() !== '') {
      openrouterApiKey = body.apiKey.trim();
    }

    const aiModel = typeof body.aiModel === 'string' && body.aiModel.trim() !== '' ? body.aiModel.trim() : DEFAULT_AI_MODEL;

    if (existing) {
      await db.update(appSettings)
        .set({ openrouterApiKey, aiModel, updatedAt: now })
        .where(eq(appSettings.id, SETTINGS_ID));
    } else {
      await db.insert(appSettings).values({ id: SETTINGS_ID, openrouterApiKey, aiModel, updatedAt: now });
    }

    return NextResponse.json({ hasApiKey: Boolean(openrouterApiKey), aiModel });
  } catch (error) {
    console.error('Error updating settings:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
