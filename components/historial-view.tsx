'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight, User, Calendar, CalendarDays } from 'lucide-react';
import { cn } from '@/lib/utils';
import { HistorialTaskCard } from './historial-task-card';
import type { HistorialData, HistorialViewMode } from '@/app/actions/tasks';

interface HistorialViewProps {
  initialData: HistorialData;
  initialDate: Date;
  initialUserId?: string;
  initialViewMode?: HistorialViewMode;
}

/**
 * HistorialView - Client component for browsing completed tasks by day or week
 *
 * Features:
 * - Day/Week view toggle
 * - Period navigation with prev/next arrows
 * - User filter dropdown
 * - Expandable task cards (accordion style)
 * - Loading states during navigation
 */
export function HistorialView({
  initialData,
  initialDate,
  initialUserId,
  initialViewMode = 'week',
}: HistorialViewProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);

  // Get week range for display
  const getWeekRange = (date: Date) => {
    const dayOfWeek = date.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

    const monday = new Date(date);
    monday.setDate(date.getDate() + mondayOffset);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    return { monday, sunday };
  };

  // Format date for display
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('es-MX', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // Format week range for display
  const formatWeekRange = (date: Date) => {
    const { monday, sunday } = getWeekRange(date);
    const formatShort = (d: Date) =>
      d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });

    return `${formatShort(monday)} - ${formatShort(sunday)}`;
  };

  // Navigate to previous or next period
  const navigatePeriod = (direction: 'prev' | 'next') => {
    const newDate = new Date(initialDate);
    const offset = initialViewMode === 'week' ? 7 : 1;
    newDate.setDate(newDate.getDate() + (direction === 'next' ? offset : -offset));

    startTransition(() => {
      const params = new URLSearchParams();
      params.set('date', newDate.toISOString().split('T')[0]);
      params.set('view', initialViewMode);
      if (initialUserId) params.set('user', initialUserId);
      router.push(`/dashboard/kanban/historial?${params.toString()}`);
    });
  };

  // Handle view mode change
  const handleViewModeChange = (mode: HistorialViewMode) => {
    startTransition(() => {
      const params = new URLSearchParams();
      params.set('date', initialDate.toISOString().split('T')[0]);
      params.set('view', mode);
      if (initialUserId) params.set('user', initialUserId);
      router.push(`/dashboard/kanban/historial?${params.toString()}`);
    });
  };

  // Handle user filter change
  const handleUserFilter = (userId: string | null) => {
    startTransition(() => {
      const params = new URLSearchParams();
      params.set('date', initialDate.toISOString().split('T')[0]);
      params.set('view', initialViewMode);
      if (userId) params.set('user', userId);
      router.push(`/dashboard/kanban/historial?${params.toString()}`);
    });
  };

  // Check if current period includes today
  const isCurrentPeriod = () => {
    const today = new Date();
    if (initialViewMode === 'week') {
      const { monday, sunday } = getWeekRange(initialDate);
      return today >= monday && today <= sunday;
    }
    return today.toDateString() === initialDate.toDateString();
  };

  const periodLabel = initialViewMode === 'week' ? 'semana' : 'día';

  return (
    <div className="space-y-6">
      {/* View mode toggle + filters */}
      <div className="flex flex-wrap items-center gap-4">
        {/* Day/Week toggle */}
        <div className="flex rounded-lg border border-white/10 bg-white/5 p-1">
          <button
            onClick={() => handleViewModeChange('day')}
            disabled={isPending}
            className={cn(
              'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-all',
              initialViewMode === 'day'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
            )}
          >
            <Calendar className="h-4 w-4" />
            Día
          </button>
          <button
            onClick={() => handleViewModeChange('week')}
            disabled={isPending}
            className={cn(
              'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-all',
              initialViewMode === 'week'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
            )}
          >
            <CalendarDays className="h-4 w-4" />
            Semana
          </button>
        </div>

        {/* User filter */}
        <div className="flex items-center gap-2">
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
      </div>

      {/* Period navigation */}
      <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-4">
        <button
          onClick={() => navigatePeriod('prev')}
          disabled={!initialData.hasOlderTasks || isPending}
          className={cn(
            'flex items-center gap-2 rounded-lg px-4 py-2 transition-colors',
            'hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed'
          )}
        >
          <ChevronLeft className="h-5 w-5" />
          <span className="hidden sm:inline">
            {initialViewMode === 'week' ? 'Semana anterior' : 'Día anterior'}
          </span>
        </button>

        <div className="flex items-center gap-2 text-center">
          {initialViewMode === 'week' ? (
            <CalendarDays className="h-5 w-5 text-muted-foreground" />
          ) : (
            <Calendar className="h-5 w-5 text-muted-foreground" />
          )}
          <span className="text-lg font-semibold capitalize">
            {initialViewMode === 'week'
              ? formatWeekRange(initialDate)
              : formatDate(initialDate)}
          </span>
          {isCurrentPeriod() && (
            <span className="rounded-full bg-primary/20 px-2 py-0.5 text-xs font-medium text-primary">
              {initialViewMode === 'week' ? 'Esta semana' : 'Hoy'}
            </span>
          )}
        </div>

        <button
          onClick={() => navigatePeriod('next')}
          disabled={!initialData.hasNewerTasks || isCurrentPeriod() || isPending}
          className={cn(
            'flex items-center gap-2 rounded-lg px-4 py-2 transition-colors',
            'hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed'
          )}
        >
          <span className="hidden sm:inline">
            {initialViewMode === 'week' ? 'Semana siguiente' : 'Día siguiente'}
          </span>
          <ChevronRight className="h-5 w-5" />
        </button>
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
            No hay tareas completadas esta {periodLabel}
          </p>
          <p className="text-sm text-muted-foreground/60">
            Navega a otra {periodLabel} para ver el historial
          </p>
        </div>
      ) : (
        // Task cards
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {initialData.tasks.length} tarea{initialData.tasks.length !== 1 ? 's' : ''} completada{initialData.tasks.length !== 1 ? 's' : ''}
          </p>
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
