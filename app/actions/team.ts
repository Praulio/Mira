'use server';

import { db } from '@/db';
import { users, tasks } from '@/db/schema';
import { eq, desc, and } from 'drizzle-orm';
import { getCurrentArea } from '@/lib/area-context';

/**
 * Type for a team slot with user and their current in-progress tasks (multi-activity mode)
 */
export type TeamSlotData = {
  user: {
    id: string;
    email: string;
    name: string;
    imageUrl: string | null;
    slotIndex: number | null;
  };
  inProgressTasks: Array<{
    id: string;
    title: string;
    description: string | null;
    updatedAt: Date;
    startedAt: Date | null;
    progress: number;
    blockerReason: string | null;
  }>;
};

/**
 * Fetch team view data: up to 8 users with ALL their in-progress tasks (multi-activity mode)
 *
 * Returns users sorted by slot_index (if assigned) or by most recently active.
 * Each user includes ALL their in_progress tasks (ordered by startedAt DESC).
 *
 * Following React Best Practices:
 * - Server-side data fetching with no client-side waterfalls
 * - Single query for users, then parallel fetch for each user's tasks
 * - Returns minimal serializable data across RSC boundary
 */
export async function getTeamViewData(): Promise<TeamSlotData[]> {
  try {
    // Get current area for filtering
    const area = await getCurrentArea();

    // Fetch up to 8 users from the current area, prioritizing those with slot_index assigned
    // Then order by most recently updated users
    const allUsers = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        imageUrl: users.imageUrl,
        slotIndex: users.slotIndex,
        updatedAt: users.updatedAt,
      })
      .from(users)
      .where(eq(users.area, area))
      .orderBy(users.slotIndex, desc(users.updatedAt))
      .limit(8);

    // For each user, fetch ALL their in_progress tasks from the same area (multi-activity mode)
    // Using Promise.all to parallelize these queries (Best Practice: 1.4)
    const teamSlots = await Promise.all(
      allUsers.map(async (user) => {
        const inProgressTasks = await db
          .select({
            id: tasks.id,
            title: tasks.title,
            description: tasks.description,
            updatedAt: tasks.updatedAt,
            startedAt: tasks.startedAt,
            progress: tasks.progress,
            blockerReason: tasks.blockerReason,
          })
          .from(tasks)
          .where(
            and(
              eq(tasks.assigneeId, user.id),
              eq(tasks.status, 'in_progress'),
              eq(tasks.area, area)
            )
          )
          .orderBy(desc(tasks.startedAt));

        return {
          user,
          inProgressTasks: inProgressTasks.map((task) => ({
            ...task,
            progress: task.progress ?? 0,
          })),
        };
      })
    );

    return teamSlots;
  } catch (error) {
    console.error('Error fetching team view data:', error);
    // Return empty array on error to prevent page crash
    return [];
  }
}
