'use client';

import Image from 'next/image';
import { Clock, User } from 'lucide-react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import type { KanbanTaskData } from '@/app/actions/kanban';

type TaskCardProps = {
  task: KanbanTaskData;
  isDragging?: boolean;
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
 * TaskCard component - Renders a single task in the Kanban board (Draggable)
 * 
 * Following React Best Practices:
 * - Client Component for drag interaction
 * - Next.js Image component for avatar optimization (Best Practice 2.1)
 * - Static JSX structure hoisted (Best Practice 6.3)
 * - Uses @dnd-kit/core for drag and drop
 */
export function TaskCard({ task, isDragging = false }: TaskCardProps) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: task.id,
  });

  // Apply transform for smooth dragging animation
  const style = transform
    ? {
        transform: CSS.Translate.toString(transform),
      }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      data-testid={`task-card-${task.id}`}
      data-task-id={task.id}
      data-task-status={task.status}
      className={`group cursor-grab rounded-xl border border-white/10 bg-card/40 p-4 shadow-lg backdrop-blur-md transition-all hover:border-white/20 hover:bg-card/60 hover:shadow-xl dark:border-white/5 dark:bg-neutral-800/40 ${
        isDragging ? 'z-50 scale-105 opacity-50' : ''
      }`}
    >
      {/* Task title */}
      <h4 className="mb-2 font-semibold text-foreground tracking-tight">
        {task.title}
      </h4>

      {/* Task description (if exists) */}
      {task.description && (
        <p className="mb-4 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
          {task.description}
        </p>
      )}

      {/* Footer: Assignee and time */}
      <div className="flex items-center justify-between border-t border-white/5 pt-3 text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70">
        {/* Assignee */}
        <div className="flex items-center gap-2">
          {task.assignee ? (
            <div className="relative h-5 w-5">
              <Image
                src={task.assignee.imageUrl || '/placeholder-avatar.png'}
                alt={task.assignee.name}
                fill
                className="rounded-full object-cover ring-1 ring-white/10"
              />
            </div>
          ) : (
            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-white/5 ring-1 ring-white/10">
              <User className="h-3 w-3" />
            </div>
          )}
          <span className="truncate max-w-[80px]">{task.assignee?.name || 'Unassigned'}</span>
        </div>

        {/* Time updated */}
        <div className="flex items-center gap-1.5 opacity-60">
          <Clock className="h-3 w-3" />
          <span>{getRelativeTime(task.updatedAt)}</span>
        </div>
      </div>
    </div>
  );
}
