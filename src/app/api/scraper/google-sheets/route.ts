import { NextRequest, NextResponse } from 'next/server';
import { sendJobToSheets } from '@/lib/sendToSheets';

export async function POST(request: NextRequest) {
  try {
    const { jobId, webhookUrl } = await request.json();
    if (!jobId) return NextResponse.json({ error: 'jobId requis' }, { status: 400 });

    const result = await sendJobToSheets(jobId, webhookUrl);
    if (!result.success) return NextResponse.json({ error: result.error }, { status: result.error === 'Job non trouvé' ? 404 : 502 });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error sending to Google Sheets:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
