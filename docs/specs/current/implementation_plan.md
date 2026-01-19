# Implementation Plan: Backlog Funcional + Cierre de Ciclo

Generado desde: `docs/specs/backlog-cierre-ciclo/spec.md`
Fecha: 2026-01-19

---

## Fase 0: Activation & Setup

- [x] **0.1** Instalar canvas-confetti y crear lib/confetti.ts
  - Output: `lib/confetti.ts` exporta `fireConfetti()` y `playCelebrationSound()`
  - Comportamiento: Confetti desde ambos lados, respeta prefers-reduced-motion
  - Referencia: `pnpm add canvas-confetti @types/canvas-confetti`

Validación Fase 0:
• `pnpm build` pasa
• Import de `fireConfetti` no da error

---

## Fase 1: Database Schema

- [x] **1.1** Agregar campos de completion a tabla tasks en schema.ts
  - Output: Campos `isCritical`, `completedAt`, `completionNotes`, `completionLinks`, `completionMentions`
  - Comportamiento: boolean para crítico, timestamp para fecha, text/jsonb para datos
  - Referencia: ver `db/schema.ts` líneas 40-53, agregar `boolean` al import

- [x] **1.2** Agregar 'completed' y 'mentioned' a activityActionEnum
  - Output: Enum con 7 valores totales
  - Referencia: ver `db/schema.ts` líneas 16-22

- [x] **1.3** Generar y aplicar migración
  - Output: Migration aplicada con `pnpm drizzle-kit generate && pnpm drizzle-kit push`

Validación Fase 1:
• `pnpm build` pasa
• Schema tiene nuevos campos

---

## Fase 2: Server Actions

- [x] **2.1** Action toggleTaskCritical en tasks.ts
  - Input: `{ taskId: string }`
  - Output: `ActionResponse` con task actualizada o error si ya tiene crítica
  - Comportamiento: Toggle isCritical, valida máximo 1 por usuario
  - Referencia: ver patrón de `updateTaskStatus` en `app/actions/tasks.ts`

- [x] **2.2** Action completeTask en tasks.ts
  - Input: `{ taskId, notes?, links?, mentions? }`
  - Output: Task con status='done', datos de completion guardados
  - Comportamiento: Crea activity 'completed' + 'mentioned' por cada mención
  - Referencia: ver patrón con transaction en `app/actions/tasks.ts`

- [x] **2.3** Agregar filtro a getActivityFeed en activity.ts
  - Input: `filter?: 'all' | 'completed' | 'mentions'`
  - Output: Activities filtradas según tipo
  - Comportamiento: 'completed' → action='completed', 'mentions' → userId en mentions
  - Referencia: ver `app/actions/activity.ts`, agregar import `and` y `getAuth`

Validación Fase 2:
• `pnpm build` pasa
• Actions exportan correctamente

---

## Fase 3: Complete Task Modal

- [x] **3.1** Componente MentionInput
  - Props: `{ value, onChange, placeholder }`
  - Render: Textarea que detecta "@" y muestra dropdown de usuarios
  - Comportamiento: Inserta `@[name](userId)` al seleccionar, extrae mentions
  - Referencia: usar `getTeamUsers` de `app/actions/users.ts`

- [x] **3.2** Componente LinkInput
  - Props: `{ links[], onChange, maxLinks? }`
  - Render: Input URL + botón + lista de links con X
  - Comportamiento: Valida URL, auto-agrega https://, máximo 10 links
  - Referencia: ver styling de `components/ui/input.tsx`

- [x] **3.3** Componente CompleteTaskModal
  - Props: `{ task, isOpen, onClose, onComplete }`
  - Render: Dialog con MentionInput + LinkInput + botones Cancelar/Completar
  - Comportamiento: Llama completeTask, dispara confetti, confirma si hay contenido
  - Referencia: ver `components/task-detail-dialog.tsx` para patrón Dialog

Validación Fase 3:
• `pnpm build` pasa
• Modal se importa sin errores

---

## Fase 4: Backlog Page

- [x] **4.1** Componente BacklogTaskCard
  - Props: `{ task }` con isCritical
  - Render: Card con borde rojo si crítico, badge "CRÍTICO", grip handle, menú
  - Comportamiento: Click abre detail, star toggle crítico, trash elimina
  - Referencia: ver `components/task-card.tsx` para diseño base

- [x] **4.2** Componente BacklogList con DndContext
  - Props: `{ initialTasks[] }`
  - Render: Lista sortable de BacklogTaskCard, empty state si vacía
  - Comportamiento: Drag reordena visualmente (no persiste), usa verticalListSortingStrategy
  - Referencia: ver `components/kanban-board.tsx` para DndContext

- [x] **4.3** Actualizar backlog/page.tsx
  - Output: Server component que fetch tasks status='backlog' ordenadas críticas primero
  - Render: Header con contador + BacklogList
  - Referencia: ver `app/(dashboard)/dashboard/activity/page.tsx`

Validación Fase 4:
• Backlog muestra tareas reales
• Toggle crítico funciona (máx 1 por usuario)
• Drag reordena visualmente

---

## Fase 5: Kanban Integration

- [ ] **5.1** Agregar estado y modal en KanbanBoard
  - Output: Estado `showCompleteModal` y `pendingCompleteTask`
  - Comportamiento: En handleDragEnd, si newStatus='done' → abre modal en vez de update directo
  - Referencia: ver `components/kanban-board.tsx` línea handleDragEnd

- [ ] **5.2** Handlers para modal en KanbanBoard
  - Output: `handleCompleteModalClose` revierte si cancela, `handleCompleteSuccess` cierra y refresh
  - Comportamiento: Renderizar CompleteTaskModal después de DndContext
  - Referencia: importar `CompleteTaskModal` de `./complete-task-modal`

Validación Fase 5:
• Drop a Done abre modal
• Confetti al completar
• Cancelar revierte posición

---

## Fase 6: Activity Filters

- [ ] **6.1** Componente ActivityFilters
  - Render: Tabs "Todos | Completados | Mis Menciones"
  - Comportamiento: Cambia URL param ?filter=completed|mentions
  - Referencia: usar `useSearchParams` y `useRouter`

- [ ] **6.2** Actualizar activity/page.tsx para usar filtros
  - Input: searchParams.filter
  - Output: ActivityFilters en header + getActivityFeed con filtro
  - Comportamiento: Empty states específicos por filtro
  - Referencia: ver tipo `ActivityFilter` de activity.ts

- [ ] **6.3** Actualizar ActivityItem para mostrar completion data
  - Output: Casos 'completed' y 'mentioned' en getActionIcon y getActivityMessage
  - Render: Notas en blockquote, links como chips clickeables
  - Referencia: agregar imports PartyPopper, AtSign, Link de lucide-react

Validación Fase 6:
• Filtros funcionan
• Completados muestran notas/links
• Empty states correctos

---

## Fase 7: Complete Button in Detail

- [ ] **7.1** Agregar botón Completar en TaskDetailDialog
  - Output: Botón con PartyPopper en header (si status !== 'done')
  - Comportamiento: Click abre CompleteTaskModal, al completar cierra ambos dialogs
  - Referencia: importar CompleteTaskModal, agregar estado showCompleteModal

Validación Fase 7:
• Botón visible en detalle
• Abre modal de completar
• Flow completo funciona

---

## Summary

| Fase | Tareas | Descripción |
|------|--------|-------------|
| 0 | 1 | Activation (confetti) |
| 1 | 3 | Database Schema |
| 2 | 3 | Server Actions |
| 3 | 3 | Complete Modal Components |
| 4 | 3 | Backlog Page |
| 5 | 2 | Kanban Integration |
| 6 | 3 | Activity Filters |
| 7 | 1 | Complete Button |
| **Total** | **19** | |
