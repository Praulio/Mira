import { getActivityFeed, type ActivityFilter } from '@/app/actions/activity'
import { ActivityItem } from '@/components/activity-item'
import { ActivityFilters } from '@/components/activity-filters'
import { Activity, PartyPopper, AtSign } from 'lucide-react'
import { getAuth } from '@/lib/mock-auth'

// Force dynamic rendering since this requires authentication
export const dynamic = 'force-dynamic'

type PageProps = {
  searchParams: Promise<{ filter?: string }>
}

/**
 * Activity Feed Page
 *
 * Best Practice 1.1: Server Component fetches data server-side (no client-side waterfalls)
 * Best Practice 3.2: Minimal serialization by using presentational components
 */
export default async function ActivityPage({ searchParams }: PageProps) {
  const params = await searchParams
  // Validate filter param, default to 'all'
  const validFilters: ActivityFilter[] = ['all', 'completed', 'mentions']
  const filter: ActivityFilter = validFilters.includes(params.filter as ActivityFilter)
    ? (params.filter as ActivityFilter)
    : 'all'

  // Fetch activity data server-side with filter
  const activities = await getActivityFeed(filter)

  // Get current user for contextual mention messages
  const { userId: currentUserId } = await getAuth()

  // Get empty state content based on current filter
  const getEmptyState = () => {
    switch (filter) {
      case 'completed':
        return {
          icon: PartyPopper,
          title: 'No hay tareas completadas todavía',
          description: 'Cuando el equipo complete tareas, aparecerán aquí con sus notas y links',
        }
      case 'mentions':
        return {
          icon: AtSign,
          title: 'No tienes menciones todavía',
          description: 'Cuando alguien te mencione en una tarea, aparecerá aquí',
        }
      default:
        return {
          icon: Activity,
          title: 'Aún no hay actividad',
          description: 'La actividad de tareas aparecerá aquí cuando el equipo trabaje',
        }
    }
  }

  const emptyState = getEmptyState()
  const EmptyIcon = emptyState.icon

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Feed de Actividad</h2>
          <p className="text-neutral-600 dark:text-neutral-400">
            Cambios recientes en todas las tareas
          </p>
        </div>
        <ActivityFilters />
      </div>

      {/* Activity feed */}
      <div className="rounded-lg border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
        {activities.length > 0 ? (
          <div className="divide-y divide-neutral-200 dark:divide-neutral-800">
            {activities.map((activity) => (
              <ActivityItem key={activity.id} activity={activity} currentUserId={currentUserId} />
            ))}
          </div>
        ) : (
          /* Empty state - contextual based on filter */
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-800">
              <EmptyIcon className="h-8 w-8 text-neutral-400" />
            </div>
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
              {emptyState.title}
            </h3>
            <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
              {emptyState.description}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
