'use server';

import { getAuth } from '@/lib/mock-auth';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { db } from '@/db';
import { attachments, tasks } from '@/db/schema';
import { eq } from 'drizzle-orm';
import {
  uploadFileToDrive,
  deleteFileFromDrive,
} from '@/lib/google-drive';

/**
 * Standardized action response type
 */
type ActionResponse<T = unknown> = {
  success: boolean;
  data?: T;
  error?: string;
};

/**
 * Allowed MIME types for attachments
 * Images, Videos, and Documents as defined in spec
 */
const ALLOWED_MIME_TYPES = [
  // Images
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  // Videos
  'video/mp4',
  'video/quicktime', // .mov
  'video/x-msvideo', // .avi
  'video/webm',
  // Documents
  'application/pdf',
  'application/msword', // .doc
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  'application/vnd.ms-excel', // .xls
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
  'application/vnd.ms-powerpoint', // .ppt
  'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx
  'text/plain', // .txt
  'text/markdown', // .md
];

/**
 * Zod schema for uploading an attachment
 */
const uploadAttachmentSchema = z.object({
  taskId: z.string().uuid('Invalid task ID'),
  fileName: z.string().min(1, 'File name is required'),
  mimeType: z.string().refine(
    (type) => ALLOWED_MIME_TYPES.includes(type),
    'Tipo de archivo no soportado'
  ),
  sizeBytes: z.number().positive('File size must be positive'),
});

/**
 * Zod schema for deleting an attachment
 */
const deleteAttachmentSchema = z.object({
  attachmentId: z.string().uuid('Invalid attachment ID'),
});

/**
 * Zod schema for getting task attachments
 */
const getTaskAttachmentsSchema = z.object({
  taskId: z.string().uuid('Invalid task ID'),
});

/**
 * Server Action: Upload an attachment to a task
 *
 * Uploads a file to Google Drive under the task's folder and creates
 * a record in the attachments table.
 * Blocked if task status is 'done'.
 *
 * @param input - Attachment metadata (taskId, fileName, mimeType, sizeBytes)
 * @param fileData - Base64 encoded file data
 * @returns ActionResponse with created attachment data or error message
 */
export async function uploadAttachment(
  input: z.infer<typeof uploadAttachmentSchema>,
  fileData: string
): Promise<ActionResponse<typeof attachments.$inferSelect>> {
  try {
    // Get authenticated user
    const { userId } = await getAuth();

    if (!userId) {
      return {
        success: false,
        error: 'Unauthorized - You must be logged in to upload attachments',
      };
    }

    // Validate input
    const validationResult = uploadAttachmentSchema.safeParse(input);

    if (!validationResult.success) {
      return {
        success: false,
        error: validationResult.error.issues[0]?.message || 'Invalid input',
      };
    }

    const { taskId, fileName, mimeType, sizeBytes } = validationResult.data;

    // Fetch the task to verify it exists and check status
    const [task] = await db
      .select()
      .from(tasks)
      .where(eq(tasks.id, taskId))
      .limit(1);

    if (!task) {
      return {
        success: false,
        error: 'Tarea no encontrada',
      };
    }

    // Block uploads for completed tasks
    if (task.status === 'done') {
      return {
        success: false,
        error: 'No se pueden agregar adjuntos a tareas completadas',
      };
    }

    // Decode base64 file data
    const fileBuffer = Buffer.from(fileData, 'base64');

    // Upload to Google Drive
    const driveFileId = await uploadFileToDrive(taskId, fileName, mimeType, fileBuffer);

    // Create attachment record in database
    const [newAttachment] = await db
      .insert(attachments)
      .values({
        taskId,
        driveFileId,
        name: fileName,
        mimeType,
        sizeBytes,
        uploadedBy: userId,
      })
      .returning();

    if (!newAttachment) {
      // If DB insert fails, try to clean up the uploaded file
      try {
        await deleteFileFromDrive(driveFileId);
      } catch {
        console.error('Failed to cleanup Drive file after DB insert failure');
      }
      return {
        success: false,
        error: 'Error al guardar el adjunto',
      };
    }

    // Revalidate relevant paths
    revalidatePath('/');
    revalidatePath('/kanban');

    return {
      success: true,
      data: newAttachment,
    };
  } catch (error) {
    console.error('Error uploading attachment:', error);
    return {
      success: false,
      error: 'Error al subir el archivo',
    };
  }
}

/**
 * Server Action: Delete an attachment
 *
 * Deletes a file from Google Drive and removes the record from the database.
 * Blocked if task status is 'done'.
 *
 * @param input - Attachment ID to delete
 * @returns ActionResponse with success status or error message
 */
export async function deleteAttachment(
  input: z.infer<typeof deleteAttachmentSchema>
): Promise<ActionResponse<{ attachmentId: string }>> {
  try {
    // Get authenticated user
    const { userId } = await getAuth();

    if (!userId) {
      return {
        success: false,
        error: 'Unauthorized - You must be logged in to delete attachments',
      };
    }

    // Validate input
    const validationResult = deleteAttachmentSchema.safeParse(input);

    if (!validationResult.success) {
      return {
        success: false,
        error: validationResult.error.issues[0]?.message || 'Invalid input',
      };
    }

    const { attachmentId } = validationResult.data;

    // Fetch the attachment with its task to verify status
    const [attachment] = await db
      .select({
        id: attachments.id,
        driveFileId: attachments.driveFileId,
        taskId: attachments.taskId,
        taskStatus: tasks.status,
      })
      .from(attachments)
      .innerJoin(tasks, eq(attachments.taskId, tasks.id))
      .where(eq(attachments.id, attachmentId))
      .limit(1);

    if (!attachment) {
      return {
        success: false,
        error: 'Adjunto no encontrado',
      };
    }

    // Block deletions for completed tasks
    if (attachment.taskStatus === 'done') {
      return {
        success: false,
        error: 'No se pueden eliminar adjuntos de tareas completadas',
      };
    }

    // Delete from Google Drive first
    try {
      await deleteFileFromDrive(attachment.driveFileId);
    } catch (driveError) {
      console.error('Error deleting from Drive:', driveError);
      // Continue with DB deletion even if Drive delete fails
      // The cleanup cron will handle orphaned files
    }

    // Delete from database
    await db
      .delete(attachments)
      .where(eq(attachments.id, attachmentId));

    // Revalidate relevant paths
    revalidatePath('/');
    revalidatePath('/kanban');

    return {
      success: true,
      data: { attachmentId },
    };
  } catch (error) {
    console.error('Error deleting attachment:', error);
    return {
      success: false,
      error: 'Error al eliminar el adjunto',
    };
  }
}

/**
 * Server Action: Get all attachments for a task
 *
 * Returns a list of all attachments associated with a task.
 *
 * @param input - Task ID to get attachments for
 * @returns ActionResponse with array of attachments or error message
 */
export async function getTaskAttachments(
  input: z.infer<typeof getTaskAttachmentsSchema>
): Promise<ActionResponse<(typeof attachments.$inferSelect)[]>> {
  try {
    // Get authenticated user
    const { userId } = await getAuth();

    if (!userId) {
      return {
        success: false,
        error: 'Unauthorized - You must be logged in to view attachments',
      };
    }

    // Validate input
    const validationResult = getTaskAttachmentsSchema.safeParse(input);

    if (!validationResult.success) {
      return {
        success: false,
        error: validationResult.error.issues[0]?.message || 'Invalid input',
      };
    }

    const { taskId } = validationResult.data;

    // Verify task exists
    const [task] = await db
      .select({ id: tasks.id })
      .from(tasks)
      .where(eq(tasks.id, taskId))
      .limit(1);

    if (!task) {
      return {
        success: false,
        error: 'Tarea no encontrada',
      };
    }

    // Fetch all attachments for the task
    const taskAttachments = await db
      .select()
      .from(attachments)
      .where(eq(attachments.taskId, taskId))
      .orderBy(attachments.uploadedAt);

    return {
      success: true,
      data: taskAttachments,
    };
  } catch (error) {
    console.error('Error getting attachments:', error);
    return {
      success: false,
      error: 'Error al obtener los adjuntos',
    };
  }
}
