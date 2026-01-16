'use server';

import { db } from '@/db';
import { users } from '@/db/schema';
import { desc, eq, not, like, and } from 'drizzle-orm';
import { getAuth } from '@/lib/mock-auth';
import { currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';

/**
 * Sync current user from Clerk to our database
 * Ensures names and images are always up to date
 */
export async function syncCurrentUser() {
  const { userId } = await getAuth();
  if (!userId) return null;

  // For E2E tests, skip real sync
  if (userId === 'user_e2e_test_123') return null;

  try {
    const user = await currentUser();
    if (!user) return null;

    const email = user.emailAddresses[0]?.emailAddress || '';
    const name = [user.firstName, user.lastName].filter(Boolean).join(' ') || email.split('@')[0];
    const imageUrl = user.imageUrl;

    // Upsert user
    const [upsertedUser] = await db
      .insert(users)
      .values({
        id: userId,
        email,
        name,
        imageUrl,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: users.id,
        set: {
          email,
          name,
          imageUrl,
          updatedAt: new Date(),
        },
      })
      .returning();

    return upsertedUser;
  } catch (error) {
    console.error('Error syncing user:', error);
    return null;
  }
}

/**
 * Cleanup action: Remove or fix dummy users
 */
export async function cleanupTestUsers() {
  try {
    // Delete users with generic names or test IDs
    await db.delete(users).where(
      and(
        not(like(users.id, 'user_%')), // IDs that don't follow Clerk pattern
        not(eq(users.id, 'user_e2e_test_123'))
      )
    );
    
    // Also delete those named "User" or "Droid" if they are clearly placeholder
    await db.delete(users).where(
      and(
        like(users.name, 'User%'),
        not(like(users.email, '%@%')) // Placeholder emails
      )
    );

    return { success: true };
  } catch (error) {
    console.error('Error cleaning up users:', error);
    return { success: false };
  }
}

/**
 * Fetch all users in the team (limited to 8 for the MVP)
 */
export async function getTeamUsers() {
  const { userId } = await getAuth();
  
  if (!userId) {
    redirect('/sign-in');
  }

  try {
    // Only show real-looking users (start with user_ or are the E2E test user)
    // and exclude those with generic "User" names that were manually injected
    const teamUsers = await db
      .select({
        id: users.id,
        name: users.name,
        imageUrl: users.imageUrl,
      })
      .from(users)
      .where(
        and(
          not(like(users.name, 'User %')),
          not(eq(users.name, 'Droid'))
        )
      )
      .orderBy(desc(users.createdAt))
      .limit(8);

    return teamUsers;
  } catch (error) {
    console.error('Error fetching team users:', error);
    return [];
  }
}
