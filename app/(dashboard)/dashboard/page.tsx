import { getAuth } from "@/lib/mock-auth"
import { redirect } from "next/navigation"
import { TeamSlot } from "@/components/team-slot"
import { getTeamViewData } from "@/app/actions/team"
import { syncCurrentUser } from "@/app/actions/users"
import { TeamViewAutoRefresh } from "@/components/team-view-auto-refresh"
import { Users } from "lucide-react"

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

      {/* Adaptive team grid */}
      {teamSlots.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Users className="h-16 w-16 text-muted-foreground/30 mb-4" />
          <p className="text-lg font-medium text-muted-foreground">No hay miembros en este equipo</p>
          <p className="text-sm text-muted-foreground/60">Los miembros aparecerán aquí cuando se asignen al área</p>
        </div>
      ) : (
        <div
          className="dashboard-grid grid gap-6"
          style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}
        >
          {teamSlots.map((slotData, index) => (
            <div key={slotData.user.id} style={{ '--item-index': index } as React.CSSProperties}>
              <TeamSlot data={slotData} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
