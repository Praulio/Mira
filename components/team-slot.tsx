import { User, Clock, Zap, AlertTriangle } from 'lucide-react';
import type { TeamSlotData } from '@/app/actions/team';

type TeamSlotProps = {
  data: TeamSlotData | null;
  slotNumber: number;
};

/**
 * TeamSlot Component - Professional Glassmorphism version
 */
export function TeamSlot({ data, slotNumber }: TeamSlotProps) {
  // Empty slot - no user assigned yet
  if (!data) {
    return (
      <div className="flex h-56 flex-col items-center justify-center rounded-2xl border border-white/5 bg-white/5 p-4 backdrop-blur-md transition-all hover:bg-white/10">
        <div className="text-center">
          <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full border-2 border-dashed border-white/10 bg-white/5 opacity-30">
            <User className="h-8 w-8 text-muted-foreground" />
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40">Espacio {slotNumber}</p>
          <p className="text-xs font-bold text-muted-foreground/60">Disponible</p>
        </div>
      </div>
    );
  }

  const { user, inProgressTasks } = data;

  // Multi-activity mode: count tasks, detect blockers
  const taskCount = inProgressTasks.length;
  const hasBlockedTask = inProgressTasks.some((t) => t.blockerReason);
  const firstTask = inProgressTasks[0] || null;
  const isActive = taskCount > 0;

  return (
    <div
      data-testid={`team-slot-${user.id}`}
      data-user-id={user.id}
      data-has-active-task={isActive}
      data-task-count={taskCount}
      className={`group relative flex h-56 flex-col overflow-hidden rounded-2xl transition-all duration-500 hover:scale-[1.02] hover:shadow-2xl ${
        isActive
          ? 'backdrop-blur-[80px] saturate-[200%]'
          : 'border border-white/10 bg-white/5 backdrop-blur-xl'
      }`}
      style={isActive ? {
        background: hasBlockedTask
          ? 'radial-gradient(circle at 50% 50%, var(--glow-blocked) 0%, transparent 70%), var(--glass-light)'
          : 'radial-gradient(circle at 50% 50%, var(--glow-cyan) 0%, transparent 70%), var(--glass-light)',
        border: hasBlockedTask ? '1px solid var(--border-blocked)' : '1px solid var(--accent-primary)',
        boxShadow: hasBlockedTask
          ? '0 0 40px var(--glow-blocked), 0 8px 32px oklch(0.10 0.02 30 / 0.6), inset 0 1px 0 oklch(0.80 0.15 30 / 0.2)'
          : '0 0 40px var(--glow-cyan), 0 8px 32px oklch(0.10 0.02 250 / 0.6), inset 0 1px 0 oklch(0.80 0.15 220 / 0.2)'
      } : undefined}
    >
      {/* Background decoration */}
      {isActive && (
        <div className={`absolute -right-4 -top-4 h-24 w-24 rounded-full blur-3xl ${
          hasBlockedTask ? 'bg-[var(--status-blocked)]/10' : 'bg-primary/10'
        }`} />
      )}

      {/* User Info Header */}
      <div className="relative z-10 p-5 pb-3 flex items-center gap-4">
        <div className="relative">
          <div className={`h-16 w-16 rounded-full p-1 transition-all duration-500 ${
            isActive
              ? hasBlockedTask
                ? 'bg-gradient-to-tr from-[var(--status-blocked)] to-orange-400'
                : 'bg-gradient-to-tr from-primary to-cyan-400'
              : 'bg-white/10'
          }`}>
            <img
              src={user.imageUrl || '/placeholder-avatar.png'}
              alt={user.name}
              className={`h-full w-full rounded-full object-cover transition-all duration-500 ${
                isActive ? 'scale-105' : ''
              }`}
            />
          </div>
          {isActive && (
            <div className={`absolute -right-1 bottom-0 flex h-6 w-6 items-center justify-center rounded-full shadow-lg ring-2 ring-background ${
              hasBlockedTask
                ? 'bg-[var(--status-blocked)] text-white'
                : 'bg-primary text-primary-foreground'
            }`}>
              {hasBlockedTask ? (
                <AlertTriangle className="h-3 w-3" />
              ) : (
                <Zap className="h-3 w-3 fill-current" />
              )}
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-base font-black tracking-tight text-foreground">
              {user.name || 'Anonymous'}
            </h3>
            {/* Task count badge when 2+ tasks */}
            {taskCount >= 2 && (
              <span className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-black ${
                hasBlockedTask
                  ? 'bg-[var(--status-blocked-bg)] text-[var(--status-blocked)]'
                  : 'bg-primary/20 text-primary'
              }`}>
                {hasBlockedTask && <AlertTriangle className="h-2.5 w-2.5" />}
                {taskCount} tareas
              </span>
            )}
          </div>
          <p className="truncate text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
            {user.email}
          </p>
        </div>
      </div>

      {/* Task Status Section */}
      <div className="relative z-10 mt-auto p-5 pt-0">
        {taskCount === 0 ? (
          // No tasks: Inactive state
          <div className="flex items-center gap-3 rounded-xl border border-dashed border-white/10 p-3 opacity-50">
            <div className="h-2 w-2 rounded-full bg-muted-foreground/40" />
            <p className="text-[10px] font-black uppercase tracking-widest">Inactivo • Sin tarea asignada</p>
          </div>
        ) : taskCount === 1 ? (
          // Single task: Original detailed view
          <SingleTaskView task={firstTask!} />
        ) : (
          // Multiple tasks: Compact list view (max 2 visible + "+N más")
          <MultiTaskView tasks={inProgressTasks} />
        )}
      </div>
    </div>
  );
}

// Type for in-progress task from TeamSlotData
type InProgressTask = {
  id: string;
  title: string;
  description: string | null;
  updatedAt: Date;
  startedAt: Date | null;
  progress: number;
  blockerReason: string | null;
};

/**
 * Single task view - detailed card with title, time, and progress
 */
function SingleTaskView({ task }: { task: InProgressTask }) {
  const timeElapsed = getTimeElapsed(task.startedAt || task.updatedAt);
  const isBlocked = !!task.blockerReason;

  return (
    <div className={`space-y-3 rounded-xl p-3 ring-1 ${
      isBlocked
        ? 'bg-[var(--status-blocked-bg)] ring-[var(--border-blocked)]'
        : 'bg-white/5 ring-white/10'
    }`}>
      <div className="flex items-center justify-between">
        <span className={`flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wider ${
          isBlocked ? 'text-[var(--status-blocked)]' : 'text-primary'
        }`}>
          {isBlocked ? (
            <>
              <AlertTriangle className="h-2.5 w-2.5" />
              Bloqueada
            </>
          ) : (
            <>
              <span className="relative flex h-2 w-2">
                <span className="relative inline-flex h-2 w-2 rounded-full bg-primary"></span>
              </span>
              Trabajando en
            </>
          )}
        </span>
        <span className="flex items-center gap-1 text-[9px] font-bold text-muted-foreground/60 uppercase">
          <Clock className="h-2.5 w-2.5" /> {timeElapsed}
        </span>
      </div>

      <p className={`line-clamp-2 text-xs font-bold leading-relaxed transition-colors ${
        isBlocked ? 'text-[var(--status-blocked)]' : 'text-foreground/90 group-hover:text-primary'
      }`}>
        {task.title}
      </p>

      {/* Blocker reason */}
      {isBlocked && task.blockerReason && (
        <p className="line-clamp-1 text-[10px] text-[var(--status-blocked)]/70 italic">
          {task.blockerReason}
        </p>
      )}

      {/* Progress bar - only shows if progress > 0 and not blocked */}
      {!isBlocked && task.progress > 0 && (
        <div className="space-y-1">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${task.progress}%` }}
            />
          </div>
          <span className="text-[9px] text-muted-foreground">{task.progress}%</span>
        </div>
      )}
    </div>
  );
}

/**
 * Multi-task view - compact list showing max 2 tasks with "+N más"
 */
function MultiTaskView({ tasks }: { tasks: InProgressTask[] }) {
  const visibleTasks = tasks.slice(0, 2);
  const remainingCount = tasks.length - 2;

  return (
    <div className="space-y-1.5 rounded-xl bg-white/5 p-3 ring-1 ring-white/10">
      <span className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wider text-primary mb-2">
        <span className="relative flex h-2 w-2">
          <span className="relative inline-flex h-2 w-2 rounded-full bg-primary"></span>
        </span>
        Trabajando en {tasks.length} tareas
      </span>

      {visibleTasks.map((task) => {
        const isBlocked = !!task.blockerReason;
        const timeElapsed = getTimeElapsed(task.startedAt || task.updatedAt);

        return (
          <div
            key={task.id}
            className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-[10px] ${
              isBlocked
                ? 'bg-[var(--status-blocked-bg)] border border-[var(--border-blocked)]'
                : 'bg-white/5'
            }`}
          >
            {isBlocked && <AlertTriangle className="h-2.5 w-2.5 flex-shrink-0 text-[var(--status-blocked)]" />}
            <span className={`truncate flex-1 font-medium ${
              isBlocked ? 'text-[var(--status-blocked)]' : 'text-foreground/80'
            }`}>
              {task.title}
            </span>
            <span className="text-muted-foreground/60 flex-shrink-0">
              <Clock className="inline h-2 w-2 mr-0.5" />
              {timeElapsed}
            </span>
          </div>
        );
      })}

      {remainingCount > 0 && (
        <div className="text-center text-[9px] text-muted-foreground/50 pt-1">
          +{remainingCount} más
        </div>
      )}
    </div>
  );
}

/**
 * Calcular tiempo transcurrido legible
 */
function getTimeElapsed(startDate: Date): string {
  const now = new Date();
  const elapsed = now.getTime() - new Date(startDate).getTime();
  const minutes = Math.floor(elapsed / 1000 / 60);

  if (minutes < 1) return 'Ahora';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

