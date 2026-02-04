# Implementation Plan: Task Enhancements V2

Generado desde: `docs/plans/2026-02-04-feat-task-enhancements-v2-plan.md`
Fecha: 2026-02-04

---

## Fase 0: Schema & Migration

- [ ] **0.1** Agregar campos dueDate y progress al schema de tasks
  - Archivo: `db/schema.ts`
  - Output: Campos `dueDate: timestamp('due_date')` y `progress: integer('progress').default(0)` agregados
  - Referencia: ver campos `completedAt` y `startedAt` en línea 62-66

- [ ] **0.2** Generar y aplicar migración Drizzle
  - Comando: `pnpm db:generate && pnpm db:push`
  - Output: Migración SQL aplicada a la base de datos
  - Verificación: Campos existen en tabla tasks

Validación Fase 0:
• `pnpm build` pasa
• Campos `due_date` y `progress` existen en tabla tasks

---

## Fase 1: Data Layer

- [ ] **1.1** Actualizar tipo KanbanTaskData con dueDate y progress
  - Archivo: `app/actions/kanban.ts`
  - Output: Tipo incluye `dueDate: Date | null` y `progress: number`
  - Referencia: ver tipo actual en líneas 13-32

- [ ] **1.2** Actualizar query getKanbanData para incluir nuevos campos
  - Archivo: `app/actions/kanban.ts`
  - Output: Query retorna dueDate y progress en el select

- [ ] **1.3** Actualizar TeamSlotData para incluir progress
  - Archivo: `app/actions/team.ts`
  - Output: `inProgressTask` incluye campo `progress: number`

Validación Fase 1:
• `pnpm build` pasa
• TypeScript no reporta errores de tipos

---

## Fase 2: Due Date Feature

- [ ] **2.1** Agregar dueDate a createTaskSchema y createTask action
  - Archivo: `app/actions/tasks.ts`
  - Output: Schema acepta `dueDate: z.coerce.date().optional()`, action guarda el campo
  - Referencia: ver `createTaskSchema` líneas 24-28

- [ ] **2.2** Crear action updateTaskDueDate
  - Archivo: `app/actions/tasks.ts`
  - Input: `{ taskId: string, dueDate: Date | null }`
  - Comportamiento: Solo el CREADOR puede editar
  - Referencia: ver patrón de `updateCompletedAt` líneas 854-960

- [ ] **2.3** Agregar date picker en CreateTaskDialog
  - Archivo: `components/create-task-dialog.tsx`
  - Output: Input type="date" después del campo descripción
  - Comportamiento: Fecha mínima = hoy, opcional

- [ ] **2.4** Agregar DueDateBadge en TaskCard footer
  - Archivo: `components/task-card.tsx`
  - Render: Badge con icono calendario + colores (rojo si vencida, amarillo si ≤24h)
  - Referencia: ver footer en líneas 174-223

Validación Fase 2:
• `pnpm build` pasa
• Crear tarea con fecha funciona
• Badge muestra colores correctos

---

## Fase 3: Eliminar Backlog

- [ ] **3.1** Convertir página backlog en redirect
  - Archivo: `app/(dashboard)/dashboard/backlog/page.tsx`
  - Output: `redirect('/dashboard/kanban')` de next/navigation

- [ ] **3.2** Eliminar enlace backlog del sidebar
  - Archivo: `components/sidebar.tsx`
  - Output: Remover item con `href: "/dashboard/backlog"` del array navItems

- [ ] **3.3** Limpiar archivos no usados
  - Archivos: `components/backlog-list.tsx`, `components/backlog-task-card.tsx`
  - Comportamiento: Eliminar si no tienen otros usos

Validación Fase 3:
• `pnpm build` pasa
• `/dashboard/backlog` redirige a `/dashboard/kanban`
• Sidebar no muestra "Pila de Tareas"

---

## Fase 4: Filtro Mis Tareas

- [ ] **4.1** Pasar currentUserId a KanbanBoard
  - Archivo: `app/(dashboard)/dashboard/kanban/page.tsx`
  - Output: `<KanbanBoard initialData={data} currentUserId={userId} />`

- [ ] **4.2** Agregar toggle "Mis Tareas" en KanbanBoard
  - Archivo: `components/kanban-board.tsx`
  - Props: Recibir `currentUserId: string`
  - Render: Botón toggle encima de columnas, alineado derecha
  - Comportamiento: Estado local, filtra por assignee.id === currentUserId

- [ ] **4.3** Agregar mensaje vacío filtrado en KanbanColumn
  - Archivo: `components/kanban-column.tsx`
  - Props: `{ isFiltered?: boolean }`
  - Render: "No tienes tareas en esta etapa" si vacío + filtrado

Validación Fase 4:
• `pnpm build` pasa
• Toggle visible y funcional
• Columnas vacías muestran mensaje correcto

---

## Fase 5: Progress Bar

- [ ] **5.1** Crear action updateTaskProgress
  - Archivo: `app/actions/tasks.ts`
  - Input: `{ taskId: string, progress: number (0-100) }`
  - Comportamiento: Solo assignee O creador (si no hay assignee) puede editar
  - Referencia: ver permisos en `updateCompletedAt`

- [ ] **5.2** Agregar mini progress bar en TaskCard
  - Archivo: `components/task-card.tsx`
  - Render: Barra horizontal (h-1.5) si progress > 0
  - Comportamiento: Solo visual, no editable

- [ ] **5.3** Agregar progress slider en TaskDetailDialog
  - Archivo: `components/task-detail-dialog.tsx`
  - Render: Slider si puede editar, barra read-only si no
  - Comportamiento: Guardar al soltar (onMouseUp/onTouchEnd)

- [ ] **5.4** Agregar progress bar en TeamSlot
  - Archivo: `components/team-slot.tsx`
  - Render: Barra de progreso debajo del título si progress > 0

Validación Fase 5:
• `pnpm build` pasa
• Progress visible en TaskCard, TeamSlot
• Slider funcional solo para asignado/creador

---

## Summary

| Fase | Tareas | Descripción |
|------|--------|-------------|
| 0 | 2 | Schema & Migration |
| 1 | 3 | Data Layer |
| 2 | 4 | Due Date Feature |
| 3 | 3 | Eliminar Backlog |
| 4 | 3 | Filtro Mis Tareas |
| 5 | 4 | Progress Bar |
| **Total** | **19** | |
