'use server';

import { getAuth } from '@/lib/mock-auth';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { db } from '@/db';
import { tasks, activity, notifications, users } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { deleteTaskFolder } from '@/lib/google-drive';
import { after } from 'next/server';
import { sendTaskAssignedEmail } from '@/lib/email';
import { extractMentionIds } from '@/components/mention-input';
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
  mentions: z.array(z.string()).optional(),
  dueDate: z.coerce.date().optional(),
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
 * Zod schema for updating dueDate timestamp
 * Only the CREATOR can edit this value
 */
const updateDueDateSchema = z.object({
  taskId: z.string().uuid('Invalid task ID'),
  dueDate: z.coerce.date().nullable(),
});

/**
 * Zod schema for updating task progress
 * Only the ASSIGNEE can edit (or CREATOR if no assignee)
 */
const updateProgressSchema = z.object({
  taskId: z.string().uuid('Invalid task ID'),
  progress: z.number().int().min(0).max(100),
});

/**
 * Zod schema for adding a blocker to a task
 * Only assignee or creator can add a blocker
 */
const addBlockerSchema = z.object({
  taskId: z.string().uuid('ID de tarea inválido'),
  reason: z.string().min(1, 'La razón es requerida').max(500, 'Máximo 500 caracteres'),
});

/**
 * Zod schema for removing a blocker from a task
 * Only assignee or creator can remove a blocker
 */
const removeBlockerSchema = z.object({
  taskId: z.string().uuid('ID de tarea inválido'),
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
 * Zod schema for task metadata update (title/description/mentions)
 */
const updateTaskMetadataSchema = z.object({
  taskId: z.string().uuid('Invalid task ID'),
  title: z.string().min(1, 'Title is required').max(200, 'Title must be 200 characters or less').optional(),
  description: z.string().max(50000, 'La descripción no puede exceder 50,000 caracteres').optional(),
  mentions: z.array(z.string()).optional(),
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

    const { title, description, assigneeId, mentions, dueDate } = validationResult.data;

    // Get current area
    const area = await getCurrentArea();

    // Get current user's name for mention activities
    let currentUserName = 'Alguien';
    if (mentions && mentions.length > 0) {
      const [currentUser] = await db
        .select({ name: users.name })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);
      if (currentUser) {
        currentUserName = currentUser.name;
      }
    }

    // Execute creation in transaction
    const result = await db.transaction(async (tx) => {
      // Insert task into database
      const [newTask] = await tx
        .insert(tasks)
        .values({
          title,
          description: description || null,
          assigneeId: assigneeId || null,
          creatorId: userId,
          status: 'backlog', // Default status
          area,
          mentions: mentions || null,
          dueDate: dueDate || null,
        })
        .returning();

      if (!newTask) {
        throw new Error('Failed to create task');
      }

      // Log activity
      await tx.insert(activity).values({
        taskId: newTask.id,
        userId,
        action: 'created',
        area,
        metadata: {
          title: newTask.title,
          assigneeId: newTask.assigneeId,
          mentions: mentions || null,
        },
      });

// If assigned at creation, log assignment activity too
      if (newTask.assigneeId) {
        await tx.insert(activity).values({
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

      // Create 'mentioned' activity for each mentioned user
      if (mentions && mentions.length > 0) {
        for (const mentionedUserId of mentions) {
          await tx.insert(activity).values({
            taskId: newTask.id,
            userId: mentionedUserId,
            action: 'mentioned',
            area,
            metadata: {
              taskTitle: newTask.title,
              mentionedBy: userId,
              mentionedByName: currentUserName,
              context: 'creation',
            },
          });
        }
      }

      return newTask;
    });

    // Create notifications (outside transaction)
    if (result.assigneeId && result.assigneeId !== userId) {
      await db.insert(notifications).values({
        recipientId: result.assigneeId,
        actorId: userId,
        taskId: result.id,
        type: 'assigned',
      });

      // Send email non-blocking
      after(async () => {
        const [actor] = await db.select({ name: users.name }).from(users).where(eq(users.id, userId)).limit(1);
        const [recipient] = await db.select({ email: users.email }).from(users).where(eq(users.id, result.assigneeId!)).limit(1);
        if (actor && recipient) {
          await sendTaskAssignedEmail({
            to: recipient.email,
            assignerName: actor.name,
            taskTitle: result.title,
            taskId: result.id,
          });
        }
      });
    }

    // Create mention notifications
    if (mentions && mentions.length > 0) {
      for (const mentionedUserId of mentions) {
        if (mentionedUserId !== userId) {
          await db.insert(notifications).values({
            recipientId: mentionedUserId,
            actorId: userId,
            taskId: result.id,
            type: 'mentioned',
          });
        }
      }
    }

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
    console.error('Error creating task:', error);
    return {
      success: false,
      error: 'An unexpected error occurred while creating the task',
    };
  }
}

/**
 * Server Action: Update task status
 *
 * Updates a task's status. Users can have multiple tasks in 'in_progress'
 * simultaneously (Multi-Activity mode).
 *
 * Time tracking behavior:
 * - startedAt is set when moving to 'in_progress' (if not already set)
 * - startedAt is cleared when moving back to 'backlog' or 'todo'
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
 * Server Action: Update task metadata (title/description/mentions)
 *
 * Updates the title and/or description of a task.
 * At least one field must be provided for update.
 * Logs the update activity with old and new values.
 * If mentions are provided, creates 'mentioned' activity for NEW mentions only (diff).
 *
 * @param input - Task metadata update data (taskId, title?, description?, mentions?)
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

    const { taskId, title, description, mentions } = validationResult.data;

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

    // If mentions are provided, update them
    if (mentions !== undefined) {
      updateData.mentions = mentions.length > 0 ? mentions : null;
    }

    // Calculate NEW mentions (diff): mentions that didn't exist before
    const existingMentions = (currentTask.mentions as string[] | null) || [];
    const newMentions = mentions
      ? mentions.filter((m) => !existingMentions.includes(m))
      : [];

    // Get current user's name for mention activities
    let currentUserName = 'Alguien';
    if (newMentions.length > 0) {
      const [currentUser] = await db
        .select({ name: users.name })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);
      if (currentUser) {
        currentUserName = currentUser.name;
      }
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
            mentions: mentions !== undefined,
          },
        },
      });

// Create 'mentioned' activity and notifications for each NEW mention (diff)
      if (newMentions.length > 0) {
        for (const mentionedUserId of newMentions) {
          await tx.insert(activity).values({
            taskId: updatedTask.id,
            userId: mentionedUserId,
            action: 'mentioned',
            area: currentTask.area,
            metadata: {
              taskTitle: updatedTask.title,
              mentionedBy: userId,
              mentionedByName: currentUserName,
              context: 'edit',
            },
          });

          // Also create notification (skip self)
          if (mentionedUserId !== userId) {
            await tx.insert(notifications).values({
              recipientId: mentionedUserId,
              actorId: userId,
              taskId: updatedTask.id,
              type: 'mentioned',
            });
          }
        }
      }

      return updatedTask;
    });

    // Revalidate relevant paths
    revalidatePath('/');
    revalidatePath('/kanban');
    revalidatePath('/backlog');
    revalidatePath('/activity');

    return { success: true, data: result };
  } catch (error) {
    console.error('Error updating task metadata:', error);
    return { success: false, error: 'Failed to update task details' };
  }
}

/**
 * Server Action: Assign a task to a user
 *
 * Updates the assignee of a task. Users can have multiple tasks in 'in_progress'
 * simultaneously (Multi-Activity mode).
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

      // Notify new assignee (skip self-notification and null assignee)
      if (newAssigneeId && newAssigneeId !== currentUserId) {
        await tx.insert(notifications).values({
          recipientId: newAssigneeId,
          actorId: currentUserId,
          taskId: taskId,
          type: 'assigned',
        });
      }

      return updatedTask;
    });

    // Send email non-blocking (outside transaction)
    if (newAssigneeId && newAssigneeId !== currentUserId) {
      after(async () => {
        const [actor] = await db.select({ name: users.name }).from(users).where(eq(users.id, currentUserId)).limit(1);
        const [recipient] = await db.select({ email: users.email }).from(users).where(eq(users.id, newAssigneeId)).limit(1);
        if (actor && recipient) {
          await sendTaskAssignedEmail({
            to: recipient.email,
            assignerName: actor.name,
            taskTitle: currentTask.title,
            taskId: taskId,
          });
        }
      });
    }

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

    // Get current user's name for mention activities
    let currentUserName = 'Alguien';
    if (mentions && mentions.length > 0) {
      const [currentUser] = await db
        .select({ name: users.name })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);
      if (currentUser) {
        currentUserName = currentUser.name;
      }
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
        const uniqueMentionIds = [...new Set(mentions)];
        for (const mentionedUserId of uniqueMentionIds) {
          await tx.insert(activity).values({
            taskId: updatedTask.id,
            userId: mentionedUserId,
            action: 'mentioned',
            area: currentTask.area,
            metadata: {
              taskTitle: updatedTask.title,
              mentionedBy: userId,
              mentionedByName: currentUserName,
              notes: notes || null,
            },
          });

          // Insert notification for mentioned user (skip self-notification)
          if (mentionedUserId !== userId) {
            await tx.insert(notifications).values({
              recipientId: mentionedUserId,
              actorId: userId,
              taskId: updatedTask.id,
              type: 'mentioned',
            });
          }
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

/**
 * Server Action: Update task due date
 *
 * Allows the CREATOR of a task to edit or clear the due date.
 * Only the creator has permission to modify this field.
 *
 * @param input - Task ID and new dueDate (or null to clear)
 * @returns ActionResponse with updated task data or error message
 */
export async function updateTaskDueDate(
  input: z.infer<typeof updateDueDateSchema>
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
    const validationResult = updateDueDateSchema.safeParse(input);

    if (!validationResult.success) {
      return {
        success: false,
        error: validationResult.error.issues[0]?.message || 'Invalid input',
      };
    }

    const { taskId, dueDate } = validationResult.data;

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

    // Verify ownership: ONLY the creator can edit dueDate
    if (currentTask.creatorId !== userId) {
      return {
        success: false,
        error: 'Solo el creador de la tarea puede editar la fecha de entrega',
      };
    }

    // Execute update in transaction
    const result = await db.transaction(async (tx) => {
      const [updatedTask] = await tx
        .update(tasks)
        .set({
          dueDate,
          updatedAt: new Date(),
        })
        .where(eq(tasks.id, taskId))
        .returning();

      if (!updatedTask) {
        throw new Error('Failed to update task');
      }

      // Log the dueDate update in activity (inherit area from task)
      await tx.insert(activity).values({
        taskId: updatedTask.id,
        userId,
        action: 'updated',
        area: currentTask.area,
        metadata: {
          taskTitle: updatedTask.title,
          oldDueDate: currentTask.dueDate?.toISOString() || null,
          newDueDate: dueDate?.toISOString() || null,
          fieldUpdated: 'dueDate',
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
    console.error('Error updating dueDate:', error);
    return {
      success: false,
      error: 'An unexpected error occurred while updating the due date',
    };
  }
}

/**
 * Server Action: Update task progress
 *
 * Allows the assignee (or creator if no assignee) to update the progress
 * percentage of a task (0-100).
 *
 * Rules:
 * - Assignee can always edit progress
 * - Creator can edit ONLY if there is no assignee
 * - Progress must be an integer between 0 and 100
 *
 * @param input - Task ID and new progress value (0-100)
 * @returns ActionResponse with updated task data or error message
 */
export async function updateTaskProgress(
  input: z.infer<typeof updateProgressSchema>
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
    const validationResult = updateProgressSchema.safeParse(input);

    if (!validationResult.success) {
      return {
        success: false,
        error: validationResult.error.issues[0]?.message || 'Invalid input',
      };
    }

    const { taskId, progress } = validationResult.data;

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

    // Verify permissions: assignee OR creator (if no assignee)
    const canEdit =
      currentTask.assigneeId === userId ||
      (!currentTask.assigneeId && currentTask.creatorId === userId);

    if (!canEdit) {
      return {
        success: false,
        error: 'Solo el asignado puede actualizar el progreso',
      };
    }

    // Execute update in transaction
    const result = await db.transaction(async (tx) => {
      const [updatedTask] = await tx
        .update(tasks)
        .set({
          progress,
          updatedAt: new Date(),
        })
        .where(eq(tasks.id, taskId))
        .returning();

      if (!updatedTask) {
        throw new Error('Failed to update task');
      }

      // Log the progress update in activity (inherit area from task)
      await tx.insert(activity).values({
        taskId: updatedTask.id,
        userId,
        action: 'updated',
        area: currentTask.area,
        metadata: {
          taskTitle: updatedTask.title,
          oldProgress: currentTask.progress,
          newProgress: progress,
          fieldUpdated: 'progress',
        },
      });

      return updatedTask;
    });

    // Revalidate relevant paths
    revalidatePath('/');
    revalidatePath('/kanban');

    return {
      success: true,
      data: result,
    };
  } catch (error) {
    console.error('Error updating progress:', error);
    return {
      success: false,
      error: 'An unexpected error occurred while updating the progress',
    };
  }
}

/**
 * Server Action: Add a blocker to a task
 *
 * Marks a task as blocked with a reason. Blocked tasks can still be moved
 * between columns (the blocker is a visual indicator only).
 *
 * Rules:
 * - Only the assignee or creator can add a blocker
 * - The reason is required and limited to 500 characters
 *
 * @param input - Task ID and blocker reason
 * @returns ActionResponse with updated task data or error message
 */
export async function addBlocker(
  input: z.infer<typeof addBlockerSchema>
): Promise<ActionResponse<typeof tasks.$inferSelect>> {
  try {
    // Get authenticated user
    const { userId } = await getAuth();

    if (!userId) {
      return {
        success: false,
        error: 'Unauthorized - You must be logged in to add blockers',
      };
    }

    // Validate input
    const validationResult = addBlockerSchema.safeParse(input);

    if (!validationResult.success) {
      return {
        success: false,
        error: validationResult.error.issues[0]?.message || 'Invalid input',
      };
    }

    const { taskId, reason } = validationResult.data;

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

    // Verify ownership: user must be assignee OR creator
    const isOwner = currentTask.assigneeId === userId || currentTask.creatorId === userId;

    if (!isOwner) {
      return {
        success: false,
        error: 'Solo el asignado o creador de la tarea puede agregar un blocker',
      };
    }

    // Execute update in transaction
    const result = await db.transaction(async (tx) => {
      const [updatedTask] = await tx
        .update(tasks)
        .set({
          blockerReason: reason,
          updatedAt: new Date(),
        })
        .where(eq(tasks.id, taskId))
        .returning();

      if (!updatedTask) {
        throw new Error('Failed to add blocker');
      }

      // Log the blocker addition in activity (inherit area from task)
      await tx.insert(activity).values({
        taskId: updatedTask.id,
        userId,
        action: 'updated',
        area: currentTask.area,
        metadata: {
          taskTitle: updatedTask.title,
          blocked: true,
          blockerReason: reason,
          fieldUpdated: 'blockerReason',
        },
      });

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
    console.error('Error adding blocker:', error);
    return {
      success: false,
      error: 'An unexpected error occurred while adding the blocker',
    };
  }
}

/**
 * Server Action: Remove a blocker from a task
 *
 * Removes the blocked status from a task by clearing the blockerReason.
 *
 * Rules:
 * - Only the assignee or creator can remove a blocker
 *
 * @param input - Task ID to remove blocker from
 * @returns ActionResponse with updated task data or error message
 */
export async function removeBlocker(
  input: z.infer<typeof removeBlockerSchema>
): Promise<ActionResponse<typeof tasks.$inferSelect>> {
  try {
    // Get authenticated user
    const { userId } = await getAuth();

    if (!userId) {
      return {
        success: false,
        error: 'Unauthorized - You must be logged in to remove blockers',
      };
    }

    // Validate input
    const validationResult = removeBlockerSchema.safeParse(input);

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

    // Verify ownership: user must be assignee OR creator
    const isOwner = currentTask.assigneeId === userId || currentTask.creatorId === userId;

    if (!isOwner) {
      return {
        success: false,
        error: 'Solo el asignado o creador de la tarea puede quitar el blocker',
      };
    }

    // Verify task is actually blocked
    if (!currentTask.blockerReason) {
      return {
        success: false,
        error: 'Esta tarea no tiene un blocker activo',
      };
    }

    // Execute update in transaction
    const result = await db.transaction(async (tx) => {
      const [updatedTask] = await tx
        .update(tasks)
        .set({
          blockerReason: null,
          updatedAt: new Date(),
        })
        .where(eq(tasks.id, taskId))
        .returning();

      if (!updatedTask) {
        throw new Error('Failed to remove blocker');
      }

      // Log the blocker removal in activity (inherit area from task)
      await tx.insert(activity).values({
        taskId: updatedTask.id,
        userId,
        action: 'updated',
        area: currentTask.area,
        metadata: {
          taskTitle: updatedTask.title,
          blocked: false,
          previousBlockerReason: currentTask.blockerReason,
          fieldUpdated: 'blockerReason',
        },
      });

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
    console.error('Error removing blocker:', error);
    return {
      success: false,
      error: 'An unexpected error occurred while removing the blocker',
    };
  }
}
