'use server';

import { getAuth } from '@/lib/mock-auth';
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
 * Zod schema for task deletion
 */
const deleteTaskSchema = z.object({
  taskId: z.string().uuid('Invalid task ID'),
});

/**
 * Zod schema for task metadata update (title/description)
 */
const updateTaskMetadataSchema = z.object({
  taskId: z.string().uuid('Invalid task ID'),
  title: z.string().min(1, 'Title is required').max(200, 'Title must be 200 characters or less').optional(),
  description: z.string().max(2000, 'Description must be 2000 characters or less').optional(),
}).refine(
  (data) => data.title !== undefined || data.description !== undefined,
  'At least one field (title or description) must be provided'
);

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
    const { userId } = await getAuth();
    
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

    // If assigned at creation, log assignment activity too
    if (newTask.assigneeId) {
      await db.insert(activity).values({
        taskId: newTask.id,
        userId,
        action: 'assigned',
        metadata: {
          assigneeId: newTask.assigneeId,
          taskTitle: newTask.title,
        },
      });
    }

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
    const { userId } = await getAuth();
    
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

/**
 * Server Action: Delete a task
 * 
 * Deletes a task from the database and logs the deletion activity.
 * Uses CASCADE delete behavior for related activity records (defined in schema).
 * 
 * @param input - Task deletion data (taskId)
 * @returns ActionResponse with success status or error message
 */
export async function deleteTask(
  input: z.infer<typeof deleteTaskSchema>
): Promise<ActionResponse<{ taskId: string }>> {
  try {
    // Get authenticated user
    const { userId } = await getAuth();
    
    if (!userId) {
      return {
        success: false,
        error: 'Unauthorized - You must be logged in to delete tasks',
      };
    }

    // Validate input
    const validationResult = deleteTaskSchema.safeParse(input);
    
    if (!validationResult.success) {
      return {
        success: false,
        error: validationResult.error.issues[0]?.message || 'Invalid input',
      };
    }

    const { taskId } = validationResult.data;

    // Fetch the task to verify it exists and to log its details
    const [taskToDelete] = await db
      .select()
      .from(tasks)
      .where(eq(tasks.id, taskId))
      .limit(1);

    if (!taskToDelete) {
      return {
        success: false,
        error: 'Task not found',
      };
    }

    // Execute deletion in transaction to ensure activity is logged before task is deleted
    await db.transaction(async (tx) => {
      // Log the deletion activity BEFORE deleting the task
      await tx.insert(activity).values({
        taskId: taskToDelete.id,
        userId,
        action: 'deleted',
        metadata: {
          title: taskToDelete.title,
          status: taskToDelete.status,
          assigneeId: taskToDelete.assigneeId,
        },
      });

      // Delete the task (CASCADE will handle related records)
      await tx
        .delete(tasks)
        .where(eq(tasks.id, taskId));
    });

    // Revalidate relevant paths
    revalidatePath('/');
    revalidatePath('/kanban');
    revalidatePath('/backlog');

    return {
      success: true,
      data: { taskId },
    };
  } catch (error) {
    console.error('Error deleting task:', error);
    return {
      success: false,
      error: 'An unexpected error occurred while deleting the task',
    };
  }
}

/**
 * Server Action: Update task metadata (title/description)
 * 
 * Updates the title and/or description of a task.
 * At least one field must be provided for update.
 * Logs the update activity with old and new values.
 * 
 * @param input - Task metadata update data (taskId, title?, description?)
 * @returns ActionResponse with updated task data or error message
 */
export async function updateTaskMetadata(
  input: z.infer<typeof updateTaskMetadataSchema>
): Promise<ActionResponse<typeof tasks.$inferSelect>> {
  try {
    // Get authenticated user
    const { userId } = await getAuth();
    
    if (!userId) {
      return {
        success: false,
        error: 'Unauthorized - You must be logged in to update tasks',
      };
    }

    // Validate input
    const validationResult = updateTaskMetadataSchema.safeParse(input);
    
    if (!validationResult.success) {
      return {
        success: false,
        error: validationResult.error.issues[0]?.message || 'Invalid input',
      };
    }

    const { taskId, title, description } = validationResult.data;

    // Fetch the current task to get old values
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

    // Build update object with only provided fields
    const updateData: Partial<typeof tasks.$inferInsert> = {
      updatedAt: new Date(),
    };

    if (title !== undefined) {
      updateData.title = title;
    }

    if (description !== undefined) {
      updateData.description = description;
    }

    // Execute update in transaction
    const result = await db.transaction(async (tx) => {
      // Update the task
      const [updatedTask] = await tx
        .update(tasks)
        .set(updateData)
        .where(eq(tasks.id, taskId))
        .returning();

      if (!updatedTask) {
        throw new Error('Failed to update task');
      }

      // Log the metadata update in activity
      await tx.insert(activity).values({
        taskId: updatedTask.id,
        userId,
        action: 'updated',
        metadata: {
          oldTitle: currentTask.title,
          newTitle: updatedTask.title,
          oldDescription: currentTask.description,
          newDescription: updatedTask.description,
          fieldsUpdated: {
            title: title !== undefined,
            description: description !== undefined,
          },
        },
      });

      return updatedTask;
    });

    // Revalidate relevant paths
    revalidatePath('/');
    revalidatePath('/kanban');
    revalidatePath('/backlog');

    return { success: true, data: result };
  } catch (error) {
    console.error('Error updating task metadata:', error);
    return { success: false, error: 'Failed to update task details' };
  }
}

/**
 * Server Action: Assign a task to a user
 * 
 * Updates the assignee of a task. If the task is 'in_progress', it moves
 * any other 'in_progress' tasks for the NEW assignee back to 'todo'.
 */
export async function assignTask(
  taskId: string,
  newAssigneeId: string | null
): Promise<ActionResponse<typeof tasks.$inferSelect>> {
  try {
    const { userId: currentUserId } = await getAuth();
    
    if (!currentUserId) {
      return { success: false, error: 'Unauthorized' };
    }

    // Fetch current task
    const [currentTask] = await db
      .select()
      .from(tasks)
      .where(eq(tasks.id, taskId))
      .limit(1);

    if (!currentTask) {
      return { success: false, error: 'Task not found' };
    }

    const result = await db.transaction(async (tx) => {
      // If task is in_progress and we are assigning to someone,
      // clear other in_progress tasks for that person
      if (currentTask.status === 'in_progress' && newAssigneeId) {
        await tx
          .update(tasks)
          .set({ status: 'todo', updatedAt: new Date() })
          .where(
            and(
              eq(tasks.assigneeId, newAssigneeId),
              eq(tasks.status, 'in_progress')
            )
          );
      }

      const [updatedTask] = await tx
        .update(tasks)
        .set({ assigneeId: newAssigneeId, updatedAt: new Date() })
        .where(eq(tasks.id, taskId))
        .returning();

      // Log activity
      await tx.insert(activity).values({
        taskId: taskId,
        userId: currentUserId,
        action: 'assigned',
        metadata: {
          oldAssigneeId: currentTask.assigneeId,
          newAssigneeId: newAssigneeId,
          taskTitle: currentTask.title,
        },
      });

      return updatedTask;
    });

    revalidatePath('/');
    revalidatePath('/kanban');
    return { success: true, data: result };
  } catch (error) {
    console.error('Error assigning task:', error);
    return { success: false, error: 'Failed to assign task' };
  }
}

