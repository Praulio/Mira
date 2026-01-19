"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutGrid, Columns3, ListTodo, Activity, Eye } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

const navItems = [
  {
    title: "Vista de Equipo",
    href: "/dashboard",
    icon: LayoutGrid,
    description: "Ve en qué trabaja el equipo",
  },
  {
    title: "Tablero Kanban",
    href: "/dashboard/kanban",
    icon: Columns3,
    description: "Arrastra y suelta tareas",
  },
  {
    title: "Pila de Tareas",
    href: "/dashboard/backlog",
    icon: ListTodo,
    description: "Prioriza trabajo pendiente",
  },
  {
    title: "Actividad",
    href: "/dashboard/activity",
    icon: Activity,
    description: "Cambios recientes",
  },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r border-white/5 bg-sidebar/40 backdrop-blur-xl">
      <div className="flex h-full flex-col gap-2">
        {/* Header */}
        <div className="flex h-16 items-center border-b border-white/5 px-6">
          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/60 shadow-lg shadow-primary/20">
              <Eye className="h-5 w-5 text-primary-foreground" strokeWidth={2.5} />
            </div>
            <span className="text-xl font-bold tracking-tight text-foreground">Mira</span>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1.5 px-4 py-6">
          {navItems.map((item) => {
            const isActive = pathname === item.href
            const Icon = item.icon

            return (
              <Link key={item.href} href={item.href}>
                <Button
                  variant="ghost"
                  className={cn(
                    "w-full justify-start gap-4 px-4 py-7 text-sm font-medium transition-all duration-300 rounded-xl",
                    isActive
                      ? "bg-primary/10 text-primary border border-primary/20 shadow-[0_0_20px_rgba(var(--primary),0.1)]"
                      : "text-muted-foreground hover:bg-white/5 hover:text-foreground border border-transparent"
                  )}
                >
                  <Icon className={cn("h-5 w-5", isActive ? "text-primary" : "text-muted-foreground")} />
                  <div className="flex flex-col items-start gap-0.5">
                    <span className={cn(isActive ? "font-bold" : "font-semibold")}>{item.title}</span>
                    <span className="text-[10px] font-medium uppercase tracking-wider opacity-60">
                      {item.description}
                    </span>
                  </div>
                </Button>
              </Link>
            )
          })}
        </nav>

        {/* Footer */}
        <div className="border-t border-white/5 px-6 py-5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40">
            Mira Tasker v1.0.0
          </p>
        </div>
      </div>
    </aside>
  )
}
