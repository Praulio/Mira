'use client';

import Image from 'next/image';
import { Clock, User, MoreVertical, Trash2, Edit3, ExternalLink } from 'lucide-react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { useState } from 'react';
import { toast } from 'sonner';
import { deleteTask } from '@/app/actions/tasks';
import { TaskDetailDialog } from './task-detail-dialog';
import type { KanbanTaskData } from '@/app/actions/kanban';

type TaskCardProps = {
  task: KanbanTaskData;
  isDragging?: boolean;
};

/**
 * TaskCard component - Renders a single task in the Kanban board
 */
export function TaskCard({ task, isDragging = false }: TaskCardProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDetail, setShowDetail] = useState(false);

  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: task.id,
    disabled: showMenu || showDetail, // Disable drag when interaction is happening
  });

  async function handleDelete(e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this task?')) return;

    setIsDeleting(true);
    const result = await deleteTask({ taskId: task.id });
    setIsDeleting(false);

    if (result.success) {
      toast.success('Task deleted');
    } else {
      toast.error(result.error || 'Failed to delete task');
    }
  }

  // Handle opening detail
  function handleCardClick(e: React.MouseEvent) {
    if (showMenu) return;
    setShowDetail(true);
  }

  // Apply transform for smooth dragging animation
  const style = transform
    ? {
        transform: CSS.Translate.toString(transform),
      }
    : undefined;

  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        {...listeners}
        {...attributes}
        onClick={handleCardClick}
        data-testid={`task-card-${task.id}`}
        data-task-id={task.id}
        data-task-status={task.status}
        className={`group relative cursor-grab rounded-xl border border-white/10 bg-card/40 p-4 shadow-lg backdrop-blur-md transition-all hover:border-white/20 hover:bg-card/60 hover:shadow-xl dark:border-white/5 dark:bg-neutral-800/40 ${
          isDragging ? 'z-50 scale-105 opacity-50' : ''
        } ${isDeleting ? 'scale-95 opacity-20' : ''}`}
      >
        {/* Quick Menu Button */}
        <div className="absolute right-2 top-2 z-10">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(!showMenu);
            }}
            className="rounded-full p-1 opacity-0 group-hover:opacity-100 transition-all hover:bg-white/10 text-muted-foreground hover:text-foreground"
          >
            <MoreVertical className="h-4 w-4" />
          </button>

          {showMenu && (
            <div 
              className="absolute right-0 top-8 w-32 rounded-xl border border-white/10 bg-neutral-900/90 p-1 shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-200"
              onMouseLeave={() => setShowMenu(false)}
            >
              <button
                onClick={handleDelete}
                className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-bold text-red-400 hover:bg-red-500/10 transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete Task
              </button>
            </div>
          )}
        </div>

        {/* Task title */}
        <h4 className="mb-2 pr-6 font-semibold text-foreground tracking-tight">
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
                <img
                  src={task.assignee.imageUrl || '/placeholder-avatar.png'}
                  alt={task.assignee.name}
                  className="h-full w-full rounded-full object-cover ring-1 ring-white/10"
                />
              </div>
            ) : (
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-white/5 ring-1 ring-white/10">
                <User className="h-3 w-3" />
              </div>
            )}
            <span className="truncate max-w-[80px]">{task.assignee?.name || 'Unassigned'}</span>
          </div>

          {/* Status Indicator */}
          <div 
            className="h-1.5 w-1.5 rounded-full" 
            style={{ backgroundColor: `var(--status-${task.status.replace('_', '')})` }}
          />
        </div>
      </div>

      <TaskDetailDialog 
        task={task} 
        isOpen={showDetail} 
        onClose={() => setShowDetail(false)} 
      />
    </>
  );
}
