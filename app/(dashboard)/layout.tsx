import { ReactNode } from "react"
import { redirect } from "next/navigation"
import { Sidebar } from "@/components/sidebar"
import { UserNav } from "@/components/user-nav"
import { NotificationBell } from "@/components/notification-bell"
import { AreaSwitcher } from "@/components/area-switcher"
import { getAreaContext } from "@/lib/area-context"

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const areaContext = await getAreaContext();

  // Redirect unauthenticated users
  if (!areaContext) {
    redirect('/sign-in');
  }

  // Redirect users without area assignment to pending page
  if (!areaContext.isAssigned) {
    redirect('/pending-assignment');
  }

  const areaLabel = areaContext.currentArea === 'desarrollo' ? 'Desarrollo' : 'Agencia';

  return (
    <div className="relative min-h-screen bg-neutral-50 dark:bg-black">
      <Sidebar isSuperadmin={areaContext.canSwitchArea} />

      {/* Main content area */}
      <div className="pl-64">
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-neutral-200 bg-white px-6 dark:border-neutral-800 dark:bg-neutral-950">
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-semibold">Dashboard</h1>
            {/* Area badge */}
            <span className="rounded-md bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">
              {areaLabel}
            </span>
          </div>

          {/* User menu with area switcher and notifications */}
          <div className="flex items-center gap-4">
            {/* Area switcher only for superadmin */}
            {areaContext.canSwitchArea && (
              <AreaSwitcher currentArea={areaContext.currentArea} />
            )}
            <NotificationBell />
            <UserNav />
          </div>
        </header>

        {/* Page content */}
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
