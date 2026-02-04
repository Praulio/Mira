import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { headers } from 'next/headers';
import { db } from '@/db';
import { notifications } from '@/db/schema';
import { eq, and, sql } from 'drizzle-orm';

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
 * GET /api/notifications/unread-count
 *
 * Returns the count of unread notifications for the current user.
 */
export async function GET() {
  try {
    const userId = await getAuthUserId();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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

    return NextResponse.json({ count: result?.count ?? 0 });
  } catch (error) {
    console.error('Error fetching unread notification count:', error);
    return NextResponse.json(
      { error: 'Error al obtener conteo de notificaciones' },
      { status: 500 }
    );
  }
}
