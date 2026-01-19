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
  closestCenter,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { InboxIcon } from 'lucide-react';
import { BacklogTaskCard, type BacklogTaskData } from './backlog-task-card';

type BacklogListProps = {
  initialTasks: BacklogTaskData[];
};

/**
 * BacklogList component - Renders a sortable list of backlog tasks
 *
 * Features:
 * - Visual drag & drop reordering (does NOT persist to DB per spec)
 * - Uses verticalListSortingStrategy for smooth vertical animations
 * - Empty state when no tasks exist
 * - DragOverlay shows task being dragged
 */
export function BacklogList({ initialTasks }: BacklogListProps) {
  // Local state for visual reordering (not persisted)
  const [tasks, setTasks] = useState<BacklogTaskData[]>(initialTasks);
  const [activeTask, setActiveTask] = useState<BacklogTaskData | null>(null);

  // Configure sensors - require 5px movement to start drag
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    })
  );

  function handleDragStart(event: DragStartEvent) {
    const { active } = event;
    const taskId = active.id as string;
    const task = tasks.find((t) => t.id === taskId);
    if (task) {
      setActiveTask(task);
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveTask(null);

    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    if (activeId !== overId) {
      setTasks((items) => {
        const oldIndex = items.findIndex((item) => item.id === activeId);
        const newIndex = items.findIndex((item) => item.id === overId);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  }

  // Empty state
  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white/5 ring-1 ring-white/10">
          <InboxIcon className="h-8 w-8 text-muted-foreground/50" />
        </div>
        <h3 className="mb-2 text-lg font-semibold text-foreground">
          No hay tareas en el backlog
        </h3>
        <p className="text-sm text-muted-foreground">
          ¡Crea una nueva tarea para comenzar!
        </p>
      </div>
    );
  }

  const taskIds = tasks.map((task) => task.id);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
        <div className="flex flex-col gap-3">
          {tasks.map((task) => (
            <BacklogTaskCard key={task.id} task={task} />
          ))}
        </div>
      </SortableContext>

      {/* Drag Overlay - Shows dragged task while dragging */}
      <DragOverlay>
        {activeTask ? (
          <div className="rotate-2 scale-105 opacity-90">
            <BacklogTaskCard task={activeTask} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
