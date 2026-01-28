import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { tasks, attachments } from '@/db/schema';
import { eq, and, lte, inArray } from 'drizzle-orm';
import { deleteTaskFolder } from '@/lib/google-drive';

/**
 * Cron job to cleanup attachments from completed tasks.
 *
 * Runs daily at 3 AM UTC (configured in vercel.json).
 * Deletes attachments from tasks that have been in 'done' status for more than 3 days.
 *
 * @see https://vercel.com/docs/cron-jobs
 */
export async function GET(request: NextRequest) {
  try {
    // Validate CRON_SECRET to ensure request is from Vercel cron
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
      console.error('CRON_SECRET environment variable is not set');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    // Accept both "Bearer <secret>" format and raw secret
    const providedSecret = authHeader?.startsWith('Bearer ')
      ? authHeader.slice(7)
      : authHeader;

    if (providedSecret !== cronSecret) {
      console.warn('Unauthorized cron job access attempt');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Calculate the cutoff date (3 days ago)
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 3);

    console.log(`[Cron] Starting cleanup for tasks completed before ${cutoffDate.toISOString()}`);

    // Find all 'done' tasks with completedAt older than 3 days that have attachments
    const tasksToClean = await db
      .select({
        taskId: tasks.id,
        completedAt: tasks.completedAt,
      })
      .from(tasks)
      .innerJoin(attachments, eq(attachments.taskId, tasks.id))
      .where(
        and(
          eq(tasks.status, 'done'),
          lte(tasks.completedAt, cutoffDate)
        )
      )
      .groupBy(tasks.id, tasks.completedAt);

    console.log(`[Cron] Found ${tasksToClean.length} tasks with attachments to clean`);

    if (tasksToClean.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No tasks to clean',
        stats: {
          tasksProcessed: 0,
          attachmentsDeleted: 0,
          foldersDeleted: 0,
          errors: 0,
        },
      });
    }

    // Process each task
    let attachmentsDeleted = 0;
    let foldersDeleted = 0;
    let errors = 0;

    const taskIds = tasksToClean.map((t) => t.taskId);

    // Delete all attachments from database in a single query for efficiency
    const deletedRecords = await db
      .delete(attachments)
      .where(inArray(attachments.taskId, taskIds))
      .returning({ id: attachments.id, taskId: attachments.taskId });

    attachmentsDeleted = deletedRecords.length;

    console.log(`[Cron] Deleted ${attachmentsDeleted} attachment records from database`);

    // Delete folders from Google Drive (one per task)
    for (const task of tasksToClean) {
      try {
        await deleteTaskFolder(task.taskId);
        foldersDeleted++;
        console.log(`[Cron] Deleted Drive folder for task ${task.taskId}`);
      } catch (driveError) {
        errors++;
        console.error(`[Cron] Error deleting Drive folder for task ${task.taskId}:`, driveError);
        // Continue with other tasks even if one fails
      }
    }

    const stats = {
      tasksProcessed: tasksToClean.length,
      attachmentsDeleted,
      foldersDeleted,
      errors,
    };

    console.log('[Cron] Cleanup completed:', stats);

    return NextResponse.json({
      success: true,
      message: `Cleanup completed: ${attachmentsDeleted} attachments from ${tasksToClean.length} tasks`,
      stats,
    });
  } catch (error) {
    console.error('[Cron] Unexpected error during cleanup:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error during cleanup',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
