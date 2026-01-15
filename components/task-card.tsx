import Image from 'next/image';
import { Clock, User } from 'lucide-react';
import type { KanbanTaskData } from '@/app/actions/kanban';

type TaskCardProps = {
  task: KanbanTaskData;
};

/**
 * Get relative time string from date
 * Following Best Practice 7.8: Early return from functions
 */
function getRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;

  const diffWeeks = Math.floor(diffDays / 7);
  return `${diffWeeks}w ago`;
}

/**
 * TaskCard component - Renders a single task in the Kanban board
 * 
 * Following React Best Practices:
 * - Pure presentational component (no data fetching)
 * - Next.js Image component for avatar optimization (Best Practice 2.1)
 * - Static JSX structure hoisted (Best Practice 6.3)
 */
export function TaskCard({ task }: TaskCardProps) {
  return (
    <div className="group rounded-lg border border-neutral-200 bg-white p-3 shadow-sm transition-shadow hover:shadow-md dark:border-neutral-800 dark:bg-neutral-900">
      {/* Task title */}
      <h4 className="mb-2 font-medium text-neutral-900 dark:text-neutral-100">
        {task.title}
      </h4>

      {/* Task description (if exists) */}
      {task.description && (
        <p className="mb-3 line-clamp-2 text-sm text-neutral-600 dark:text-neutral-400">
          {task.description}
        </p>
      )}

      {/* Footer: Assignee and time */}
      <div className="flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-500">
        {/* Assignee */}
        <div className="flex items-center gap-1.5">
          {task.assignee ? (
            <>
              <Image
                src={task.assignee.imageUrl || '/placeholder-avatar.png'}
                alt={task.assignee.name}
                width={20}
                height={20}
                className="rounded-full"
              />
              <span className="truncate">{task.assignee.name}</span>
            </>
          ) : (
            <>
              <User className="h-4 w-4" />
              <span>Unassigned</span>
            </>
          )}
        </div>

        {/* Time updated */}
        <div className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          <span>{getRelativeTime(task.updatedAt)}</span>
        </div>
      </div>
    </div>
  );
}
