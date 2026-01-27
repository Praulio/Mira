'use server';

import { getAuth } from '@/lib/mock-auth';
import { db } from '@/db';
import { users, tasks } from '@/db/schema';
import { eq, desc, asc } from 'drizzle-orm';
import { redirect } from 'next/navigation';

/**
 * Type for a task in the Kanban view with related user data
 */
export type KanbanTaskData = {
  id: string;
  title: string;
  description: string | null;
  status: 'backlog' | 'todo' | 'in_progress' | 'done';
  assignee: {
    id: string;
    name: string;
    imageUrl: string | null;
  } | null;
  creator: {
    id: string;
    name: string;
  };
  createdAt: Date;
  updatedAt: Date;
  startedAt: Date | null;
  completedAt: Date | null;
};

/**
 * Type for Kanban board data organized by columns
 */
export type KanbanData = {
  backlog: KanbanTaskData[];
  todo: KanbanTaskData[];
  in_progress: KanbanTaskData[];
  done: KanbanTaskData[];
};

/**
 * Fetch all tasks organized by status for the Kanban board
 * 
 * Returns tasks grouped by their status column, ordered by most recently updated first.
 * Each task includes assignee and creator information.
 * 
 * Following React Best Practices:
 * - Server-side data fetching with no client-side waterfalls
 * - Single query fetches all tasks with JOINs for user data
 * - Returns minimal serializable data across RSC boundary
 */
export async function getKanbanData(): Promise<KanbanData> {
  const { userId } = await getAuth();
  
  if (!userId) {
    redirect('/sign-in');
  }

  try {
    // Single query with JOINs to fetch all tasks with assignee and creator data
    // Using LEFT JOIN for assignee (nullable) and INNER JOIN for creator (required)
    const allTasks = await db
      .select({
        id: tasks.id,
        title: tasks.title,
        description: tasks.description,
        status: tasks.status,
        assigneeId: tasks.assigneeId,
        assigneeName: users.name,
        assigneeImageUrl: users.imageUrl,
        creatorId: tasks.creatorId,
        createdAt: tasks.createdAt,
        updatedAt: tasks.updatedAt,
        startedAt: tasks.startedAt,
        completedAt: tasks.completedAt,
      })
      .from(tasks)
      .leftJoin(users, eq(tasks.assigneeId, users.id))
      .orderBy(desc(tasks.updatedAt));

    // Need to fetch creator data separately since we can't have two joins on the same table
    // Using Promise.all to parallelize these queries (Best Practice: 1.4)
    const tasksWithCreators = await Promise.all(
      allTasks.map(async (task) => {
        const [creator] = await db
          .select({
            id: users.id,
            name: users.name,
          })
          .from(users)
          .where(eq(users.id, task.creatorId))
          .limit(1);

        return {
          id: task.id,
          title: task.title,
          description: task.description,
          status: task.status,
          assignee: task.assigneeId
            ? {
                id: task.assigneeId,
                name: task.assigneeName!,
                imageUrl: task.assigneeImageUrl,
              }
            : null,
          creator: {
            id: creator.id,
            name: creator.name,
          },
          createdAt: task.createdAt,
          updatedAt: task.updatedAt,
          startedAt: task.startedAt,
          completedAt: task.completedAt,
        } as KanbanTaskData;
      })
    );

    // Group tasks by status
    const kanbanData: KanbanData = {
      backlog: [],
      todo: [],
      in_progress: [],
      done: [],
    };

    for (const task of tasksWithCreators) {
      kanbanData[task.status].push(task);
    }

    return kanbanData;
  } catch (error) {
    console.error('Error fetching kanban data:', error);
    // Return empty columns on error to prevent page crash
    return {
      backlog: [],
      todo: [],
      in_progress: [],
      done: [],
    };
  }
}

/**
 * Type for a task in the Backlog view (extends KanbanTaskData with isCritical)
 */
export type BacklogTaskData = KanbanTaskData & {
  isCritical: boolean;
};

/**
 * Fetch tasks in backlog status, ordered by critical first, then by creation date
 *
 * Returns tasks filtered to status='backlog', sorted to show critical tasks at the top,
 * followed by non-critical tasks ordered by creation date (oldest first for FIFO).
 */
export async function getBacklogTasks(): Promise<BacklogTaskData[]> {
  const { userId } = await getAuth();

  if (!userId) {
    redirect('/sign-in');
  }

  try {
    // Fetch backlog tasks ordered by: isCritical DESC (true first), createdAt ASC (oldest first)
    const backlogTasks = await db
      .select({
        id: tasks.id,
        title: tasks.title,
        description: tasks.description,
        status: tasks.status,
        isCritical: tasks.isCritical,
        assigneeId: tasks.assigneeId,
        assigneeName: users.name,
        assigneeImageUrl: users.imageUrl,
        creatorId: tasks.creatorId,
        createdAt: tasks.createdAt,
        updatedAt: tasks.updatedAt,
      })
      .from(tasks)
      .leftJoin(users, eq(tasks.assigneeId, users.id))
      .where(eq(tasks.status, 'backlog'))
      .orderBy(desc(tasks.isCritical), asc(tasks.createdAt));

    // Fetch creator data separately (same pattern as getKanbanData)
    const tasksWithCreators = await Promise.all(
      backlogTasks.map(async (task) => {
        const [creator] = await db
          .select({
            id: users.id,
            name: users.name,
          })
          .from(users)
          .where(eq(users.id, task.creatorId))
          .limit(1);

        return {
          id: task.id,
          title: task.title,
          description: task.description,
          status: task.status,
          isCritical: task.isCritical,
          assignee: task.assigneeId
            ? {
                id: task.assigneeId,
                name: task.assigneeName!,
                imageUrl: task.assigneeImageUrl,
              }
            : null,
          creator: {
            id: creator.id,
            name: creator.name,
          },
          createdAt: task.createdAt,
          updatedAt: task.updatedAt,
        } as BacklogTaskData;
      })
    );

    return tasksWithCreators;
  } catch (error) {
    console.error('Error fetching backlog tasks:', error);
    return [];
  }
}
