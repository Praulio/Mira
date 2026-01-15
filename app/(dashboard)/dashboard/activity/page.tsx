import { getActivityFeed } from '@/app/actions/activity'
import { ActivityItem } from '@/components/activity-item'
import { Activity } from 'lucide-react'

// Force dynamic rendering since this requires authentication
export const dynamic = 'force-dynamic'

/**
 * Activity Feed Page
 * 
 * Best Practice 1.1: Server Component fetches data server-side (no client-side waterfalls)
 * Best Practice 3.2: Minimal serialization by using presentational components
 */
export default async function ActivityPage() {
  // Fetch activity data server-side
  const activities = await getActivityFeed()

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Activity Feed</h2>
        <p className="text-neutral-600 dark:text-neutral-400">
          Recent changes across all tasks
        </p>
      </div>

      {/* Activity feed */}
      <div className="rounded-lg border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
        {activities.length > 0 ? (
          <div className="divide-y divide-neutral-200 dark:divide-neutral-800">
            {activities.map((activity) => (
              <ActivityItem key={activity.id} activity={activity} />
            ))}
          </div>
        ) : (
          /* Empty state */
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-800">
              <Activity className="h-8 w-8 text-neutral-400" />
            </div>
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
              No activity yet
            </h3>
            <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
              Task activity will appear here as your team works
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
