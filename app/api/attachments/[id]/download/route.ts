import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { headers } from 'next/headers';
import { db } from '@/db';
import { attachments } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { downloadFileFromDrive } from '@/lib/google-drive';

/**
 * UUID v4 regex pattern for validation
 */
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Get authenticated user ID (supports E2E testing bypass)
 */
async function getAuthUserId(): Promise<string | null> {
  // Check for E2E test header
  try {
    const headerList = await headers();
    const isTest = headerList.get('x-e2e-test') === 'true';

    if (isTest) {
      return 'user_e2e_test_123';
    }
  } catch {
    // Fallback if headers() fails
  }

  const { userId } = await auth();
  return userId;
}

/**
 * GET /api/attachments/[id]/download
 *
 * Downloads an attachment file from Google Drive.
 * Requires authentication. Streams the file content with appropriate headers.
 *
 * @param request - Next.js request object
 * @param params - Route parameters containing attachment ID
 * @returns File content as binary response or error JSON
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Get authenticated user
    const userId = await getAuthUserId();

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized - You must be logged in to download files' },
        { status: 401 }
      );
    }

    // Get attachment ID from params
    const { id: attachmentId } = await params;

    // Validate UUID format to avoid unnecessary DB queries
    if (!attachmentId || !UUID_REGEX.test(attachmentId)) {
      return NextResponse.json(
        { error: 'Invalid attachment ID format' },
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
    let fileBuffer: Buffer;
    try {
      fileBuffer = await downloadFileFromDrive(attachment.driveFileId);
    } catch (driveError) {
      console.error('Error downloading from Google Drive:', driveError);
      return NextResponse.json(
        { error: 'Error al descargar archivo de Google Drive' },
        { status: 502 }
      );
    }

    // Sanitize filename for Content-Disposition header
    // Remove or replace characters that could cause issues
    const sanitizedFilename = attachment.name
      .replace(/[^\w\s.-]/g, '_')
      .replace(/\s+/g, '_');

    // Convert Buffer to Uint8Array for NextResponse compatibility
    const uint8Array = new Uint8Array(fileBuffer);

    // Return file with appropriate headers
    return new NextResponse(uint8Array, {
      status: 200,
      headers: {
        'Content-Type': attachment.mimeType,
        'Content-Length': uint8Array.length.toString(),
        'Content-Disposition': `attachment; filename="${sanitizedFilename}"`,
        'Cache-Control': 'private, max-age=3600',
      },
    });
  } catch (error) {
    console.error('Error in attachment download API:', error);
    return NextResponse.json(
      { error: 'Error inesperado al descargar el archivo' },
      { status: 500 }
    );
  }
}
