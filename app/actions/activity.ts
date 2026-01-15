'use server'

import { db } from '@/db'
import { activity, users, tasks } from '@/db/schema'
import { desc, eq } from 'drizzle-orm'

/**
 * Activity data with user and task information
 */
export type ActivityData = {
  id: string
  action: 'created' | 'status_changed' | 'assigned' | 'updated' | 'deleted'
  metadata: Record<string, unknown> | null
  createdAt: Date
  user: {
    id: string
    name: string
    email: string
    imageUrl: string | null
  }
  task: {
    id: string
    title: string
  } | null
}

/**
 * Fetch the last 20 activity events with user and task info
 * 
 * Performance optimizations:
 * - Uses LEFT JOIN to fetch user and task data in single query (Best Practice 1.4)
 * - Ordered by createdAt DESC with limit 20 for recent events
 * - Indexed query on activity.created_at (defined in schema)
 */
export async function getActivityFeed(): Promise<ActivityData[]> {
  try {
    // Fetch activity with user and task data in one query
    const activityData = await db
      .select({
        id: activity.id,
        action: activity.action,
        metadata: activity.metadata,
        createdAt: activity.createdAt,
        userId: activity.userId,
        userName: users.name,
        userEmail: users.email,
        userImageUrl: users.imageUrl,
        taskId: activity.taskId,
        taskTitle: tasks.title,
      })
      .from(activity)
      .leftJoin(users, eq(activity.userId, users.id))
      .leftJoin(tasks, eq(activity.taskId, tasks.id))
      .orderBy(desc(activity.createdAt))
      .limit(20)

    // Transform to ActivityData format
    return activityData.map((row) => ({
      id: row.id,
      action: row.action,
      metadata: row.metadata as Record<string, unknown> | null,
      createdAt: row.createdAt,
      user: {
        id: row.userId,
        name: row.userName ?? 'Unknown User',
        email: row.userEmail ?? '',
        imageUrl: row.userImageUrl,
      },
      task: row.taskId && row.taskTitle
        ? {
            id: row.taskId,
            title: row.taskTitle,
          }
        : null,
    }))
  } catch (error) {
    console.error('Error fetching activity feed:', error)
    return []
  }
}
