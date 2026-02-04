'use client';

import { User, MoreVertical, Trash2, Clock, Paperclip, CalendarDays, AlertTriangle } from 'lucide-react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { toast } from 'sonner';
import { deleteTask, updateTaskProgress } from '@/app/actions/tasks';
import { TaskDetailDialog } from './task-detail-dialog';
import { formatDuration } from '@/lib/format-duration';
import { renderMentions } from '@/components/mention-input';
import type { KanbanTaskData } from '@/app/actions/kanban';

type TaskCardProps = {
  task: KanbanTaskData;
  isDragging?: boolean;
};

/**
 * Calculate due date status for visual indicators
 * @returns 'overdue' (red), 'soon' (yellow), 'normal' (neutral), or null
 */
function getDueDateStatus(dueDate: Date | null): 'overdue' | 'soon' | 'normal' | null {
  if (!dueDate) return null;
  const now = new Date();
  const diffMs = dueDate.getTime() - now.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);

  if (diffHours < 0) return 'overdue';      // Vencida (ROJO)
  if (diffHours <= 24) return 'soon';       // Próxima 24h (AMARILLO)
  return 'normal';                          // Normal
}

/**
 * Format due date for display
 */
function formatDueDate(date: Date): string {
  return date.toLocaleDateString('es-MX', {
    day: 'numeric',
    month: 'short',
  });
}

/**
 * TaskCard component - Renders a single task in the Kanban board
 */
export function TaskCard({ task, isDragging = false }: TaskCardProps) {
  const router = useRouter();
  const { user } = useUser();
  const [showMenu, setShowMenu] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [isSavingProgress, setIsSavingProgress] = useState(false);
  // null = not editing (use task.progress), number = actively dragging
  const [editingProgress, setEditingProgress] = useState<number | null>(null);

  // Can user edit progress? Only in in_progress, and only assignee or creator (if no assignee)
  const canEditProgress =
    task.status === 'in_progress' && (
      user?.id === task.assignee?.id ||
      (!task.assignee && user?.id === task.creator.id)
    );

  // Display value: use editingProgress while dragging, otherwise use task.progress
  const displayProgress = editingProgress !== null ? editingProgress : task.progress;

  async function handleProgressSave() {
    if (editingProgress === null || editingProgress === task.progress) {
      setEditingProgress(null);
      return;
    }
    setIsSavingProgress(true);
    const result = await updateTaskProgress({ taskId: task.id, progress: editingProgress });
    if (result.success) {
      router.refresh();
    } else {
      toast.error(result.error || 'Error al guardar progreso');
    }
    setIsSavingProgress(false);
    setEditingProgress(null);
  }

  function handleProgressChange(newValue: number) {
    setEditingProgress(newValue);
  }

  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: task.id,
    disabled: showMenu || showDetail, // Disable drag when interaction is happening
  });

  // Calculate if this is an in_progress task that needs live updates
  const isInProgressWithTime = task.status === 'in_progress' && !!task.startedAt;

  // Static duration for completed tasks (memoized to avoid recalculation)
  const staticDuration = useMemo(
    () => formatDuration(task.startedAt, task.completedAt),
    [task.startedAt, task.completedAt]
  );

  // Live duration state only used for in_progress tasks with timer
  const [liveCounter, setLiveCounter] = useState(0);

  // Timer effect: only runs for in_progress tasks, increments counter every minute
  useEffect(() => {
    if (!isInProgressWithTime) {
      return;
    }

    // Update every minute for live display
    const interval = setInterval(() => {
      setLiveCounter((c) => c + 1);
    }, 60000); // 60 seconds

    return () => clearInterval(interval);
  }, [isInProgressWithTime]);

  // Calculate display duration: for in_progress use live calculation, otherwise use static
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _forceUpdate = liveCounter; // Ensure re-render when counter changes
  const displayDuration = isInProgressWithTime
    ? formatDuration(task.startedAt, null)
    : staticDuration;

  async function handleDelete(e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this task?')) return;

    setIsDeleting(true);
    const result = await deleteTask({ taskId: task.id });
    setIsDeleting(false);

    if (result.success) {
      toast.success('Task deleted');
      router.refresh();
    } else {
      toast.error(result.error || 'Failed to delete task');
    }
  }

  // Handle opening detail
  function handleCardClick() {
    if (showMenu) return;
    setShowDetail(true);
  }

  // Apply transform for smooth dragging animation
  const style = transform
    ? {
        transform: CSS.Translate.toString(transform),
      }
    : undefined;

  // Check if task is blocked for styling
  const isBlocked = !!task.blockerReason;

  // Merge transform and custom styles
  const cardStyle = {
    ...style,
    ...(isDragging || isDeleting
      ? {}
      : {
          background: 'var(--glass-dark)',
          border: isBlocked
            ? '1px solid var(--border-blocked)'
            : '1px solid var(--border-subtle)',
          boxShadow: isBlocked
            ? '0 0 20px var(--glow-blocked)'
            : undefined,
        }
    ),
  };

  return (
    <>
      <div
        ref={setNodeRef}
        style={cardStyle}
        {...listeners}
        {...attributes}
        onClick={handleCardClick}
        data-testid={`task-card-${task.id}`}
        data-task-id={task.id}
        data-task-status={task.status}
        className={`group relative cursor-grab rounded-xl p-4 backdrop-blur-[40px] transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] hover:backdrop-blur-[60px] hover:saturate-[180%] hover:-translate-y-0.5 hover:shadow-[0_0_30px_var(--glow-cyan),0_12px_40px_oklch(0.10_0.02_250/0.5)] ${
          isDragging ? 'z-50 scale-105 opacity-50' : ''
        } ${isDeleting ? 'scale-95 opacity-20' : ''}`}
        onMouseEnter={(e) => {
          if (!isDragging && !isDeleting) {
            e.currentTarget.style.background = 'var(--glass-medium)';
            e.currentTarget.style.borderColor = isBlocked
              ? 'var(--status-blocked)'
              : 'var(--accent-primary)';
          }
        }}
        onMouseLeave={(e) => {
          if (!isDragging && !isDeleting) {
            e.currentTarget.style.background = 'var(--glass-dark)';
            e.currentTarget.style.borderColor = isBlocked
              ? 'var(--border-blocked)'
              : 'var(--border-subtle)';
          }
        }}
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

        {/* Blocker badge - shown when task is blocked */}
        {task.blockerReason && (
          <div className="mb-2 flex items-center gap-1.5 rounded-full bg-[var(--status-blocked-bg)] px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--status-blocked)]">
            <AlertTriangle className="h-3 w-3" />
            <span>Bloqueada</span>
          </div>
        )}

        {/* Blocker reason - shown when task is blocked */}
        {task.blockerReason && (
          <p className="mb-3 line-clamp-2 text-xs text-[var(--status-blocked)] bg-[var(--status-blocked-bg)] rounded-lg p-2 border border-[var(--border-blocked)]">
            {task.blockerReason}
          </p>
        )}

        {/* Task description (if exists) - with mention chips */}
        {task.description && (
          <p className="mb-4 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
            {renderMentions(task.description)}
          </p>
        )}

        {/* Progress bar / slider - hidden when done */}
        {task.status !== 'done' && (
          canEditProgress ? (
            // Editable slider for in_progress tasks when user has permission
            <div
              className="mb-3"
              onClick={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
            >
              <input
                type="range"
                min="0"
                max="100"
                value={displayProgress}
                onChange={(e) => handleProgressChange(Number(e.target.value))}
                onMouseUp={handleProgressSave}
                onTouchEnd={handleProgressSave}
                disabled={isSavingProgress}
                className="w-full h-1.5 rounded-full bg-white/10 accent-primary cursor-pointer disabled:opacity-50"
              />
            </div>
          ) : task.progress > 0 ? (
            // Read-only progress bar for other statuses or users without permission
            <div className="mb-3 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${task.progress}%` }}
              />
            </div>
          ) : null
        )}

        {/* Footer: Assignee, attachments, and duration/status */}
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

          {/* Right side: due date + attachment count + duration/status */}
          <div className="flex items-center gap-2">
            {/* Due date badge */}
            {task.dueDate && (() => {
              const status = getDueDateStatus(task.dueDate);
              const colorClasses = {
                overdue: 'text-red-400 bg-red-500/10',
                soon: 'text-amber-400 bg-amber-500/10',
                normal: 'text-muted-foreground bg-white/5',
              };
              return (
                <div
                  className={`flex items-center gap-1 rounded-md px-1.5 py-0.5 ${colorClasses[status || 'normal']}`}
                >
                  <CalendarDays className="h-3 w-3" />
                  <span>{formatDueDate(task.dueDate)}</span>
                </div>
              );
            })()}

            {/* Attachment indicator */}
            {task.attachmentCount > 0 && (
              <div className="flex items-center gap-0.5 text-muted-foreground/70">
                <Paperclip className="h-3 w-3" />
                <span>{task.attachmentCount}</span>
              </div>
            )}

            {/* Duration (for done/in_progress) or Status Indicator */}
            {(task.status === 'done' || task.status === 'in_progress') && displayDuration !== '-' ? (
              <div
                className={`flex items-center gap-1 ${
                  task.status === 'done'
                    ? 'text-emerald-400'
                    : 'text-amber-400 animate-pulse'
                }`}
              >
                <Clock className="h-3 w-3" />
                <span>{displayDuration}</span>
              </div>
            ) : (
              <div
                className="h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: `var(--status-${task.status.replace('_', '')})` }}
              />
            )}
          </div>
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
