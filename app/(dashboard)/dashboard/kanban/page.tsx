import { getKanbanData } from '@/app/actions/kanban';
import { KanbanColumn } from '@/components/kanban-column';

// Force dynamic rendering since this requires authentication
export const dynamic = 'force-dynamic';

/**
 * Kanban Board Page - Displays tasks organized in 4 columns by status
 * 
 * Following React Best Practices:
 * - Server Component for data fetching (no client-side waterfalls)
 * - Single query fetches all tasks with related data
 * - Pure presentational child components
 */
export default async function KanbanPage() {
  // Fetch kanban data server-side
  const kanbanData = await getKanbanData();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Kanban Board</h2>
        <p className="text-neutral-600 dark:text-neutral-400">
          Organize and track your tasks across four stages
        </p>
      </div>

      {/* Kanban Board - 4 columns */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KanbanColumn
          title="Backlog"
          tasks={kanbanData.backlog}
          statusColor="neutral"
        />
        <KanbanColumn
          title="To Do"
          tasks={kanbanData.todo}
          statusColor="blue"
        />
        <KanbanColumn
          title="In Progress"
          tasks={kanbanData.in_progress}
          statusColor="amber"
        />
        <KanbanColumn
          title="Done"
          tasks={kanbanData.done}
          statusColor="green"
        />
      </div>
    </div>
  );
}
