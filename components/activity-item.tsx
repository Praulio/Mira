import Image from 'next/image'
import { 
  CheckCircle2, 
  ArrowRightCircle, 
  UserPlus, 
  Edit3, 
  Trash2 
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
  }
}

/**
 * Format activity message based on action and metadata
 * 
 * Best Practice 7.8: Early returns in switch statement
 */
function getActivityMessage(activity: ActivityData): string {
  const { action, metadata, task } = activity

  switch (action) {
    case 'created':
      return task 
        ? `created task "${task.title}"`
        : 'created a task'
    
    case 'status_changed': {
      const oldStatus = metadata?.oldStatus as string | undefined
      const newStatus = metadata?.newStatus as string | undefined
      const taskTitle = metadata?.taskTitle as string | undefined
      
      if (oldStatus && newStatus && taskTitle) {
        return `moved "${taskTitle}" from ${formatStatus(oldStatus)} to ${formatStatus(newStatus)}`
      }
      return task 
        ? `changed status of "${task.title}"`
        : 'changed task status'
    }
    
    case 'assigned':
      return task
        ? `assigned "${task.title}" to someone`
        : 'assigned a task'
    
    case 'updated': {
      const taskTitle = metadata?.taskTitle as string | undefined
      const titleUpdated = metadata?.titleUpdated as boolean | undefined
      const descriptionUpdated = metadata?.descriptionUpdated as boolean | undefined
      
      if (taskTitle) {
        if (titleUpdated && descriptionUpdated) {
          return `updated title and description of "${taskTitle}"`
        }
        if (titleUpdated) {
          return `updated title of "${taskTitle}"`
        }
        if (descriptionUpdated) {
          return `updated description of "${taskTitle}"`
        }
        return `updated "${taskTitle}"`
      }
      return task
        ? `updated "${task.title}"`
        : 'updated a task'
    }
    
    case 'deleted': {
      const taskTitle = metadata?.title as string | undefined
      return taskTitle
        ? `deleted task "${taskTitle}"`
        : 'deleted a task'
    }
  }
}

/**
 * Format status enum to human-readable string
 */
function formatStatus(status: string): string {
  switch (status) {
    case 'backlog':
      return 'Backlog'
    case 'todo':
      return 'To Do'
    case 'in_progress':
      return 'In Progress'
    case 'done':
      return 'Done'
    default:
      return status
  }
}

/**
 * Format relative time (e.g., "2 hours ago")
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

  if (diffSecs < 60) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  
  return date.toLocaleDateString()
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
