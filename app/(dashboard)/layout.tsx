import { ReactNode } from "react"
import { Sidebar } from "@/components/sidebar"
import { UserNav } from "@/components/user-nav"

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-screen bg-neutral-50 dark:bg-black">
      <Sidebar />
      
      {/* Main content area */}
      <div className="pl-64">
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-neutral-200 bg-white px-6 dark:border-neutral-800 dark:bg-neutral-950">
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-semibold">Dashboard</h1>
          </div>
          
          {/* User menu */}
          <div className="flex items-center gap-4">
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
