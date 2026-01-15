"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutGrid, Columns3, ListTodo, Activity } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

const navItems = [
  {
    title: "Team View",
    href: "/dashboard",
    icon: LayoutGrid,
    description: "See what everyone is working on",
  },
  {
    title: "Kanban",
    href: "/dashboard/kanban",
    icon: Columns3,
    description: "Drag and drop tasks",
  },
  {
    title: "Backlog",
    href: "/dashboard/backlog",
    icon: ListTodo,
    description: "Prioritize upcoming work",
  },
  {
    title: "Activity",
    href: "/dashboard/activity",
    icon: Activity,
    description: "Recent changes",
  },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950">
      <div className="flex h-full flex-col gap-2">
        {/* Header */}
        <div className="flex h-16 items-center border-b border-neutral-200 px-6 dark:border-neutral-800">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-neutral-900 dark:bg-neutral-100">
              <span className="text-sm font-bold text-white dark:text-neutral-900">M</span>
            </div>
            <span className="text-lg font-semibold">Mira</span>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 px-3 py-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href
            const Icon = item.icon

            return (
              <Link key={item.href} href={item.href}>
                <Button
                  variant="ghost"
                  className={cn(
                    "w-full justify-start gap-3 px-3 py-6 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-neutral-100 text-neutral-900 dark:bg-neutral-800 dark:text-neutral-50"
                      : "text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-900 dark:hover:text-neutral-50"
                  )}
                >
                  <Icon className="h-5 w-5" />
                  <div className="flex flex-col items-start">
                    <span>{item.title}</span>
                    <span className="text-xs font-normal text-neutral-500 dark:text-neutral-500">
                      {item.description}
                    </span>
                  </div>
                </Button>
              </Link>
            )
          })}
        </nav>

        {/* Footer */}
        <div className="border-t border-neutral-200 px-3 py-3 dark:border-neutral-800">
          <p className="text-xs text-neutral-500">
            Mira Tasker v1.0.0
          </p>
        </div>
      </div>
    </aside>
  )
}
