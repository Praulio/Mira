'use client';

import { useDroppable } from '@dnd-kit/core';
import { History } from 'lucide-react';
import Link from 'next/link';
import { TaskCard } from './task-card';
import type { KanbanTaskData } from '@/app/actions/kanban';

type KanbanColumnProps = {
  id: string;
  title: string;
  tasks: KanbanTaskData[];
  statusColor: 'neutral' | 'blue' | 'amber' | 'green';
  isFiltered?: boolean;
};

/**
 * KanbanColumn component - Renders a single droppable column in the Kanban board
 * 
 * Following React Best Practices:
 * - Client Component for drop interaction
 * - Renders list of TaskCard components
 * - Static structure with dynamic content
 * - Uses @dnd-kit/core for drag and drop
 */
export function KanbanColumn({ id, title, tasks, isFiltered }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id,
  });

  return (
    <div
      ref={setNodeRef}
      data-testid={`kanban-column-${id}`}
      data-column-id={id}
      className={`flex min-h-[600px] flex-col rounded-lg border border-border bg-card/50 transition-colors ${
        isOver ? 'border-primary bg-primary/5' : ''
      }`}
    >
      {/* Column Header */}
      <div className="kanban-column-header flex items-center justify-between p-4">
        <div className="flex items-center gap-2">
          <div 
            className="h-2 w-2 rounded-full" 
            style={{ backgroundColor: `var(--status-${id.replace('_', '')})` }}
          />
          <h3 className="text-sm font-semibold uppercase tracking-wide text-foreground/80">
            {title}
          </h3>
          <span
            className="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground"
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
              {isFiltered ? 'No tienes tareas en esta etapa' : 'Sin tareas'}
            </p>
          </div>
        )}

        {/* History link for Done column */}
        {id === 'done' && (
          <Link
            href="/dashboard/kanban/historial"
            className="mt-4 flex items-center justify-center gap-2 rounded-lg border border-dashed border-white/10 bg-white/5 px-4 py-3 text-sm text-muted-foreground transition-colors hover:bg-white/10 hover:text-foreground"
          >
            <History className="h-4 w-4" />
            Ver historial completo
          </Link>
        )}
      </div>
    </div>
  );
}
