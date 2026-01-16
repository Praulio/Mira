import { User, Clock, Zap } from 'lucide-react';
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
          <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40">Slot {slotNumber}</p>
          <p className="text-xs font-bold text-muted-foreground/60">Available</p>
        </div>
      </div>
    );
  }

  const { user, inProgressTask } = data;

  // Calculate time elapsed
  const timeElapsed = inProgressTask
    ? getTimeElapsed(inProgressTask.updatedAt)
    : null;

  return (
    <div 
      data-testid={`team-slot-${user.id}`}
      data-user-id={user.id}
      data-has-active-task={!!inProgressTask}
      className={`group relative flex h-56 flex-col overflow-hidden rounded-2xl transition-all duration-500 hover:scale-[1.02] hover:shadow-2xl ${
        inProgressTask 
          ? 'backdrop-blur-[80px] saturate-[200%] animate-[pulse-glow_3s_ease-in-out_infinite]' 
          : 'border border-white/10 bg-white/5 backdrop-blur-xl'
      }`}
      style={inProgressTask ? {
        background: 'radial-gradient(circle at 50% 50%, var(--glow-cyan) 0%, transparent 70%), var(--glass-light)',
        border: '1px solid var(--accent-primary)',
        boxShadow: '0 0 40px var(--glow-cyan), 0 8px 32px oklch(0.10 0.02 250 / 0.6), inset 0 1px 0 oklch(0.80 0.15 220 / 0.2)'
      } : undefined}
    >
      {/* Background decoration */}
      {inProgressTask && (
        <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-primary/10 blur-3xl animate-pulse" />
      )}

      {/* User Info Header */}
      <div className="relative z-10 p-5 pb-3 flex items-center gap-4">
        <div className={`relative ${inProgressTask ? 'active-task-ring' : ''}`}>
          <div className={`h-16 w-16 rounded-full p-1 transition-all duration-500 ${
            inProgressTask ? 'bg-gradient-to-tr from-primary to-cyan-400 rotate-12' : 'bg-white/10'
          }`}>
            <img
              src={user.imageUrl || '/placeholder-avatar.png'}
              alt={user.name}
              className={`h-full w-full rounded-full object-cover transition-all duration-500 ${
                inProgressTask ? '-rotate-12 scale-105' : ''
              }`}
            />
          </div>
          {inProgressTask && (
            <div className="absolute -right-1 bottom-0 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg ring-2 ring-background">
              <Zap className="h-3 w-3 fill-current" />
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-base font-black tracking-tight text-foreground">
              {user.name || 'Anonymous'}
            </h3>
          </div>
          <p className="truncate text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
            {user.email}
          </p>
        </div>
      </div>

      {/* Task Status Section */}
      <div className="relative z-10 mt-auto p-5 pt-0">
        {inProgressTask ? (
          <div className="space-y-3 rounded-xl bg-white/5 p-3 ring-1 ring-white/10">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wider text-primary">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75"></span>
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-primary"></span>
                </span>
                Working On
              </span>
              {timeElapsed && (
                <span className="flex items-center gap-1 text-[9px] font-bold text-muted-foreground/60 uppercase">
                  <Clock className="h-2.5 w-2.5" /> {timeElapsed}
                </span>
              )}
            </div>
            
            <p className="line-clamp-2 text-xs font-bold leading-relaxed text-foreground/90 group-hover:text-primary transition-colors">
              {inProgressTask.title}
            </p>
          </div>
        ) : (
          <div className="flex items-center gap-3 rounded-xl border border-dashed border-white/10 p-3 opacity-50">
            <div className="h-2 w-2 rounded-full bg-muted-foreground/40" />
            <p className="text-[10px] font-black uppercase tracking-widest">Idle • No task assigned</p>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Calculate human-readable time elapsed
 */
function getTimeElapsed(startDate: Date): string {
  const now = new Date();
  const elapsed = now.getTime() - new Date(startDate).getTime();
  const minutes = Math.floor(elapsed / 1000 / 60);
  
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

