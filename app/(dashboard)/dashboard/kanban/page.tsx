// Force dynamic rendering since this requires authentication
export const dynamic = 'force-dynamic'

export default function KanbanPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Kanban Board</h2>
        <p className="text-neutral-600 dark:text-neutral-400">
          Drag and drop tasks between columns
        </p>
      </div>

      {/* Placeholder for Kanban board (Task 4.1) */}
      <div className="grid grid-cols-4 gap-4">
        {["Backlog", "To Do", "In Progress", "Done"].map((status) => (
          <div
            key={status}
            className="rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900"
          >
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-neutral-600 dark:text-neutral-400">
              {status}
            </h3>
            <div className="space-y-2">
              <div className="h-24 rounded border-2 border-dashed border-neutral-300 bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
