'use server';

import { auth } from '@clerk/nextjs/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { db } from '@/db';
import { tasks, activity } from '@/db/schema';

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
