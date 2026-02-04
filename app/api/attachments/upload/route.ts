import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { headers } from 'next/headers';
import { db } from '@/db';
import { tasks, attachments } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { uploadFileToDrive, deleteFileFromDrive } from '@/lib/google-drive';

/**
 * Allowed MIME types for attachments
 */
const ALLOWED_MIME_TYPES = [
  // Images
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'image/bmp',
  'image/tiff',
  // Videos
  'video/mp4',
  'video/quicktime',
  'video/x-msvideo',
  'video/webm',
  'video/mpeg',
  // Documents
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  // Text/Code files
  'text/plain',
  'text/markdown',
  'text/x-markdown',
  'text/csv',
  'text/html',
  'text/css',
  'text/javascript',
  'application/json',
  'application/xml',
  // Fallback for files with valid extension but unrecognized MIME
  'application/octet-stream',
];

/**
 * Maximum file size in bytes (50MB)
 */
const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024;

/**
 * UUID v4 regex pattern for validation
 */
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Get authenticated user ID (supports E2E testing bypass in non-production)
 */
async function getAuthUserId(): Promise<string | null> {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    try {
      const headerList = await headers();
      const isTest = headerList.get('x-e2e-test') === 'true';

      if (isTest) {
        return 'user_e2e_test_123';
      }
    } catch {
      // Fallback if headers() fails
    }
  }

  const { userId } = await auth();
  return userId;
}

/**
 * POST /api/attachments/upload
 *
 * Uploads an attachment file to Google Drive using multipart/form-data.
 * This route handler supports large files (up to 50MB) without base64 encoding.
 *
 * @param request - Next.js request with FormData body
 * @returns JSON response with created attachment data or error
 */
export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const userId = await getAuthUserId();

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized - You must be logged in to upload attachments' },
        { status: 401 }
      );
    }

    // Parse FormData
    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid form data' },
        { status: 400 }
      );
    }

    // Extract fields
    const file = formData.get('file') as File | null;
    const taskId = formData.get('taskId') as string | null;

    // Validate required fields
    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { success: false, error: 'File is required' },
        { status: 400 }
      );
    }

    if (!taskId || typeof taskId !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Task ID is required' },
        { status: 400 }
      );
    }

    // Validate task ID format
    if (!UUID_REGEX.test(taskId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid task ID format' },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { success: false, error: 'El archivo excede el límite de 50MB' },
        { status: 400 }
      );
    }

    // Validate MIME type
    const mimeType = file.type || 'application/octet-stream';
    if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
      return NextResponse.json(
        { success: false, error: 'Tipo de archivo no permitido' },
        { status: 400 }
      );
    }

    // Validate filename
    const fileName = file.name;
    if (!fileName || fileName.length > 255) {
      return NextResponse.json(
        { success: false, error: 'Invalid file name' },
        { status: 400 }
      );
    }

    // Fetch the task to verify it exists and check status
    const [task] = await db
      .select()
      .from(tasks)
      .where(eq(tasks.id, taskId))
      .limit(1);

    if (!task) {
      return NextResponse.json(
        { success: false, error: 'Tarea no encontrada' },
        { status: 404 }
      );
    }

    // Note: We allow uploads to 'done' tasks to support the CompleteTaskModal flow
    // where files are uploaded AFTER the task is marked complete

    // Convert File to Buffer
    const arrayBuffer = await file.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);
    const sizeBytes = fileBuffer.length;

    // Upload to Google Drive
    let driveResult: { fileId: string };
    try {
      driveResult = await uploadFileToDrive(taskId, fileName, mimeType, fileBuffer);
    } catch (driveError) {
      console.error('Error uploading to Google Drive:', driveError);
      return NextResponse.json(
        { success: false, error: 'Error al subir archivo a Google Drive' },
        { status: 502 }
      );
    }

    // Create attachment record in database (inherit area from task)
    const [newAttachment] = await db
      .insert(attachments)
      .values({
        taskId,
        driveFileId: driveResult.fileId,
        name: fileName,
        mimeType,
        sizeBytes,
        uploadedBy: userId,
        area: task.area,
      })
      .returning();

    if (!newAttachment) {
      // Cleanup: delete the file from Drive if DB insert failed
      try {
        await deleteFileFromDrive(driveResult.fileId);
      } catch {
        console.error('Failed to cleanup Drive file after DB error');
      }
      return NextResponse.json(
        { success: false, error: 'Error al guardar información del adjunto' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: newAttachment,
    });
  } catch (error) {
    console.error('Error in attachment upload API:', error);
    return NextResponse.json(
      { success: false, error: 'Error inesperado al subir el archivo' },
      { status: 500 }
    );
  }
}

// Configure route for large file uploads
export const runtime = 'nodejs';
export const maxDuration = 60;
