import { NextResponse } from 'next/server';
import { db } from '@/db';
import { tasks, attachments } from '@/db/schema';
import { eq, and, lte, isNotNull } from 'drizzle-orm';
import { deleteFileFromDrive, deleteTaskFolder } from '@/lib/google-drive';

/**
 * Cron job to cleanup attachments from tasks completed more than 3 days ago
 * Scheduled to run at 3am UTC daily via vercel.json
 */
export async function GET(req: Request) {
  // Validate CRON_SECRET
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.error('CRON_SECRET is not configured');
    return NextResponse.json(
      { error: 'Server configuration error' },
      { status: 500 }
    );
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    // Calculate the cutoff date (3 days ago)
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 3);

    // Find tasks that are done and completed more than 3 days ago
    const expiredTasks = await db
      .select({
        id: tasks.id,
        completedAt: tasks.completedAt,
      })
      .from(tasks)
      .where(
        and(
          eq(tasks.status, 'done'),
          isNotNull(tasks.completedAt),
          lte(tasks.completedAt, cutoffDate)
        )
      );

    if (expiredTasks.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No expired attachments to cleanup',
        stats: {
          tasksProcessed: 0,
          attachmentsDeleted: 0,
          foldersDeleted: 0,
        },
      });
    }

    let attachmentsDeleted = 0;
    let foldersDeleted = 0;
    const errors: string[] = [];

    for (const task of expiredTasks) {
      // Get all attachments for this task
      const taskAttachments = await db
        .select()
        .from(attachments)
        .where(eq(attachments.taskId, task.id));

      if (taskAttachments.length === 0) {
        continue;
      }

      // Delete each attachment from Google Drive
      for (const attachment of taskAttachments) {
        try {
          await deleteFileFromDrive(attachment.driveFileId);
          attachmentsDeleted++;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          errors.push(`Failed to delete file ${attachment.driveFileId}: ${errorMessage}`);
          console.error(`Failed to delete file ${attachment.driveFileId}:`, error);
        }
      }

      // Delete all attachment records from DB for this task
      await db.delete(attachments).where(eq(attachments.taskId, task.id));

      // Delete the task folder from Drive
      try {
        await deleteTaskFolder(task.id);
        foldersDeleted++;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        errors.push(`Failed to delete folder for task ${task.id}: ${errorMessage}`);
        console.error(`Failed to delete folder for task ${task.id}:`, error);
      }
    }

    console.log(
      `Cleanup completed: ${expiredTasks.length} tasks processed, ${attachmentsDeleted} attachments deleted, ${foldersDeleted} folders deleted`
    );

    return NextResponse.json({
      success: true,
      message: 'Cleanup completed',
      stats: {
        tasksProcessed: expiredTasks.length,
        attachmentsDeleted,
        foldersDeleted,
        errors: errors.length > 0 ? errors : undefined,
      },
    });
  } catch (error) {
    console.error('Cleanup cron job failed:', error);
    return NextResponse.json(
      {
        error: 'Cleanup failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
