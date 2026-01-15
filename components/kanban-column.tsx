'use client';

import { useDroppable } from '@dnd-kit/core';
import { TaskCard } from './task-card';
import type { KanbanTaskData } from '@/app/actions/kanban';

type KanbanColumnProps = {
  id: string;
  title: string;
  tasks: KanbanTaskData[];
  statusColor: 'neutral' | 'blue' | 'amber' | 'green';
};

/**
 * Get badge color classes based on status
 */
function getColorClasses(color: 'neutral' | 'blue' | 'amber' | 'green'): {
  badge: string;
  count: string;
} {
  switch (color) {
    case 'blue':
      return {
        badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
        count: 'text-blue-600 dark:text-blue-400',
      };
    case 'amber':
      return {
        badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
        count: 'text-amber-600 dark:text-amber-400',
      };
    case 'green':
      return {
        badge: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
        count: 'text-green-600 dark:text-green-400',
      };
    default:
      return {
        badge: 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-400',
        count: 'text-neutral-600 dark:text-neutral-400',
      };
  }
}

/**
 * KanbanColumn component - Renders a single droppable column in the Kanban board
 * 
 * Following React Best Practices:
 * - Client Component for drop interaction
 * - Renders list of TaskCard components
 * - Static structure with dynamic content
 * - Uses @dnd-kit/core for drag and drop
 */
export function KanbanColumn({ id, title, tasks, statusColor }: KanbanColumnProps) {
  const colors = getColorClasses(statusColor);
  const { setNodeRef, isOver } = useDroppable({
    id,
  });

  return (
    <div
      ref={setNodeRef}
      className={`flex min-h-[600px] flex-col rounded-lg border border-neutral-200 bg-neutral-50 transition-colors dark:border-neutral-800 dark:bg-neutral-900/50 ${
        isOver ? 'border-blue-500 bg-blue-50/50 dark:border-blue-500 dark:bg-blue-900/20' : ''
      }`}
    >
      {/* Column Header */}
      <div className="flex items-center justify-between border-b border-neutral-200 p-4 dark:border-neutral-800">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-neutral-700 dark:text-neutral-300">
            {title}
          </h3>
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${colors.badge}`}
          >
            {tasks.length}
          </span>
        </div>
      </div>

      {/* Column Content */}
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {tasks.length > 0 ? (
          tasks.map((task) => <TaskCard key={task.id} task={task} />)
        ) : (
          <div className="flex h-32 items-center justify-center rounded-lg border-2 border-dashed border-neutral-300 bg-white dark:border-neutral-700 dark:bg-neutral-900">
            <p className="text-sm text-neutral-500 dark:text-neutral-500">
              No tasks
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
