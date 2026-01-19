import Image from 'next/image'
import {
  CheckCircle2,
  ArrowRightCircle,
  UserPlus,
  Edit3,
  Trash2,
  PartyPopper,
  AtSign
} from 'lucide-react'
import type { ActivityData } from '@/app/actions/activity'

type ActivityItemProps = {
  activity: ActivityData
}

/**
 * Get icon component based on activity action
 * 
 * Best Practice 7.8: Early returns for cleaner code
 */
function getActionIcon(action: ActivityData['action']) {
  switch (action) {
    case 'created':
      return <CheckCircle2 className="h-5 w-5 text-green-500" />
    case 'status_changed':
      return <ArrowRightCircle className="h-5 w-5 text-blue-500" />
    case 'assigned':
      return <UserPlus className="h-5 w-5 text-purple-500" />
    case 'updated':
      return <Edit3 className="h-5 w-5 text-amber-500" />
    case 'deleted':
      return <Trash2 className="h-5 w-5 text-red-500" />
    case 'completed':
      return <PartyPopper className="h-5 w-5 text-yellow-500" />
    case 'mentioned':
      return <AtSign className="h-5 w-5 text-cyan-500" />
  }
}

/**
 * Formatear mensaje de actividad basado en la acción y metadatos
 *
 * Best Practice 7.8: Early returns in switch statement
 */
function getActivityMessage(activity: ActivityData): string {
  const { action, metadata, task } = activity

  switch (action) {
    case 'created':
      return task
        ? `creó la tarea "${task.title}"`
        : 'creó una tarea'

    case 'status_changed': {
      const oldStatus = metadata?.oldStatus as string | undefined
      const newStatus = metadata?.newStatus as string | undefined
      const taskTitle = metadata?.taskTitle as string | undefined

      if (oldStatus && newStatus && taskTitle) {
        return `movió "${taskTitle}" de ${formatStatus(oldStatus)} a ${formatStatus(newStatus)}`
      }
      return task
        ? `cambió el estado de "${task.title}"`
        : 'cambió el estado de una tarea'
    }

    case 'assigned':
      return task
        ? `asignó "${task.title}" a alguien`
        : 'asignó una tarea'

    case 'updated': {
      const taskTitle = metadata?.taskTitle as string | undefined
      const titleUpdated = metadata?.titleUpdated as boolean | undefined
      const descriptionUpdated = metadata?.descriptionUpdated as boolean | undefined

      if (taskTitle) {
        if (titleUpdated && descriptionUpdated) {
          return `actualizó el título y descripción de "${taskTitle}"`
        }
        if (titleUpdated) {
          return `actualizó el título de "${taskTitle}"`
        }
        if (descriptionUpdated) {
          return `actualizó la descripción de "${taskTitle}"`
        }
        return `actualizó "${taskTitle}"`
      }
      return task
        ? `actualizó "${task.title}"`
        : 'actualizó una tarea'
    }

    case 'deleted': {
      const taskTitle = metadata?.title as string | undefined
      return taskTitle
        ? `eliminó la tarea "${taskTitle}"`
        : 'eliminó una tarea'
    }

    case 'completed': {
      return task
        ? `completó la tarea "${task.title}"`
        : 'completó una tarea'
    }

    case 'mentioned': {
      return task
        ? `te mencionó en "${task.title}"`
        : 'te mencionó en una tarea'
    }
  }
}

/**
 * Formatear estado enum a cadena legible
 */
function formatStatus(status: string): string {
  switch (status) {
    case 'backlog':
      return 'Pila de Tareas'
    case 'todo':
      return 'Por Hacer'
    case 'in_progress':
      return 'En Progreso'
    case 'done':
      return 'Completado'
    default:
      return status
  }
}

/**
 * Formatear tiempo relativo (ej. "hace 2 horas")
 *
 * Best Practice 7.8: Early returns for cleaner code
 */
function getRelativeTime(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSecs = Math.floor(diffMs / 1000)
  const diffMins = Math.floor(diffSecs / 60)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffSecs < 60) return 'ahora mismo'
  if (diffMins < 60) return `hace ${diffMins}m`
  if (diffHours < 24) return `hace ${diffHours}h`
  if (diffDays < 7) return `hace ${diffDays}d`

  return date.toLocaleDateString('es-ES')
}

/**
 * Activity Item component - displays a single activity event
 * 
 * Best Practice 3.2: Pure presentational component (minimal serialization)
 * Best Practice 2.1: Uses Next.js Image component for optimization
 */
export function ActivityItem({ activity }: ActivityItemProps) {
  const message = getActivityMessage(activity)
  const relativeTime = getRelativeTime(activity.createdAt)
  const icon = getActionIcon(activity.action)

  return (
    <div className="flex items-start gap-4 p-4">
      {/* Icon badge */}
      <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-800">
        {icon}
      </div>

      {/* Activity content */}
      <div className="flex-1 space-y-1">
        <div className="flex items-center gap-2">
          {/* User avatar */}
          {activity.user.imageUrl ? (
            <Image
              src={activity.user.imageUrl}
              alt={activity.user.name}
              width={20}
              height={20}
              className="rounded-full"
            />
          ) : (
            <div className="h-5 w-5 rounded-full bg-neutral-300 dark:bg-neutral-700" />
          )}
          
          {/* Message */}
          <p className="text-sm">
            <span className="font-medium text-neutral-900 dark:text-neutral-100">
              {activity.user.name}
            </span>
            {' '}
            <span className="text-neutral-600 dark:text-neutral-400">
              {message}
            </span>
          </p>
        </div>
        
        {/* Timestamp */}
        <p className="text-xs text-neutral-500 dark:text-neutral-500">
          {relativeTime}
        </p>
      </div>
    </div>
  )
}
