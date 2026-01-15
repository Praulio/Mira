'use client';

import { useState } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from '@dnd-kit/core';
import { KanbanColumn } from './kanban-column';
import { TaskCard } from './task-card';
import type { KanbanData, KanbanTaskData } from '@/app/actions/kanban';
import { updateTaskStatus } from '@/app/actions/tasks';

type KanbanBoardProps = {
  initialData: KanbanData;
};

/**
 * KanbanBoard - Client Component wrapper that handles drag and drop functionality
 * 
 * Following React Best Practices:
 * - Lazy state initialization (Best Practice 5.5)
 * - Minimal client-side logic - delegates to server actions
 * - Uses DndContext from @dnd-kit for drag and drop
 * 
 * Architecture:
 * - Wraps KanbanColumn components with DnD context
 * - Handles drag events and calls updateTaskStatus server action
 * - Shows drag overlay for better UX
 */
export function KanbanBoard({ initialData }: KanbanBoardProps) {
  // State for drag overlay
  const [activeTask, setActiveTask] = useState<KanbanTaskData | null>(null);

  // Configure sensors for drag detection
  // PointerSensor requires 5px movement to start drag (prevents accidental drags on click)
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    })
  );

  // Handle drag start - set active task for overlay
  function handleDragStart(event: DragStartEvent) {
    const { active } = event;
    const taskId = active.id as string;

    // Find the task being dragged
    const allTasks = [
      ...initialData.backlog,
      ...initialData.todo,
      ...initialData.in_progress,
      ...initialData.done,
    ];
    const task = allTasks.find((t) => t.id === taskId);

    if (task) {
      setActiveTask(task);
    }
  }

  // Handle drag end - update task status if dropped in different column
  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    // Clear active task overlay
    setActiveTask(null);

    if (!over) {
      // Dropped outside a droppable area
      return;
    }

    const taskId = active.id as string;
    const newStatus = over.id as 'backlog' | 'todo' | 'in_progress' | 'done';

    // Find the current task to check if status changed
    const allTasks = [
      ...initialData.backlog,
      ...initialData.todo,
      ...initialData.in_progress,
      ...initialData.done,
    ];
    const task = allTasks.find((t) => t.id === taskId);

    if (!task) {
      console.error('Task not found:', taskId);
      return;
    }

    // Only update if status actually changed
    if (task.status === newStatus) {
      return;
    }

    // Call server action to update task status
    // This will trigger revalidation and update the UI
    const result = await updateTaskStatus({ taskId, newStatus });

    if (!result.success) {
      console.error('Failed to update task status:', result.error);
      // TODO: Task 4.3 - Show toast notification for errors
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      {/* Kanban Board - 4 columns */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KanbanColumn
          id="backlog"
          title="Backlog"
          tasks={initialData.backlog}
          statusColor="neutral"
        />
        <KanbanColumn
          id="todo"
          title="To Do"
          tasks={initialData.todo}
          statusColor="blue"
        />
        <KanbanColumn
          id="in_progress"
          title="In Progress"
          tasks={initialData.in_progress}
          statusColor="amber"
        />
        <KanbanColumn
          id="done"
          title="Done"
          tasks={initialData.done}
          statusColor="green"
        />
      </div>

      {/* Drag Overlay - Shows dragged task while dragging */}
      <DragOverlay>
        {activeTask ? (
          <div className="rotate-3 opacity-80">
            <TaskCard task={activeTask} isDragging />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
