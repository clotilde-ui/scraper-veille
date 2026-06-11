import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { scrapeUrls } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const updateData: Record<string, unknown> = {};

    if (body.status !== undefined) updateData.status = body.status;
    if (body.httpStatus !== undefined) updateData.httpStatus = body.httpStatus;
    if (body.http_status !== undefined) updateData.httpStatus = body.http_status;
    if (body.errorMessage !== undefined) updateData.errorMessage = body.errorMessage;
    if (body.error_message !== undefined) updateData.errorMessage = body.error_message;
    if (body.pageTitle !== undefined) updateData.pageTitle = body.pageTitle;
    if (body.page_title !== undefined) updateData.pageTitle = body.page_title;
    if (body.scrapedAt !== undefined) updateData.scrapedAt = body.scrapedAt;
    if (body.scraped_at !== undefined) updateData.scrapedAt = body.scraped_at;

    await db.update(scrapeUrls).set(updateData).where(eq(scrapeUrls.id, id));

    const [updated] = await db.select().from(scrapeUrls).where(eq(scrapeUrls.id, id));

    if (!updated) {
      return NextResponse.json({ error: 'URL non trouvée' }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating url:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
