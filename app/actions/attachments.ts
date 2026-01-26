'use server';

import { getAuth } from '@/lib/mock-auth';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { db } from '@/db';
import { tasks, attachments } from '@/db/schema';
import { eq } from 'drizzle-orm';
import {
  uploadFileToDrive,
  deleteFileFromDrive,
  deleteTaskFolder,
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
 */
const ALLOWED_MIME_TYPES = [
  // Images
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  // Videos
  'video/mp4',
  'video/quicktime',
  'video/x-msvideo',
  'video/webm',
  // Documents
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'text/markdown',
];

/**
 * Zod schema for uploading an attachment
 */
const uploadAttachmentSchema = z.object({
  taskId: z.string().uuid('Invalid task ID'),
  fileName: z.string().min(1, 'File name is required').max(255, 'File name too long'),
  mimeType: z.string().refine(
    (type) => ALLOWED_MIME_TYPES.includes(type),
    'Tipo de archivo no permitido'
  ),
  fileBase64: z.string().min(1, 'File content is required'),
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
 * Uploads a file to Google Drive and creates a record in the attachments table.
 * Blocks upload if the task is in 'done' status.
 *
 * @param input - Task ID, file name, MIME type, and base64-encoded file content
 * @returns ActionResponse with created attachment data or error message
 */
export async function uploadAttachment(
  input: z.infer<typeof uploadAttachmentSchema>
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

    const { taskId, fileName, mimeType, fileBase64 } = validationResult.data;

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

    // Block uploads for tasks in 'done' status
    if (task.status === 'done') {
      return {
        success: false,
        error: 'No se pueden agregar adjuntos a tareas completadas',
      };
    }

    // Convert base64 to Buffer
    const fileBuffer = Buffer.from(fileBase64, 'base64');
    const sizeBytes = fileBuffer.length;

    // Upload to Google Drive
    let driveResult: { fileId: string };
    try {
      driveResult = await uploadFileToDrive(taskId, fileName, mimeType, fileBuffer);
    } catch (driveError) {
      console.error('Error uploading to Google Drive:', driveError);
      return {
        success: false,
        error: 'Error al subir archivo a Google Drive',
      };
    }

    // Create attachment record in database
    const [newAttachment] = await db
      .insert(attachments)
      .values({
        taskId,
        driveFileId: driveResult.fileId,
        name: fileName,
        mimeType,
        sizeBytes,
        uploadedBy: userId,
      })
      .returning();

    if (!newAttachment) {
      // Cleanup: delete the file from Drive if DB insert failed
      try {
        await deleteFileFromDrive(driveResult.fileId);
      } catch {
        console.error('Failed to cleanup Drive file after DB error');
      }
      return {
        success: false,
        error: 'Error al guardar información del adjunto',
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
      error: 'Error inesperado al subir el archivo',
    };
  }
}

/**
 * Server Action: Delete an attachment
 *
 * Removes an attachment from both Google Drive and the database.
 * Blocks deletion if the task is in 'done' status.
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

    // Fetch the attachment with its associated task
    const [attachment] = await db
      .select({
        attachment: attachments,
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

    // Block deletion for tasks in 'done' status
    if (attachment.taskStatus === 'done') {
      return {
        success: false,
        error: 'No se pueden eliminar adjuntos de tareas completadas',
      };
    }

    // Delete from Google Drive first
    try {
      await deleteFileFromDrive(attachment.attachment.driveFileId);
    } catch (driveError) {
      console.error('Error deleting from Google Drive:', driveError);
      // Continue with DB deletion even if Drive deletion fails
      // (file might have been manually deleted or doesn't exist)
    }

    // Delete from database
    await db.delete(attachments).where(eq(attachments.id, attachmentId));

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
      error: 'Error inesperado al eliminar el archivo',
    };
  }
}

/**
 * Server Action: Get all attachments for a task
 *
 * Retrieves all attachment metadata for a specific task.
 *
 * @param input - Task ID to fetch attachments for
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
    console.error('Error fetching attachments:', error);
    return {
      success: false,
      error: 'Error inesperado al obtener los adjuntos',
    };
  }
}

/**
 * Server Action: Delete all attachments for a task
 *
 * Internal function used when a task is deleted or for cleanup.
 * Deletes the entire task folder in Google Drive and all DB records.
 *
 * @param taskId - Task ID to delete attachments for
 * @returns ActionResponse with success status
 */
export async function deleteAllTaskAttachments(
  taskId: string
): Promise<ActionResponse<{ count: number }>> {
  try {
    // Delete all attachment records from DB first (to get count)
    const deletedAttachments = await db
      .delete(attachments)
      .where(eq(attachments.taskId, taskId))
      .returning({ id: attachments.id });

    // Delete the task folder from Google Drive
    try {
      await deleteTaskFolder(taskId);
    } catch (driveError) {
      console.error('Error deleting task folder from Google Drive:', driveError);
      // Continue even if Drive deletion fails
    }

    return {
      success: true,
      data: { count: deletedAttachments.length },
    };
  } catch (error) {
    console.error('Error deleting task attachments:', error);
    return {
      success: false,
      error: 'Error inesperado al eliminar adjuntos de la tarea',
    };
  }
}
