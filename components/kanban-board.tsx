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
import { toast } from 'sonner';
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
 * - Optimistic UI updates for instant feedback (Task 4.3)
 * - Minimal client-side logic - delegates to server actions
 * - Uses DndContext from @dnd-kit for drag and drop
 * 
 * Architecture:
 * - Wraps KanbanColumn components with DnD context
 * - Handles drag events and calls updateTaskStatus server action
 * - Shows drag overlay for better UX
 * - Implements optimistic updates: UI changes immediately, reverts on error
 */
export function KanbanBoard({ initialData }: KanbanBoardProps) {
  // State for drag overlay
  const [activeTask, setActiveTask] = useState<KanbanTaskData | null>(null);
  
  // State for optimistic UI updates
  // Following Best Practice 5.5: Lazy state initialization
  const [kanbanData, setKanbanData] = useState<KanbanData>(initialData);

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

    // Find the task being dragged from current state
    const allTasks = [
      ...kanbanData.backlog,
      ...kanbanData.todo,
      ...kanbanData.in_progress,
      ...kanbanData.done,
    ];
    const task = allTasks.find((t) => t.id === taskId);

    if (task) {
      setActiveTask(task);
    }
  }

  // Handle drag end - update task status if dropped in different column
  // Implements optimistic UI: updates immediately, reverts on error
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
      ...kanbanData.backlog,
      ...kanbanData.todo,
      ...kanbanData.in_progress,
      ...kanbanData.done,
    ];
    const task = allTasks.find((t) => t.id === taskId);

    if (!task) {
      console.error('Task not found:', taskId);
      toast.error('Task not found');
      return;
    }

    // Only update if status actually changed
    if (task.status === newStatus) {
      return;
    }

    const oldStatus = task.status;

    // OPTIMISTIC UPDATE: Immediately update local state
    // Following Best Practice 4.3: Optimistic UI for instant feedback
    setKanbanData((prev) => {
      // Remove task from old column
      const oldColumnTasks = prev[oldStatus].filter((t) => t.id !== taskId);
      
      // Add task to new column
      const updatedTask = { ...task, status: newStatus };
      const newColumnTasks = [...prev[newStatus], updatedTask];

      return {
        ...prev,
        [oldStatus]: oldColumnTasks,
        [newStatus]: newColumnTasks,
      };
    });

    // Call server action to persist the change
    const result = await updateTaskStatus({ taskId, newStatus });

    if (!result.success) {
      // REVERT: Restore original state on error
      setKanbanData((prev) => {
        // Remove task from new column
        const newColumnTasks = prev[newStatus].filter((t) => t.id !== taskId);
        
        // Restore task to old column
        const oldColumnTasks = [...prev[oldStatus], task];

        return {
          ...prev,
          [oldStatus]: oldColumnTasks,
          [newStatus]: newColumnTasks,
        };
      });

      // Show error notification
      toast.error(result.error || 'Failed to update task status');
      console.error('Failed to update task status:', result.error);
    } else {
      // Show success feedback
      toast.success('Task moved successfully');
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
          tasks={kanbanData.backlog}
          statusColor="neutral"
        />
        <KanbanColumn
          id="todo"
          title="To Do"
          tasks={kanbanData.todo}
          statusColor="blue"
        />
        <KanbanColumn
          id="in_progress"
          title="In Progress"
          tasks={kanbanData.in_progress}
          statusColor="amber"
        />
        <KanbanColumn
          id="done"
          title="Done"
          tasks={kanbanData.done}
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
