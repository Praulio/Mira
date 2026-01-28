'use server';

import { getAuth } from '@/lib/mock-auth';
import { db } from '@/db';
import { notifications, users, tasks } from '@/db/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import { z } from 'zod';

/**
 * Standardized action response type
 */
type ActionResponse<T = unknown> = {
  success: boolean;
  data?: T;
  error?: string;
};

/**
 * Get count of unread notifications for the current user
 */
export async function getUnreadCount(): Promise<ActionResponse<number>> {
  try {
    const { userId } = await getAuth();
    if (!userId) {
      return { success: false, error: 'Unauthorized' };
    }

    const [result] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(notifications)
      .where(
        and(
          eq(notifications.recipientId, userId),
          eq(notifications.isRead, false)
        )
      );

    return { success: true, data: result?.count ?? 0 };
  } catch (error) {
    console.error('Error getting unread count:', error);
    return { success: false, error: 'Error al obtener conteo de notificaciones' };
  }
}

export type NotificationWithActor = {
  id: string;
  recipientId: string;
  actorId: string;
  taskId: string | null;
  type: 'assigned' | 'mentioned';
  isRead: boolean;
  createdAt: Date;
  actorName: string;
  actorImage: string | null;
  taskTitle: string | null;
};

/**
 * Get notifications for the current user with actor info
 */
export async function getNotifications(limit = 50): Promise<ActionResponse<NotificationWithActor[]>> {
  try {
    const { userId } = await getAuth();
    if (!userId) {
      return { success: false, error: 'Unauthorized' };
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
      .limit(limit);

    return { success: true, data: items };
  } catch (error) {
    console.error('Error getting notifications:', error);
    return { success: false, error: 'Error al obtener notificaciones' };
  }
}

const markReadSchema = z.object({
  notificationId: z.string().uuid('Invalid notification ID'),
});

/**
 * Mark a notification as read (only if recipient is current user)
 */
export async function markNotificationRead(notificationId: string): Promise<ActionResponse> {
  try {
    const { userId } = await getAuth();
    if (!userId) {
      return { success: false, error: 'Unauthorized' };
    }

    const parsed = markReadSchema.safeParse({ notificationId });
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }

    await db
      .update(notifications)
      .set({ isRead: true })
      .where(
        and(
          eq(notifications.id, notificationId),
          eq(notifications.recipientId, userId)
        )
      );

    return { success: true };
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return { success: false, error: 'Error al marcar notificación como leída' };
  }
}
