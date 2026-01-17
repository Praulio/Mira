import { getAuth } from "@/lib/mock-auth"
import { redirect } from "next/navigation"
import { TeamSlot } from "@/components/team-slot"
import { getTeamViewData } from "@/app/actions/team"
import { syncCurrentUser } from "@/app/actions/users"
import { TeamViewAutoRefresh } from "@/components/team-view-auto-refresh"

// Force dynamic rendering since this requires authentication
export const dynamic = 'force-dynamic'

/**
 * Dashboard Page - Team View
 */
export default async function DashboardPage() {
  const { userId } = await getAuth()

  if (!userId) {
    redirect("/sign-in")
  }

  // Sync current user to ensure name and image are real
  await syncCurrentUser()

  // Fetch team data (users + their in-progress tasks)
  const teamSlots = await getTeamViewData()

  // Ensure we always render 8 slots (fill empty ones if needed)
  const slotsToRender = Array.from({ length: 8 }, (_, i) => {
    return teamSlots[i] || null
  })

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Auto-refresh component (client-side polling every 30s) */}
      <TeamViewAutoRefresh />

      <div className="flex flex-col gap-1">
        <h2 className="dashboard-title">
          Pulso del Equipo
        </h2>
        <p className="text-sm font-bold uppercase tracking-[0.2em] text-muted-foreground/60">
          Disponibilidad y enfoque en tiempo real
        </p>
      </div>

      {/* 8-slot team grid */}
      <div className="dashboard-grid grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
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
