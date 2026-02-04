# Implementation Plan: Blockers + Multi-Actividad

Generado desde: `docs/plans/2026-02-04-feat-blockers-multi-activity-plan.md`
Fecha: 2026-02-04

---

## Fase 0: Activation & Smoke Test

- [x] **0.1** Agregar campo `blockerReason` al schema de tasks
  - Output: Campo `blocker_reason text` en tabla tasks
  - Comportamiento: Ejecutar `npx drizzle-kit generate && npx drizzle-kit push`
  - Referencia: ver `db/schema.ts:69` (campo progress)

Validación Fase 0:
• `pnpm build` pasa
• Campo visible en BD (verificar con SQL)

---

## Fase 1: Backend - Multi-Actividad

- [x] **1.1** Eliminar restricción Single In-Progress en updateTaskStatus
  - Input: Archivo `app/actions/tasks.ts`
  - Output: Bloque líneas 286-303 eliminado
  - Comportamiento: Usuarios pueden tener múltiples tareas in_progress
  - Referencia: ver `app/actions/tasks.ts:286-303`

Validación Fase 1:
• Build pasa
• Mover 2 tareas a "En Progreso" → ambas permanecen

---

## Fase 2: Backend - Acciones de Blocker

- [x] **2.1** Agregar action addBlocker
  - Input: `{ taskId, reason }` validado con Zod
  - Output: Tarea actualizada con blockerReason
  - Comportamiento: Solo assignee/creator puede agregar, registra actividad
  - Referencia: ver `app/actions/tasks.ts` (patrón de updateTaskMetadata)

- [x] **2.2** Agregar action removeBlocker
  - Input: `{ taskId }` validado con Zod
  - Output: Tarea con blockerReason = null
  - Comportamiento: Solo assignee/creator puede quitar, registra actividad
  - Referencia: ver `app/actions/tasks.ts` (patrón de updateTaskMetadata)

Validación Fase 2:
• Build pasa
• Llamar addBlocker → tarea tiene blockerReason
• Llamar removeBlocker → blockerReason es null

---

## Fase 3: Tipos y Queries

- [x] **3.1** Agregar blockerReason a KanbanTaskData
  - Input: Archivo `app/actions/kanban.ts`
  - Output: Tipo incluye `blockerReason: string | null`, query lo selecciona
  - Comportamiento: Kanban recibe datos de blocker
  - Referencia: ver `app/actions/kanban.ts:33` (tipo KanbanTaskData)

- [x] **3.2** Cambiar TeamSlotData de singular a array
  - Input: Archivo `app/actions/team.ts`
  - Output: `inProgressTasks` array con blockerReason incluido
  - Comportamiento: Quitar `.limit(1)`, ordenar por startedAt DESC
  - Referencia: ver `app/actions/team.ts` (getTeamViewData)

Validación Fase 3:
• Build pasa
• TypeScript no tiene errores

---

## Fase 4: UI - Variables CSS

- [x] **4.1** Agregar variables CSS para blocker
  - Input: Archivo `app/globals.css`
  - Output: 4 variables: --status-blocked, --status-blocked-bg, --glow-blocked, --border-blocked
  - Comportamiento: Colores naranja (oklch 0.60 0.25 30)
  - Referencia: ver `app/globals.css:76` (variables existentes de status)

Validación Fase 4:
• Build pasa

---

## Fase 5: UI - TaskCard con Blocker

- [ ] **5.1** Agregar visualización de blocker en TaskCard
  - Props: task.blockerReason (ya viene de KanbanTaskData)
  - Render: Badge "Bloqueada" naranja + razón del bloqueo (2 líneas max)
  - Comportamiento: Si blockerReason existe → mostrar badge + razón + borde naranja
  - Referencia: ver `components/task-card.tsx`

Validación Fase 5:
• Build pasa
• Tarea con blocker muestra badge naranja en Kanban

---

## Fase 6: UI - TaskDetailDialog con Blocker

- [ ] **6.1** Agregar sección Blocker en TaskDetailDialog
  - Props: task.blockerReason, addBlocker, removeBlocker actions
  - Render: Input para razón + botón agregar, o vista de blocker + botón X
  - Comportamiento: Agregar blocker → llama addBlocker, quitar → llama removeBlocker
  - Referencia: ver `components/task-detail-dialog.tsx`

Validación Fase 6:
• Build pasa
• Abrir tarea → agregar blocker → badge aparece
• Quitar blocker → badge desaparece

---

## Fase 7: UI - TeamSlot Multi-Actividad

- [ ] **7.1** Actualizar TeamSlot para array de tareas
  - Props: data.inProgressTasks (array)
  - Render: Badge cantidad, lista compacta (max 2), indicador blocker por tarea
  - Comportamiento: 0 tareas=inactivo, 1=vista normal, 2+=lista con "+N más"
  - Referencia: ver `components/team-slot.tsx`

Validación Fase 7:
• Build pasa
• Dashboard muestra múltiples tareas por usuario
• Badge con cantidad visible

---

## Fase 8: UI - CompleteTaskModal con Adjuntos

- [ ] **8.1** Agregar PendingFilePicker a CompleteTaskModal
  - Props: pendingFiles, uploadProgress states
  - Render: Sección adjuntos con PendingFilePicker, botón con progreso
  - Comportamiento: Después de completeTask, subir archivos a /api/attachments/upload
  - Referencia: ver `components/create-task-dialog.tsx:21-116` (patrón de adjuntos)

Validación Fase 8:
• Build pasa
• Completar tarea con adjunto → archivo aparece en attachments

---

## Summary

| Fase | Tareas | Descripción |
|------|--------|-------------|
| 0 | 1 | Migración BD |
| 1 | 1 | Multi-actividad backend |
| 2 | 2 | Acciones blocker |
| 3 | 2 | Tipos y queries |
| 4 | 1 | Variables CSS |
| 5 | 1 | TaskCard blocker |
| 6 | 1 | TaskDetailDialog blocker |
| 7 | 1 | TeamSlot multi-actividad |
| 8 | 1 | CompleteTaskModal adjuntos |
| **Total** | **11** | |
