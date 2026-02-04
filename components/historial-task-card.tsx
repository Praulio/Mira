'use client';

import {
  ChevronDown,
  ChevronRight,
  Clock,
  Link as LinkIcon,
  FileText,
} from 'lucide-react';
import Image from 'next/image';
import type { HistorialTask } from '@/app/actions/tasks';

interface HistorialTaskCardProps {
  task: HistorialTask;
  isExpanded: boolean;
  onToggle: () => void;
}

/**
 * HistorialTaskCard - Expandable card for completed tasks
 *
 * Shows:
 * - Header: title, assignee, completion time, duration
 * - Indicators for notes and links
 * - Expandable content: description, completion notes, links
 */
export function HistorialTaskCard({
  task,
  isExpanded,
  onToggle,
}: HistorialTaskCardProps) {
  // Format time for display
  const formatTime = (date: Date | null) => {
    if (!date) return '--:--';
    return new Date(date).toLocaleTimeString('es-MX', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Calculate duration between startedAt and completedAt
  const getDuration = () => {
    if (!task.startedAt || !task.completedAt) return null;
    const start = new Date(task.startedAt);
    const end = new Date(task.completedAt);
    const diffMs = end.getTime() - start.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    if (diffHours > 0) {
      return `${diffHours}h ${diffMins}m`;
    }
    return `${diffMins}m`;
  };

  const duration = getDuration();

  return (
    <div className="overflow-hidden rounded-xl border border-white/10 bg-white/5 transition-all hover:bg-white/[0.07]">
      {/* Clickable header */}
      <button
        onClick={onToggle}
        className="flex w-full items-center gap-4 p-4 text-left"
      >
        <div className="flex-shrink-0">
          {isExpanded ? (
            <ChevronDown className="h-5 w-5 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{task.title}</p>
          <div className="mt-1 flex items-center gap-3 text-sm text-muted-foreground">
            {task.assigneeName && (
              <div className="flex items-center gap-1.5">
                {task.assigneeImage ? (
                  <Image
                    src={task.assigneeImage}
                    alt={task.assigneeName}
                    width={16}
                    height={16}
                    className="rounded-full"
                  />
                ) : (
                  <div className="h-4 w-4 rounded-full bg-muted" />
                )}
                <span>{task.assigneeName}</span>
              </div>
            )}
            <span>·</span>
            <span>{formatTime(task.completedAt)}</span>
            {duration && (
              <>
                <span>·</span>
                <div className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  <span>{duration}</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Content indicators */}
        <div className="flex items-center gap-2 text-muted-foreground">
          {task.completionNotes && <FileText className="h-4 w-4" />}
          {task.completionLinks && task.completionLinks.length > 0 && (
            <LinkIcon className="h-4 w-4" />
          )}
        </div>
      </button>

      {/* Expandable content */}
      {isExpanded && (
        <div className="space-y-4 border-t border-white/5 bg-white/[0.02] p-4">
          {/* Description */}
          {task.description && (
            <div>
              <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Descripción
              </p>
              <p className="text-sm text-foreground/80">{task.description}</p>
            </div>
          )}

          {/* Completion notes */}
          {task.completionNotes && (
            <div>
              <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Notas de cierre
              </p>
              <p className="whitespace-pre-wrap text-sm text-foreground/80">
                {task.completionNotes}
              </p>
            </div>
          )}

          {/* Links */}
          {task.completionLinks && task.completionLinks.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Enlaces
              </p>
              <div className="space-y-1.5">
                {task.completionLinks.map((link, i) => (
                  <a
                    key={i}
                    href={link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-primary hover:underline"
                  >
                    <LinkIcon className="h-3.5 w-3.5" />
                    <span className="truncate">{link}</span>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* No additional content */}
          {!task.description &&
            !task.completionNotes &&
            (!task.completionLinks || task.completionLinks.length === 0) && (
              <p className="text-sm italic text-muted-foreground">
                No hay información adicional para esta tarea
              </p>
            )}
        </div>
      )}
    </div>
  );
}
