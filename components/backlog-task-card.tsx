'use client';

import { User, MoreVertical, Trash2, Star, GripVertical } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { deleteTask, toggleTaskCritical } from '@/app/actions/tasks';
import { TaskDetailDialog } from './task-detail-dialog';
import type { KanbanTaskData } from '@/app/actions/kanban';

/**
 * Extended task type for backlog that includes isCritical field
 */
export type BacklogTaskData = KanbanTaskData & {
  isCritical: boolean;
};

type BacklogTaskCardProps = {
  task: BacklogTaskData;
};

/**
 * BacklogTaskCard component - Renders a single task in the backlog list
 *
 * Features:
 * - Red border and "CRÍTICO" badge for critical tasks
 * - Grip handle for drag indication
 * - Menu with delete and toggle critical options
 * - Click to open task detail dialog
 */
export function BacklogTaskCard({ task }: BacklogTaskCardProps) {
  const router = useRouter();
  const [showMenu, setShowMenu] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isTogglingCritical, setIsTogglingCritical] = useState(false);
  const [showDetail, setShowDetail] = useState(false);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
    disabled: showMenu || showDetail,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  async function handleDelete(e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm('¿Estás seguro de que quieres eliminar esta tarea?')) return;

    setIsDeleting(true);
    const result = await deleteTask({ taskId: task.id });
    setIsDeleting(false);
    setShowMenu(false);

    if (result.success) {
      toast.success('Tarea eliminada');
      router.refresh();
    } else {
      toast.error(result.error || 'Error al eliminar la tarea');
    }
  }

  async function handleToggleCritical(e: React.MouseEvent) {
    e.stopPropagation();
    setIsTogglingCritical(true);
    const result = await toggleTaskCritical({ taskId: task.id });
    setIsTogglingCritical(false);
    setShowMenu(false);

    if (result.success) {
      toast.success(task.isCritical ? 'Prioridad crítica removida' : 'Marcada como crítica');
      router.refresh();
    } else {
      toast.error(result.error || 'Error al cambiar prioridad');
    }
  }

  function handleCardClick() {
    if (showMenu) return;
    setShowDetail(true);
  }

  // Dynamic styles based on critical status
  const borderClass = task.isCritical
    ? 'border-red-500/60 hover:border-red-400'
    : 'border-white/10 hover:border-[var(--accent-primary)]';

  const shadowClass = task.isCritical
    ? 'hover:shadow-[0_0_30px_rgba(239,68,68,0.3),0_12px_40px_oklch(0.10_0.02_250/0.5)]'
    : 'hover:shadow-[0_0_30px_var(--glow-cyan),0_12px_40px_oklch(0.10_0.02_250/0.5)]';

  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        onClick={handleCardClick}
        data-testid={`backlog-task-card-${task.id}`}
        data-task-id={task.id}
        data-is-critical={task.isCritical}
        className={`group relative flex cursor-grab items-start gap-3 rounded-xl border p-4 backdrop-blur-[40px] transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] hover:backdrop-blur-[60px] hover:saturate-[180%] hover:-translate-y-0.5 ${borderClass} ${shadowClass} ${
          isDragging ? 'z-50 scale-105 opacity-50' : ''
        } ${isDeleting ? 'scale-95 opacity-20' : ''}`}
        {...(isDragging || isDeleting
          ? {}
          : {
              style: {
                ...style,
                background: 'var(--glass-dark)',
              },
            })}
      >
        {/* Grip Handle */}
        <div
          {...attributes}
          {...listeners}
          className="flex-shrink-0 cursor-grab text-muted-foreground/50 hover:text-muted-foreground transition-colors"
        >
          <GripVertical className="h-5 w-5" />
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1">
          {/* Critical Badge */}
          {task.isCritical && (
            <span className="mb-2 inline-flex items-center gap-1 rounded-full bg-red-500/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-red-400">
              <Star className="h-3 w-3 fill-current" />
              Crítico
            </span>
          )}

          {/* Task title */}
          <h4 className="mb-1 pr-6 font-semibold text-foreground tracking-tight">
            {task.title}
          </h4>

          {/* Task description (if exists) */}
          {task.description && (
            <p className="mb-3 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
              {task.description}
            </p>
          )}

          {/* Footer: Assignee */}
          <div className="flex items-center gap-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70">
            {task.assignee ? (
              <>
                <div className="relative h-5 w-5">
                  <img
                    src={task.assignee.imageUrl || '/placeholder-avatar.png'}
                    alt={task.assignee.name}
                    className="h-full w-full rounded-full object-cover ring-1 ring-white/10"
                  />
                </div>
                <span className="truncate max-w-[120px]">{task.assignee.name}</span>
              </>
            ) : (
              <>
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-white/5 ring-1 ring-white/10">
                  <User className="h-3 w-3" />
                </div>
                <span>Sin asignar</span>
              </>
            )}
          </div>
        </div>

        {/* Menu Button */}
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
              className="absolute right-0 top-8 w-44 rounded-xl border border-white/10 bg-neutral-900/90 p-1 shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-200"
              onMouseLeave={() => setShowMenu(false)}
            >
              {/* Toggle Critical */}
              <button
                onClick={handleToggleCritical}
                disabled={isTogglingCritical}
                className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-medium transition-colors ${
                  task.isCritical
                    ? 'text-muted-foreground hover:bg-white/5'
                    : 'text-amber-400 hover:bg-amber-500/10'
                }`}
              >
                <Star className={`h-3.5 w-3.5 ${task.isCritical ? '' : 'fill-current'}`} />
                {task.isCritical ? 'Quitar crítico' : 'Marcar crítico'}
              </button>

              {/* Delete */}
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-bold text-red-400 hover:bg-red-500/10 transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Eliminar tarea
              </button>
            </div>
          )}
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
