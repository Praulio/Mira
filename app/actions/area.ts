'use server';

import { cookies } from 'next/headers';
import { getAreaContext, type Area } from '@/lib/area-context';
import { revalidatePath } from 'next/cache';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';

const AREA_COOKIE_NAME = 'mira_selected_area';

export async function switchArea(newArea: Area) {
  const context = await getAreaContext();

  if (!context?.canSwitchArea) {
    return { success: false, error: 'No permission to switch areas' };
  }

  const cookieStore = await cookies();
  cookieStore.set(AREA_COOKIE_NAME, newArea, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });

  // Revalidate all dashboard routes
  revalidatePath('/dashboard', 'layout');

  return { success: true, area: newArea };
}

/**
 * Self-assign area for new users without an assigned area
 * This is called from the area selector on first login
 */
export async function selfAssignArea(area: Area) {
  const context = await getAreaContext();

  if (!context) {
    return { success: false, error: 'No autenticado' };
  }

  // Only allow self-assignment if user doesn't have an area yet
  if (context.isAssigned) {
    return { success: false, error: 'Ya tienes un área asignada' };
  }

  try {
    await db
      .update(users)
      .set({
        area,
        updatedAt: new Date(),
      })
      .where(eq(users.id, context.userId));

    // Revalidate to reflect the change
    revalidatePath('/pending-assignment');
    revalidatePath('/dashboard', 'layout');

    return { success: true, area };
  } catch (error) {
    console.error('Error self-assigning area:', error);
    return { success: false, error: 'Error al asignar área' };
  }
}
