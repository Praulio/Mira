'use server';

import { auth } from '@clerk/nextjs/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { db } from '@/db';
import { tasks, activity } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

/**
 * Standardized action response type
 */
type ActionResponse<T = unknown> = {
  success: boolean;
  data?: T;
  error?: string;
};

/**
 * Zod schema for task creation
 */
const createTaskSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title must be 200 characters or less'),
  description: z.string().max(2000, 'Description must be 2000 characters or less').optional(),
  assigneeId: z.string().optional(),
});

/**
 * Zod schema for task status update
 */
const updateTaskStatusSchema = z.object({
  taskId: z.string().uuid('Invalid task ID'),
  newStatus: z.enum(['backlog', 'todo', 'in_progress', 'done']),
});

/**
 * Server Action: Create a new task
 * 
 * Creates a task in the database and logs the activity.
 * Default status is 'backlog' as defined in the schema.
 * 
 * @param input - Task creation data (title, description, assigneeId)
 * @returns ActionResponse with created task data or error message
 */
export async function createTask(
  input: z.infer<typeof createTaskSchema>
): Promise<ActionResponse<typeof tasks.$inferSelect>> {
  try {
    // Get authenticated user
    const { userId } = await auth();
    
    if (!userId) {
      return {
        success: false,
        error: 'Unauthorized - You must be logged in to create tasks',
      };
    }

    // Validate input
    const validationResult = createTaskSchema.safeParse(input);
    
    if (!validationResult.success) {
      return {
        success: false,
        error: validationResult.error.issues[0]?.message || 'Invalid input',
      };
    }

    const { title, description, assigneeId } = validationResult.data;

    // Insert task into database
    const [newTask] = await db
      .insert(tasks)
      .values({
        title,
        description: description || null,
        assigneeId: assigneeId || null,
        creatorId: userId,
        status: 'backlog', // Default status
      })
      .returning();

    if (!newTask) {
      return {
        success: false,
        error: 'Failed to create task',
      };
    }

    // Log activity
    await db.insert(activity).values({
      taskId: newTask.id,
      userId,
      action: 'created',
      metadata: {
        title: newTask.title,
        assigneeId: newTask.assigneeId,
      },
    });

    // Revalidate relevant paths
    revalidatePath('/');
    revalidatePath('/kanban');
    revalidatePath('/backlog');

    return {
      success: true,
      data: newTask,
    };
  } catch (error) {
    console.error('Error creating task:', error);
    return {
      success: false,
      error: 'An unexpected error occurred while creating the task',
    };
  }
}

/**
 * Server Action: Update task status (with Single In-Progress Logic)
 * 
 * Updates a task's status. If the new status is 'in_progress', it automatically
 * moves any other 'in_progress' tasks for the same assignee back to 'todo'.
 * This ensures the "Single In-Progress Task" rule: only one active task per user.
 * 
 * Uses an atomic transaction to guarantee consistency.
 * 
 * @param input - Task status update data (taskId, newStatus)
 * @returns ActionResponse with updated task data or error message
 */
export async function updateTaskStatus(
  input: z.infer<typeof updateTaskStatusSchema>
): Promise<ActionResponse<typeof tasks.$inferSelect>> {
  try {
    // Get authenticated user
    const { userId } = await auth();
    
    if (!userId) {
      return {
        success: false,
        error: 'Unauthorized - You must be logged in to update tasks',
      };
    }

    // Validate input
    const validationResult = updateTaskStatusSchema.safeParse(input);
    
    if (!validationResult.success) {
      return {
        success: false,
        error: validationResult.error.issues[0]?.message || 'Invalid input',
      };
    }

    const { taskId, newStatus } = validationResult.data;

    // Fetch the current task to get its assignee and old status
    const [currentTask] = await db
      .select()
      .from(tasks)
      .where(eq(tasks.id, taskId))
      .limit(1);

    if (!currentTask) {
      return {
        success: false,
        error: 'Task not found',
      };
    }

    // Execute atomic transaction
    const result = await db.transaction(async (tx) => {
      // CRITICAL LOGIC: Single In-Progress Task Rule
      // If moving to 'in_progress' and task has an assignee,
      // move all other 'in_progress' tasks for that assignee to 'todo'
      if (newStatus === 'in_progress' && currentTask.assigneeId) {
        await tx
          .update(tasks)
          .set({ 
            status: 'todo',
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(tasks.assigneeId, currentTask.assigneeId),
              eq(tasks.status, 'in_progress'),
              // Don't update the current task yet (it will be updated next)
            )
          );
      }

      // Update the target task with the new status
      const [updatedTask] = await tx
        .update(tasks)
        .set({ 
          status: newStatus,
          updatedAt: new Date(),
        })
        .where(eq(tasks.id, taskId))
        .returning();

      if (!updatedTask) {
        throw new Error('Failed to update task');
      }

      // Log the status change in activity
      await tx.insert(activity).values({
        taskId: updatedTask.id,
        userId,
        action: 'status_changed',
        metadata: {
          oldStatus: currentTask.status,
          newStatus: updatedTask.status,
          taskTitle: updatedTask.title,
        },
      });

      return updatedTask;
    });

    // Revalidate relevant paths
    revalidatePath('/');
    revalidatePath('/kanban');
    revalidatePath('/backlog');

    return {
      success: true,
      data: result,
    };
  } catch (error) {
    console.error('Error updating task status:', error);
    return {
      success: false,
      error: 'An unexpected error occurred while updating the task status',
    };
  }
}
