import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"

// Force dynamic rendering since this requires authentication
export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const { userId } = await auth()

  if (!userId) {
    redirect("/sign-in")
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Team View</h2>
        <p className="text-neutral-600 dark:text-neutral-400">
          See what everyone on your team is working on right now
        </p>
      </div>

      {/* Placeholder for the 8-slot grid (Task 3.2) */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="flex h-48 items-center justify-center rounded-lg border-2 border-dashed border-neutral-300 bg-white dark:border-neutral-700 dark:bg-neutral-900"
          >
            <div className="text-center text-sm text-neutral-500">
              <p className="font-medium">Slot {i + 1}</p>
              <p className="text-xs">Empty</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
