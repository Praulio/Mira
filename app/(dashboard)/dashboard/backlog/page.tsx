import { getBacklogTasks } from '@/app/actions/kanban'
import { BacklogList } from '@/components/backlog-list'
import { Inbox } from 'lucide-react'

// Force dynamic rendering since this requires authentication
export const dynamic = 'force-dynamic'

/**
 * Backlog Page
 *
 * Server component that fetches tasks with status='backlog' ordered by:
 * - Critical tasks first (isCritical DESC)
 * - Then by creation date (oldest first - FIFO)
 *
 * Best Practice 1.1: Server Component fetches data server-side
 */
export default async function BacklogPage() {
  const tasks = await getBacklogTasks()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Pila de Tareas</h2>
          <p className="text-neutral-600 dark:text-neutral-400">
            Prioriza el trabajo pendiente
          </p>
        </div>

        {/* Task counter */}
        <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-sm font-medium backdrop-blur-lg">
          <Inbox className="h-4 w-4 text-muted-foreground" />
          <span>{tasks.length} {tasks.length === 1 ? 'tarea' : 'tareas'}</span>
        </div>
      </div>

      {/* Backlog list */}
      <BacklogList initialTasks={tasks} />
    </div>
  )
}
