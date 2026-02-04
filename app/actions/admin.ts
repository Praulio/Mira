'use server';

import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getAreaContext, type Area, type UserRole } from '@/lib/area-context';
import { revalidatePath } from 'next/cache';

/**
 * Verify superadmin permissions
 */
async function requireSuperadmin() {
  const context = await getAreaContext();
  if (!context || context.userRole !== 'superadmin') {
    throw new Error('Unauthorized - Superadmin access required');
  }
  return context;
}

/**
 * Get all users (superadmin only)
 */
export async function getAllUsers() {
  await requireSuperadmin();

  return db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      imageUrl: users.imageUrl,
      area: users.area,
      role: users.role,
      createdAt: users.createdAt,
    })
    .from(users)
    .orderBy(users.createdAt);
}

/**
 * Assign area to a user
 */
export async function assignUserArea(userId: string, area: Area) {
  await requireSuperadmin();

  await db
    .update(users)
    .set({ area, updatedAt: new Date() })
    .where(eq(users.id, userId));

  revalidatePath('/dashboard/admin');
  revalidatePath('/dashboard');

  return { success: true };
}

/**
 * Change user role
 */
export async function setUserRole(userId: string, role: UserRole) {
  await requireSuperadmin();

  await db
    .update(users)
    .set({ role, updatedAt: new Date() })
    .where(eq(users.id, userId));

  revalidatePath('/dashboard/admin');

  return { success: true };
}

/**
 * Remove area assignment (back to pending)
 */
export async function removeUserArea(userId: string) {
  await requireSuperadmin();

  await db
    .update(users)
    .set({ area: null, updatedAt: new Date() })
    .where(eq(users.id, userId));

  revalidatePath('/dashboard/admin');

  return { success: true };
}
