'use server';

import { cookies } from 'next/headers';
import { getAreaContext, type Area } from '@/lib/area-context';
import { revalidatePath } from 'next/cache';

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
