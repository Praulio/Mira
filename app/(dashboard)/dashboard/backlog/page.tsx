import { redirect } from 'next/navigation'

/**
 * Backlog Page - DEPRECATED
 *
 * Esta página ha sido deprecada. Redirige automáticamente a Kanban.
 * La funcionalidad de backlog ahora está integrada en el tablero Kanban.
 */
export default function BacklogPage() {
  redirect('/dashboard/kanban')
}
