import Image from 'next/image';
import { User } from 'lucide-react';
import type { TeamSlotData } from '@/app/actions/team';

type TeamSlotProps = {
  data: TeamSlotData | null;
  slotNumber: number;
};

/**
 * TeamSlot Component - Displays a single user slot in the Team View grid
 * 
 * Shows:
 * - User avatar, name
 * - Current in-progress task (if any)
 * - Time elapsed since task started
 * - Empty state if no user assigned or no active task
 * 
 * Following React Best Practices:
 * - Pure presentational component (no data fetching)
 * - Minimal props across component boundary (Best Practice: 3.2)
 * - Static elements hoisted where possible
 */
export function TeamSlot({ data, slotNumber }: TeamSlotProps) {
  // Empty slot - no user assigned yet
  if (!data) {
    return (
      <div className="flex h-48 flex-col items-center justify-center rounded-lg border-2 border-dashed border-neutral-300 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-900">
        <div className="text-center text-sm text-neutral-500 dark:text-neutral-400">
          <User className="mx-auto mb-2 h-8 w-8 opacity-30" />
          <p className="font-medium">Slot {slotNumber}</p>
          <p className="text-xs">Empty</p>
        </div>
      </div>
    );
  }

  const { user, inProgressTask } = data;

  // Calculate time elapsed since task started (if task exists)
  const timeElapsed = inProgressTask
    ? getTimeElapsed(inProgressTask.updatedAt)
    : null;

  return (
    <div className="group flex h-48 flex-col rounded-lg border border-neutral-200 bg-white p-4 transition-all hover:border-neutral-300 hover:shadow-md dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-neutral-700">
      {/* User Info */}
      <div className="mb-3 flex items-center gap-3">
        {user.imageUrl ? (
          <Image
            src={user.imageUrl}
            alt={user.name}
            width={40}
            height={40}
            className="h-10 w-10 rounded-full"
          />
        ) : (
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-neutral-200 dark:bg-neutral-800">
            <User className="h-5 w-5 text-neutral-600 dark:text-neutral-400" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-neutral-900 dark:text-neutral-100">
            {user.name}
          </p>
          <p className="truncate text-xs text-neutral-500 dark:text-neutral-400">
            {user.email}
          </p>
        </div>
      </div>

      {/* Task Info or Empty State */}
      <div className="flex-1">
        {inProgressTask ? (
          <div className="space-y-2">
            {/* Status Badge */}
            <div className="inline-flex items-center rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
              In Progress
            </div>
            
            {/* Task Title */}
            <p className="line-clamp-2 text-sm font-medium text-neutral-900 dark:text-neutral-100">
              {inProgressTask.title}
            </p>
            
            {/* Time Elapsed */}
            {timeElapsed && (
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                {timeElapsed}
              </p>
            )}
          </div>
        ) : (
          <div className="flex h-full items-center justify-center">
            <p className="text-center text-xs text-neutral-500 dark:text-neutral-400">
              No active task
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Calculate human-readable time elapsed since a given date
 * 
 * Following React Best Practices:
 * - Pure utility function (no side effects)
 * - Early return pattern (Best Practice: 7.8)
 */
function getTimeElapsed(startDate: Date): string {
  const now = new Date();
  const elapsed = now.getTime() - new Date(startDate).getTime();
  
  // Convert to minutes
  const minutes = Math.floor(elapsed / 1000 / 60);
  
  if (minutes < 1) {
    return 'Just now';
  }
  
  if (minutes < 60) {
    return `${minutes}m ago`;
  }
  
  const hours = Math.floor(minutes / 60);
  
  if (hours < 24) {
    return `${hours}h ago`;
  }
  
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
