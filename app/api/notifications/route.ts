import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { headers } from 'next/headers';
import { db } from '@/db';
import { notifications, users, tasks } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';

/**
 * Get authenticated user ID (supports E2E testing bypass in non-production)
 */
async function getAuthUserId(): Promise<string | null> {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    try {
      const headerList = await headers();
      const isTest = headerList.get('x-e2e-test') === 'true';

      if (isTest) {
        return 'user_e2e_test_123';
      }
    } catch {
      // Fallback if headers() fails
    }
  }

  const { userId } = await auth();
  return userId;
}

/**
 * GET /api/notifications
 *
 * Returns the list of notifications for the current user with actor details.
 */
export async function GET() {
  try {
    const userId = await getAuthUserId();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const items = await db
      .select({
        id: notifications.id,
        recipientId: notifications.recipientId,
        actorId: notifications.actorId,
        taskId: notifications.taskId,
        type: notifications.type,
        isRead: notifications.isRead,
        createdAt: notifications.createdAt,
        actorName: users.name,
        actorImage: users.imageUrl,
        taskTitle: tasks.title,
      })
      .from(notifications)
      .innerJoin(users, eq(notifications.actorId, users.id))
      .leftJoin(tasks, eq(notifications.taskId, tasks.id))
      .where(eq(notifications.recipientId, userId))
      .orderBy(desc(notifications.createdAt))
      .limit(50);

    return NextResponse.json({ items });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json(
      { error: 'Error al obtener notificaciones' },
      { status: 500 }
    );
  }
}
