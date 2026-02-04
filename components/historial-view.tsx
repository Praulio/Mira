'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight, User, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import { HistorialTaskCard } from './historial-task-card';
import type { HistorialData } from '@/app/actions/tasks';

interface HistorialViewProps {
  initialData: HistorialData;
  initialDate: Date;
  initialUserId?: string;
}

/**
 * HistorialView - Client component for browsing completed tasks by day
 *
 * Features:
 * - Day navigation with prev/next arrows
 * - User filter dropdown
 * - Expandable task cards (accordion style)
 * - Loading states during navigation
 */
export function HistorialView({
  initialData,
  initialDate,
  initialUserId,
}: HistorialViewProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);

  // Format date for display
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('es-MX', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // Navigate to previous or next day
  const navigateDay = (direction: 'prev' | 'next') => {
    const newDate = new Date(initialDate);
    newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1));

    startTransition(() => {
      const params = new URLSearchParams();
      params.set('date', newDate.toISOString().split('T')[0]);
      if (initialUserId) params.set('user', initialUserId);
      router.push(`/dashboard/kanban/historial?${params.toString()}`);
    });
  };

  // Handle user filter change
  const handleUserFilter = (userId: string | null) => {
    startTransition(() => {
      const params = new URLSearchParams();
      params.set('date', initialDate.toISOString().split('T')[0]);
      if (userId) params.set('user', userId);
      router.push(`/dashboard/kanban/historial?${params.toString()}`);
    });
  };

  // Check if current date is today
  const isToday = new Date().toDateString() === initialDate.toDateString();

  return (
    <div className="space-y-6">
      {/* Date navigation */}
      <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-4">
        <button
          onClick={() => navigateDay('prev')}
          disabled={!initialData.hasOlderTasks || isPending}
          className={cn(
            'flex items-center gap-2 rounded-lg px-4 py-2 transition-colors',
            'hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed'
          )}
        >
          <ChevronLeft className="h-5 w-5" />
          <span className="hidden sm:inline">Día anterior</span>
        </button>

        <div className="flex items-center gap-2 text-center">
          <Calendar className="h-5 w-5 text-muted-foreground" />
          <span className="text-lg font-semibold capitalize">
            {formatDate(initialDate)}
          </span>
          {isToday && (
            <span className="rounded-full bg-primary/20 px-2 py-0.5 text-xs font-medium text-primary">
              Hoy
            </span>
          )}
        </div>

        <button
          onClick={() => navigateDay('next')}
          disabled={!initialData.hasNewerTasks || isToday || isPending}
          className={cn(
            'flex items-center gap-2 rounded-lg px-4 py-2 transition-colors',
            'hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed'
          )}
        >
          <span className="hidden sm:inline">Día siguiente</span>
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {/* User filter */}
      <div className="flex items-center gap-3">
        <User className="h-4 w-4 text-muted-foreground" />
        <select
          value={initialUserId || ''}
          onChange={(e) => handleUserFilter(e.target.value || null)}
          disabled={isPending}
          className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50"
        >
          <option value="">Todos los usuarios</option>
          {initialData.users.map((user) => (
            <option key={user.id} value={user.id}>
              {user.name}
            </option>
          ))}
        </select>
      </div>

      {/* Task list */}
      {isPending ? (
        // Loading skeleton
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-20 animate-pulse rounded-xl bg-white/5"
            />
          ))}
        </div>
      ) : initialData.tasks.length === 0 ? (
        // Empty state
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Calendar className="h-16 w-16 text-muted-foreground/30 mb-4" />
          <p className="text-lg font-medium text-muted-foreground">
            No hay tareas completadas este día
          </p>
          <p className="text-sm text-muted-foreground/60">
            Navega a otro día para ver el historial
          </p>
        </div>
      ) : (
        // Task cards
        <div className="space-y-3">
          {initialData.tasks.map((task) => (
            <HistorialTaskCard
              key={task.id}
              task={task}
              isExpanded={expandedTaskId === task.id}
              onToggle={() =>
                setExpandedTaskId(expandedTaskId === task.id ? null : task.id)
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
