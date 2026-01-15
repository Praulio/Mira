import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { TeamSlot } from "@/components/team-slot"
import { getTeamViewData } from "@/app/actions/team"
import { TeamViewAutoRefresh } from "@/components/team-view-auto-refresh"

// Force dynamic rendering since this requires authentication
export const dynamic = 'force-dynamic'

/**
 * Dashboard Page - Team View
 * 
 * Displays the 8-slot team grid showing each user's current in-progress task.
 * Auto-refreshes every 30 seconds to show real-time updates.
 * 
 * Following React Best Practices:
 * - Server Component for data fetching (no client-side waterfall)
 * - Auth check before data fetch (Best Practice: 1.1 - defer await)
 * - Minimal data serialization across RSC boundary
 * - Client Component for polling via router.refresh() (Best Practice: 4.2)
 */
export default async function DashboardPage() {
  const { userId } = await auth()

  if (!userId) {
    redirect("/sign-in")
  }

  // Fetch team data (users + their in-progress tasks)
  const teamSlots = await getTeamViewData()

  // Ensure we always render 8 slots (fill empty ones if needed)
  const slotsToRender = Array.from({ length: 8 }, (_, i) => {
    return teamSlots[i] || null
  })

  return (
    <div className="space-y-6">
      {/* Auto-refresh component (client-side polling every 30s) */}
      <TeamViewAutoRefresh />

      <div>
        <h2 className="text-2xl font-bold tracking-tight">Team View</h2>
        <p className="text-neutral-600 dark:text-neutral-400">
          See what everyone on your team is working on right now
        </p>
      </div>

      {/* 8-slot team grid: 1 column on mobile, 2 on tablet, 4 on desktop (2x4 grid) */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {slotsToRender.map((slotData, index) => (
          <TeamSlot
            key={slotData?.user.id || `empty-${index}`}
            data={slotData}
            slotNumber={index + 1}
          />
        ))}
      </div>
    </div>
  )
}
