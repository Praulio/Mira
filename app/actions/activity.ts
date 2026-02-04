'use server'

import { db } from '@/db'
import { activity, users, tasks } from '@/db/schema'
import { and, desc, eq, ne } from 'drizzle-orm'
import { getAuth } from '@/lib/mock-auth'
import { getCurrentArea } from '@/lib/area-context'

/**
 * Filter type for activity feed
 */
export type ActivityFilter = 'all' | 'completed' | 'mentions'

/**
 * Activity data with user and task information
 */
export type ActivityData = {
  id: string
  action: 'created' | 'status_changed' | 'assigned' | 'updated' | 'deleted' | 'completed' | 'mentioned'
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
 *
 * @param filter - Filter type: 'all' (default), 'completed', or 'mentions'
 */
export async function getActivityFeed(filter: ActivityFilter = 'all'): Promise<ActivityData[]> {
  try {
    // Get current area for filtering
    const area = await getCurrentArea();

    // Build where clause based on filter - always include area filter
    const conditions = [eq(activity.area, area)];

    if (filter === 'all') {
      // Exclude 'mentioned' activities from general feed - they're personal notifications
      conditions.push(ne(activity.action, 'mentioned'));
    } else if (filter === 'completed') {
      conditions.push(eq(activity.action, 'completed'));
    } else if (filter === 'mentions') {
      const { userId } = await getAuth()
      if (!userId) {
        return []
      }
      // 'mentioned' activities are created with userId of the mentioned person
      conditions.push(eq(activity.action, 'mentioned'));
      conditions.push(eq(activity.userId, userId));
    }

    const whereClause = conditions.length > 1 ? and(...conditions) : conditions[0];

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
      .where(whereClause)
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
