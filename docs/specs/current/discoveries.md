# Discoveries: Blockers + Multi-Actividad

Log de aprendizajes entre sesiones de Ralph Loop.

---

## Patrones Descubiertos

(Se llena durante la implementación)

---

## Archivos Clave de Referencia

- **Schema BD:** `db/schema.ts:54-79` - Definición de tabla tasks
- **Server Actions:** `app/actions/tasks.ts` - Patrón de transacción + actividad
- **Kanban Types:** `app/actions/kanban.ts:33` - KanbanTaskData
- **Team Types:** `app/actions/team.ts` - TeamSlotData y getTeamViewData
- **TaskCard:** `components/task-card.tsx` - Visualización de tareas
- **TeamSlot:** `components/team-slot.tsx` - Slot de usuario en dashboard
- **CreateTaskDialog:** `components/create-task-dialog.tsx:21-116` - Patrón de adjuntos
- **CompleteTaskModal:** `components/complete-task-modal.tsx` - Modal de completar
- **CSS Variables:** `app/globals.css:76` - Variables de status

---

## Sesiones

### Session 0 - 2026-02-04

**Setup inicial**
- Implementation plan generado con 11 tareas en 9 fases
- Archivos de ejecución creados en `docs/specs/current/`
- Listo para `./ralph-loop.sh`

**Decisiones del usuario:**
- Permisos blocker: Assignee o Creator
- Movimiento tarea bloqueada: Permitido libremente
- Tareas en TeamSlot: Máximo 2, luego "+N más"
- Límite in_progress: Sin límite
