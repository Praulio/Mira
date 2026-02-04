'use server';

import { getAuth } from '@/lib/mock-auth';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { db } from '@/db';
import { tasks, activity } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { deleteTaskFolder } from '@/lib/google-drive';
import { getCurrentArea } from '@/lib/area-context';

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
  description: z.string().max(50000, 'La descripción no puede exceder 50,000 caracteres').optional(),
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
 * Zod schema for toggle critical
 */
const toggleCriticalSchema = z.object({
  taskId: z.string().uuid('Invalid task ID'),
});

/**
 * Zod schema for task completion
 */
const completeTaskSchema = z.object({
  taskId: z.string().uuid('Invalid task ID'),
  notes: z.string().max(50000, 'Las notas no pueden exceder 50,000 caracteres').optional(),
  links: z.array(z.string().url('Invalid URL')).max(10, 'Maximum 10 links').optional(),
  mentions: z.array(z.string()).optional(),
});

/**
 * Zod schema for updating completedAt timestamp
 * Only the owner (assignee or creator) can edit this value
 */
const updateCompletedAtSchema = z.object({
  taskId: z.string().uuid('Invalid task ID'),
  completedAt: z.coerce.date().refine(
    (date) => date <= new Date(),
    'La fecha de finalización no puede ser en el futuro'
  ),
});

/**
 * Zod schema for creating a derived task
 * A derived task links to a parent task via parentTaskId
 */
const createDerivedTaskSchema = z.object({
  parentTaskId: z.string().uuid('Invalid parent task ID'),
  title: z.string().min(1, 'Title is required').max(200, 'Title must be 200 characters or less').optional(),
});

/**
 * Zod schema for task metadata update (title/description)
 */
const updateTaskMetadataSchema = z.object({
  taskId: z.string().uuid('Invalid task ID'),
  title: z.string().min(1, 'Title is required').max(200, 'Title must be 200 characters or less').optional(),
  description: z.string().max(50000, 'La descripción no puede exceder 50,000 caracteres').optional(),
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

    // Get current area
    const area = await getCurrentArea();

    // Insert task into database
    const [newTask] = await db
      .insert(tasks)
      .values({
        title,
        description: description || null,
        assigneeId: assigneeId || null,
        creatorId: userId,
        status: 'backlog', // Default status
        area,
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
      area,
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
        area,
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

      // Build update data for status change
      const updateData: Partial<typeof tasks.$inferInsert> = {
        status: newStatus,
        updatedAt: new Date(),
      };

      // TIME TRACKING LOGIC:
      // - Capture startedAt when moving to 'in_progress' (only if not already set)
      // - Reset startedAt when moving back to 'backlog' or 'todo'
      if (newStatus === 'in_progress' && !currentTask.startedAt) {
        updateData.startedAt = new Date();
      } else if (newStatus === 'backlog' || newStatus === 'todo') {
        updateData.startedAt = null;
      }

      // Update the target task with the new status
      const [updatedTask] = await tx
        .update(tasks)
        .set(updateData)
        .where(eq(tasks.id, taskId))
        .returning();

      if (!updatedTask) {
        throw new Error('Failed to update task');
      }

      // Log the status change in activity (inherit area from task)
      await tx.insert(activity).values({
        taskId: updatedTask.id,
        userId,
        action: 'status_changed',
        area: currentTask.area,
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

    // Delete attachments from Google Drive before deleting the task
    // This runs outside the transaction because Drive operations can be slow
    // and we don't want to block the DB. The cron job handles orphaned files if this fails.
    try {
      await deleteTaskFolder(taskId);
    } catch (driveError) {
      console.error('Error deleting task folder from Google Drive:', driveError);
      // Continue with task deletion even if Drive cleanup fails
    }

    // Execute deletion in transaction to ensure activity is logged before task is deleted
    await db.transaction(async (tx) => {
      // Log the deletion activity BEFORE deleting the task (inherit area from task)
      await tx.insert(activity).values({
        taskId: taskToDelete.id,
        userId,
        action: 'deleted',
        area: taskToDelete.area,
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

      // Log the metadata update in activity (inherit area from task)
      await tx.insert(activity).values({
        taskId: updatedTask.id,
        userId,
        action: 'updated',
        area: currentTask.area,
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

      // Log activity (inherit area from task)
      await tx.insert(activity).values({
        taskId: taskId,
        userId: currentUserId,
        action: 'assigned',
        area: currentTask.area,
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

/**
 * Server Action: Toggle task critical status
 *
 * Toggles the isCritical flag on a task.
 * Rule: Only 1 critical task per user is allowed.
 * If turning ON critical and user already has a critical task, returns error.
 *
 * @param input - Task ID to toggle
 * @returns ActionResponse with updated task data or error message
 */
export async function toggleTaskCritical(
  input: z.infer<typeof toggleCriticalSchema>
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
    const validationResult = toggleCriticalSchema.safeParse(input);

    if (!validationResult.success) {
      return {
        success: false,
        error: validationResult.error.issues[0]?.message || 'Invalid input',
      };
    }

    const { taskId } = validationResult.data;

    // Fetch the current task
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

    // If we are turning ON critical, check if user already has a critical task
    if (!currentTask.isCritical) {
      const [existingCritical] = await db
        .select()
        .from(tasks)
        .where(
          and(
            eq(tasks.creatorId, userId),
            eq(tasks.isCritical, true)
          )
        )
        .limit(1);

      if (existingCritical) {
        return {
          success: false,
          error: 'Ya tienes una tarea crítica. Desmarca la actual primero.',
        };
      }
    }

    // Toggle the critical flag
    const [updatedTask] = await db
      .update(tasks)
      .set({
        isCritical: !currentTask.isCritical,
        updatedAt: new Date(),
      })
      .where(eq(tasks.id, taskId))
      .returning();

    if (!updatedTask) {
      return {
        success: false,
        error: 'Failed to update task',
      };
    }

    // Revalidate relevant paths
    revalidatePath('/');
    revalidatePath('/kanban');
    revalidatePath('/backlog');

    return {
      success: true,
      data: updatedTask,
    };
  } catch (error) {
    console.error('Error toggling task critical:', error);
    return {
      success: false,
      error: 'An unexpected error occurred while updating the task',
    };
  }
}

/**
 * Server Action: Complete a task
 *
 * Marks a task as 'done' with optional completion notes, links, and mentions.
 * Creates activity records for the completion and for each mentioned user.
 *
 * @param input - Task completion data (taskId, notes?, links?, mentions?)
 * @returns ActionResponse with updated task data or error message
 */
export async function completeTask(
  input: z.infer<typeof completeTaskSchema>
): Promise<ActionResponse<typeof tasks.$inferSelect>> {
  try {
    // Get authenticated user
    const { userId } = await getAuth();

    if (!userId) {
      return {
        success: false,
        error: 'Unauthorized - You must be logged in to complete tasks',
      };
    }

    // Validate input
    const validationResult = completeTaskSchema.safeParse(input);

    if (!validationResult.success) {
      return {
        success: false,
        error: validationResult.error.issues[0]?.message || 'Invalid input',
      };
    }

    const { taskId, notes, links, mentions } = validationResult.data;

    // Fetch the current task
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

    // Execute completion in transaction
    const result = await db.transaction(async (tx) => {
      // Update task to done with completion data
      const [updatedTask] = await tx
        .update(tasks)
        .set({
          status: 'done',
          completedAt: new Date(),
          completionNotes: notes || null,
          completionLinks: links || null,
          mentions: mentions || null,
          updatedAt: new Date(),
        })
        .where(eq(tasks.id, taskId))
        .returning();

      if (!updatedTask) {
        throw new Error('Failed to complete task');
      }

      // Log completion activity (inherit area from task)
      await tx.insert(activity).values({
        taskId: updatedTask.id,
        userId,
        action: 'completed',
        area: currentTask.area,
        metadata: {
          taskTitle: updatedTask.title,
          notes: notes || null,
          links: links || null,
          mentions: mentions || null,
          previousStatus: currentTask.status,
        },
      });

      // Create 'mentioned' activity for each mentioned user
      if (mentions && mentions.length > 0) {
        for (const mentionedUserId of mentions) {
          await tx.insert(activity).values({
            taskId: updatedTask.id,
            userId: mentionedUserId,
            action: 'mentioned',
            area: currentTask.area,
            metadata: {
              taskTitle: updatedTask.title,
              mentionedBy: userId,
              notes: notes || null,
            },
          });
        }
      }

      return updatedTask;
    });

    // Revalidate relevant paths
    revalidatePath('/');
    revalidatePath('/kanban');
    revalidatePath('/backlog');
    revalidatePath('/activity');

    return {
      success: true,
      data: result,
    };
  } catch (error) {
    console.error('Error completing task:', error);
    return {
      success: false,
      error: 'An unexpected error occurred while completing the task',
    };
  }
}

/**
 * Server Action: Update completedAt timestamp
 *
 * Allows the owner (assignee or creator) to edit the completion timestamp
 * of a task that is already in 'done' status.
 *
 * Rules:
 * - Only assignee or creator can edit completedAt
 * - Task must be in 'done' status
 * - New date cannot be in the future
 *
 * @param input - Task ID and new completedAt date
 * @returns ActionResponse with updated task data or error message
 */
export async function updateCompletedAt(
  input: z.infer<typeof updateCompletedAtSchema>
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
    const validationResult = updateCompletedAtSchema.safeParse(input);

    if (!validationResult.success) {
      return {
        success: false,
        error: validationResult.error.issues[0]?.message || 'Invalid input',
      };
    }

    const { taskId, completedAt } = validationResult.data;

    // Fetch the current task
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

    // Verify task is in 'done' status
    if (currentTask.status !== 'done') {
      return {
        success: false,
        error: 'Solo se puede editar la fecha de finalización de tareas completadas',
      };
    }

    // Verify ownership: user must be assignee OR creator
    const isOwner = currentTask.assigneeId === userId || currentTask.creatorId === userId;

    if (!isOwner) {
      return {
        success: false,
        error: 'Solo el asignado o creador de la tarea puede editar la fecha de finalización',
      };
    }

    // Execute update in transaction
    const result = await db.transaction(async (tx) => {
      const [updatedTask] = await tx
        .update(tasks)
        .set({
          completedAt,
          updatedAt: new Date(),
        })
        .where(eq(tasks.id, taskId))
        .returning();

      if (!updatedTask) {
        throw new Error('Failed to update task');
      }

      // Log the completedAt update in activity (inherit area from task)
      await tx.insert(activity).values({
        taskId: updatedTask.id,
        userId,
        action: 'updated',
        area: currentTask.area,
        metadata: {
          taskTitle: updatedTask.title,
          oldCompletedAt: currentTask.completedAt?.toISOString() || null,
          newCompletedAt: completedAt.toISOString(),
          fieldUpdated: 'completedAt',
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
    console.error('Error updating completedAt:', error);
    return {
      success: false,
      error: 'An unexpected error occurred while updating the completion date',
    };
  }
}

/**
 * Server Action: Create a derived task
 *
 * Creates a new task linked to a parent task via parentTaskId.
 * Used when a completed task needs follow-up work without "reopening" it.
 *
 * Behavior:
 * - Inherits description and assignee from parent task
 * - Custom title optional (defaults to "Continuación: {parentTitle}")
 * - New task starts in 'backlog' status
 * - Logs activity with derivedFrom metadata
 *
 * @param input - Parent task ID and optional custom title
 * @returns ActionResponse with created task data or error message
 */
export async function createDerivedTask(
  input: z.infer<typeof createDerivedTaskSchema>
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
    const validationResult = createDerivedTaskSchema.safeParse(input);

    if (!validationResult.success) {
      return {
        success: false,
        error: validationResult.error.issues[0]?.message || 'Invalid input',
      };
    }

    const { parentTaskId, title: customTitle } = validationResult.data;

    // Fetch the parent task
    const [parentTask] = await db
      .select()
      .from(tasks)
      .where(eq(tasks.id, parentTaskId))
      .limit(1);

    if (!parentTask) {
      return {
        success: false,
        error: 'Tarea padre no encontrada',
      };
    }

    // Generate title: custom or "Continuación: {parentTitle}"
    const derivedTitle = customTitle || `Continuación: ${parentTask.title}`;

    // Execute creation in transaction (inherit area from parent task)
    const result = await db.transaction(async (tx) => {
      // Insert derived task (inherits area from parent)
      const [newTask] = await tx
        .insert(tasks)
        .values({
          title: derivedTitle,
          description: parentTask.description,
          assigneeId: parentTask.assigneeId,
          creatorId: userId,
          parentTaskId: parentTaskId,
          status: 'backlog',
          area: parentTask.area,
        })
        .returning();

      if (!newTask) {
        throw new Error('Failed to create derived task');
      }

      // Log activity for the new task (inherit area from parent)
      await tx.insert(activity).values({
        taskId: newTask.id,
        userId,
        action: 'created',
        area: parentTask.area,
        metadata: {
          title: newTask.title,
          assigneeId: newTask.assigneeId,
          derivedFrom: parentTaskId,
          parentTaskTitle: parentTask.title,
        },
      });

      // If inherited assignee, log assignment activity
      if (newTask.assigneeId) {
        await tx.insert(activity).values({
          taskId: newTask.id,
          userId,
          action: 'assigned',
          area: parentTask.area,
          metadata: {
            assigneeId: newTask.assigneeId,
            taskTitle: newTask.title,
            inheritedFrom: parentTaskId,
          },
        });
      }

      return newTask;
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
    console.error('Error creating derived task:', error);
    return {
      success: false,
      error: 'An unexpected error occurred while creating the derived task',
    };
  }
}
