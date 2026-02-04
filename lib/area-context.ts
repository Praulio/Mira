import { cookies } from 'next/headers';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getAuth } from '@/lib/mock-auth';

export type Area = 'desarrollo' | 'agencia';
export type UserRole = 'user' | 'superadmin';

export type AreaContext = {
  currentArea: Area;
  userRole: UserRole;
  userArea: Area | null;
  canSwitchArea: boolean;
  isAssigned: boolean;
  userId: string;
};

const AREA_COOKIE_NAME = 'mira_selected_area';

/**
 * Gets the area context for the current user.
 * - Superadmins can switch between areas via cookie
 * - Regular users see only their assigned area
 * - Users without area assignment get isAssigned: false
 */
export async function getAreaContext(): Promise<AreaContext | null> {
  const { userId } = await getAuth();

  if (!userId) return null;

  const [user] = await db
    .select({ area: users.area, role: users.role })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) return null;

  const userRole = user.role as UserRole;
  const userArea = user.area as Area | null;
  const isSuperadmin = userRole === 'superadmin';

  // User without assigned area (and not superadmin)
  if (!userArea && !isSuperadmin) {
    return {
      currentArea: 'desarrollo', // fallback, won't be used
      userRole,
      userArea: null,
      canSwitchArea: false,
      isAssigned: false,
      userId,
    };
  }

  // For superadmin, read selected area from cookie
  let currentArea: Area = userArea || 'desarrollo';

  if (isSuperadmin) {
    const cookieStore = await cookies();
    const selectedArea = cookieStore.get(AREA_COOKIE_NAME)?.value as Area | undefined;
    if (selectedArea && ['desarrollo', 'agencia'].includes(selectedArea)) {
      currentArea = selectedArea;
    }
  }

  return {
    currentArea,
    userRole,
    userArea,
    canSwitchArea: isSuperadmin,
    isAssigned: userArea !== null || isSuperadmin,
    userId,
  };
}

/**
 * Gets just the current area (for quick queries).
 * Throws if user is not assigned to any area.
 */
export async function getCurrentArea(): Promise<Area> {
  const context = await getAreaContext();

  if (!context) {
    throw new Error('Not authenticated');
  }

  if (!context.isAssigned) {
    throw new Error('User not assigned to any area');
  }

  return context.currentArea;
}

/**
 * Gets area context or redirects unassigned users.
 * Use this in pages that require area assignment.
 */
export async function requireAreaContext(): Promise<AreaContext> {
  const context = await getAreaContext();

  if (!context) {
    throw new Error('Not authenticated');
  }

  if (!context.isAssigned) {
    throw new Error('User not assigned to any area');
  }

  return context;
}
