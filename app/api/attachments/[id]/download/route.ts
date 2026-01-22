import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from '@/lib/mock-auth';
import { db } from '@/db';
import { attachments } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { downloadFileFromDrive } from '@/lib/google-drive';

/**
 * GET handler for downloading an attachment from Google Drive
 *
 * Validates user authentication, fetches attachment metadata from DB,
 * downloads file from Drive, and streams it back with appropriate headers.
 *
 * @param req - Next.js request object
 * @param params - Route params containing attachment ID
 * @returns File stream response or error JSON
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Get authenticated user
    const { userId } = await getAuth();

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized - You must be logged in to download attachments' },
        { status: 401 }
      );
    }

    const { id: attachmentId } = await params;

    // Validate attachment ID format (UUID)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(attachmentId)) {
      return NextResponse.json(
        { error: 'Invalid attachment ID' },
        { status: 400 }
      );
    }

    // Fetch attachment from database
    const [attachment] = await db
      .select()
      .from(attachments)
      .where(eq(attachments.id, attachmentId))
      .limit(1);

    if (!attachment) {
      return NextResponse.json(
        { error: 'Adjunto no encontrado' },
        { status: 404 }
      );
    }

    // Download file from Google Drive
    const fileBuffer = await downloadFileFromDrive(attachment.driveFileId);

    // Create response with file stream and appropriate headers
    // Convert Buffer to Uint8Array for NextResponse compatibility
    const response = new NextResponse(new Uint8Array(fileBuffer), {
      status: 200,
      headers: {
        'Content-Type': attachment.mimeType,
        'Content-Length': fileBuffer.length.toString(),
        'Content-Disposition': `attachment; filename="${encodeURIComponent(attachment.name)}"`,
        'Cache-Control': 'private, no-cache',
      },
    });

    return response;
  } catch (error) {
    console.error('Error downloading attachment:', error);
    return NextResponse.json(
      { error: 'Error al descargar el archivo' },
      { status: 500 }
    );
  }
}
