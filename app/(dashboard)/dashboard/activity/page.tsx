// Force dynamic rendering since this requires authentication
export const dynamic = 'force-dynamic'

export default function ActivityPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Activity Feed</h2>
        <p className="text-neutral-600 dark:text-neutral-400">
          Recent changes across all tasks
        </p>
      </div>

      {/* Placeholder for Activity feed (Task 5.1) */}
      <div className="rounded-lg border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
        <div className="divide-y divide-neutral-200 dark:divide-neutral-800">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="flex items-start gap-4 p-4">
              <div className="mt-1 h-8 w-8 rounded-full border-2 border-dashed border-neutral-300 dark:border-neutral-700" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-full max-w-md rounded bg-neutral-200 dark:bg-neutral-800" />
                <div className="h-3 w-32 rounded bg-neutral-100 dark:bg-neutral-900" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
