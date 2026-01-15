import { getKanbanData } from '@/app/actions/kanban';
import { KanbanBoard } from '@/components/kanban-board';
import { CreateTaskDialog } from '@/components/create-task-dialog';

// Force dynamic rendering since this requires authentication
export const dynamic = 'force-dynamic';

/**
 * Kanban Board Page - Displays tasks organized in 4 columns by status with drag and drop
 * 
 * Following React Best Practices:
 * - Server Component for data fetching (no client-side waterfalls - Best Practice 1.1)
 * - Single query fetches all tasks with related data
 * - Delegates drag and drop logic to client component (KanbanBoard)
 * 
 * Architecture:
 * - Server Component fetches data once on page load
 * - KanbanBoard client component wraps columns with DndContext
 * - Updates are handled by server actions with revalidation
 */
export default async function KanbanPage() {
  // Fetch kanban data server-side (no client-side waterfalls)
  const kanbanData = await getKanbanData();

  return (
    <div className="space-y-6">
      {/* Header with Create Task button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Kanban Board</h2>
          <p className="text-neutral-600 dark:text-neutral-400">
            Organize and track your tasks across four stages - Drag to move tasks
          </p>
        </div>
        <CreateTaskDialog />
      </div>

      {/* Kanban Board with Drag and Drop */}
      <KanbanBoard initialData={kanbanData} />
    </div>
  );
}
