'use server';

import { db } from '@/db';
import { users } from '@/db/schema';
import { desc } from 'drizzle-orm';
import { getAuth } from '@/lib/mock-auth';
import { redirect } from 'next/navigation';

/**
 * Fetch all users in the team (limited to 8 for the MVP)
 */
export async function getTeamUsers() {
  const { userId } = await getAuth();
  
  if (!userId) {
    redirect('/sign-in');
  }

  try {
    const teamUsers = await db
      .select({
        id: users.id,
        name: users.name,
        imageUrl: users.imageUrl,
      })
      .from(users)
      .orderBy(desc(users.createdAt))
      .limit(8);

    return teamUsers;
  } catch (error) {
    console.error('Error fetching team users:', error);
    return [];
  }
}
